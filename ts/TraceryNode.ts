import { RawRuleSet, Rule } from "./RuleSet";
import { Grammar } from "./Grammar";
import { Type, Tracery, Section } from "./Tracery";
import { Symbol } from "./Symbol";
import { NodeAction } from "./NodeAction";

export class TraceryNode {
	private errors: Array<string> = [];
	private expansionErrors: Array<string> = [];
	private depth: number;

	private raw: Rule;

	private type: any;

	private isExpanded: boolean;
	private childRule: Rule | undefined;

	private preactions: Array<NodeAction> | undefined;
	private postactions: Array<NodeAction> | undefined;

	private symbol: string | undefined;
	private modifiers: Array<string> | undefined;

	private action: NodeAction | undefined;

	public finishedText: string = "";
	public grammar: Grammar;
	public parent: TraceryNode | null;
	public children: Array<TraceryNode> = [];

	constructor(private tracery: Tracery, parent: TraceryNode | Grammar, public childIndex: number, settings: Section) {

		// No input? Add an error, but continue anyways
		if (settings.raw === undefined) {
			this.errors.push("Empty input for node");
			settings.raw = "";
		}

		// If the root node of an expansion, it will have the grammar passed as the 'parent'
		//  set the grammar from the 'parent', and set all other values for a root node
		if (parent instanceof Grammar) {
			this.grammar = parent;
			this.parent = null;
			this.depth = 0;
			this.childIndex = 0;
		} else {
			this.grammar = parent.grammar;
			this.parent = parent;
			this.depth = parent.depth + 1;
			this.childIndex = childIndex;
		}

		this.raw = settings.raw;
		this.type = settings.type;
		this.isExpanded = false;

		if (this.grammar === null) {
			console.warn("No grammar specified for this node", this);
		}

	};

	toString() {
		return "Node('" + this.raw + "' " + this.type + " d:" + this.depth + ")";
	};

	// Expand the node (with the given child rule)
	//  Make children if the node has any
	expandChildren(childRule: Rule, preventRecursion: boolean) {
		this.children = [];
		this.finishedText = "";

		// Set the rule for making children,
		// and expand it into section
		this.childRule = childRule;
		let parseResult = this.tracery.parse(childRule);

		// Add errors to this
		if (parseResult.errors.length > 0) {
			this.errors = this.errors.concat(parseResult.errors);
		}

		let sections = parseResult.sections;

		for (var i = 0; i < sections.length; i++) {
			this.children[i] = new TraceryNode(this.tracery, this, i, sections[i]);
			if (!preventRecursion)
				this.children[i].expand(preventRecursion);

			// Add in the finished text
			this.finishedText += this.children[i].finishedText;
		}
	};

	// Expand this rule (possibly creating children)
	expand(preventRecursion: boolean = false) {

		if (!this.isExpanded) {
			this.isExpanded = true;

			this.expansionErrors = [];

			// Types of nodes
			// -1: raw, needs parsing
			//  0: Plaintext
			//  1: Tag ("#symbol.mod.mod2.mod3#" or "#[pushTarget:pushRule]symbol.mod")
			//  2: Action ("[pushTarget:pushRule], [pushTarget:POP]", more in the future)

			switch (this.type) {
				// Raw rule
				case Type.Raw:

					this.expandChildren(this.raw, preventRecursion);
					break;

				// plaintext, do nothing but copy text into finsihed text
				case Type.Main:
					this.finishedText = this.raw;
					break;

				// Tag
				case Type.OpenSquare:
					// Parse to find any actions, and figure out what the symbol is
					this.preactions = [];
					this.postactions = [];

					let parsed = this.tracery.parseTag(this.raw);

					// Break into symbol actions and modifiers
					this.symbol = parsed.symbol;
					this.modifiers = parsed.modifiers;

					// Create all the preactions from the raw syntax
					for (let i = 0; i < parsed.preactions.length; i++) {
						this.preactions[i] = new NodeAction(this.tracery, this, parsed.preactions[i].raw);
					}
					for (let i = 0; i < parsed.postactions.length; i++) {
						//   this.postactions[i] = new NodeAction(this, parsed.postactions[i].raw);
					}

					// Make undo actions for all preactions (pops for each push)
					for (let i = 0; i < this.preactions.length; i++) {
						if (this.preactions[i].type === 0) {
							let undoAction = this.preactions[i].createUndo();
							if (undoAction !== null)
								this.postactions.push(undoAction);
						}
					}

					// Activate all the preactions
					for (let i = 0; i < this.preactions.length; i++) {
						this.preactions[i].activate();
					}

					this.finishedText = this.raw;

					// Expand (passing the node, this allows tracking of recursion depth)

					let selectedRule = this.grammar.selectRule(this.symbol, this, this.errors);

					if (selectedRule !== null)
						//TODO: Check its ok to skip this call
						this.expandChildren(selectedRule, preventRecursion);

					// Apply modifiers
					// TODO: Update parse function to not trigger on hashtags within parenthesis within tags,
					//   so that modifier parameters can contain tags "#story.replace(#protagonist#, #newCharacter#)#"
					for (let i = 0; i < this.modifiers.length; i++) {
						let modName = this.modifiers[i];
						let modParams: Array<string> = [];
						if (modName.indexOf("(") > 0) {
							let regExp = /\(([^)]+)\)/;

							// Todo: ignore any escaped commas.  For now, commas always split
							var results = regExp.exec(this.modifiers[i]);
							if (!results || results.length < 2) {
							} else {
								modParams = results[1].split(",");
								modName = this.modifiers[i].substring(0, modName.indexOf("("));
							}

						}

						var mod = this.grammar.modifiers[modName];

						// Missing modifier?
						if (!mod) {
							this.errors.push("Missing modifier " + modName);
							this.finishedText += "((." + modName + "))";
						} else {
							this.finishedText = mod(this.finishedText, modParams);

						}

					}

					// Perform post-actions
					for (var i = 0; i < this.postactions.length; i++) {
						this.postactions[i].activate();
					}
					break;
				case Type.CloseSquare:

					// Just a bare action?  Expand it!
					this.action = new NodeAction(this.tracery, this, this.raw);
					this.action.activate();

					// No visible text for an action
					// TODO: some visible text for if there is a failure to perform the action?
					this.finishedText = "";
					break;

			}

		} else {
			//console.warn("Already expanded " + this);
		}

	};

	clearEscapeChars() {

		this.finishedText = this.finishedText.replace(/\\\\/g, "DOUBLEBACKSLASH").replace(/\\/g, "").replace(/DOUBLEBACKSLASH/g, "\\");
	};
}