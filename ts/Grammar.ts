import { Distribution, RawRule } from "./RuleSet";
import { TraceryNode } from "./TraceryNode";
import { Symbol, SymbolDefinition } from "./Symbol";
import { Tracery } from "./Tracery";
import { NodeAction } from "./NodeAction";
import { Collection } from "./Util";
import { Modifier } from "./Modifier";
/**
 * The raw JSON text that is loaded by Tracery to define the grammar
 */
export interface RawGrammar {
	[propName: string]: SymbolDefinition;
}




export class Grammar {
	private raw: RawGrammar;
	private symbols: Collection<Symbol>;
	private errors: ErrorLog;

	private subGrammars: Array<Grammar> = [];

	//TODO: Create getter/setters
	public distribution: Distribution | null = null;
	public modifiers: Collection<Modifier>;

	constructor(private tracery: Tracery, raw: RawGrammar) {
		this.raw = {};
		this.modifiers = {};
		this.symbols = {};
		this.errors = [];

		this.loadFromRawObj(raw);
	}

	clearState() {
		for (const name in this.symbols) {
			this.symbols[name].clearState();
		}
	}

	addModifiers(mods: Collection<Modifier>) {
		for (var key in mods) {
			this.modifiers[key] = mods[key];
		};
	}

	loadFromRawObj(raw: RawGrammar) {

		this.raw = raw;
		this.symbols = {};
		this.subGrammars = [];

		if (this.raw) {
			// Add all rules to the grammar
			for (var key in this.raw) {
				if (this.raw.hasOwnProperty(key)) {
					this.symbols[key] = new Symbol(this.tracery, this, key, this.raw[key]);
				}
			}
		}
	}

	createRoot(rule: RawRule) {
		// Create a node and subNodes
		var root = new TraceryNode(this.tracery, this, 0, {
			type: -1,
			raw: rule,
		});

		return root;
	}

	expand(rule: RawRule, allowEscapeChars: boolean = false) {
		var root = this.createRoot(rule);
		root.expand();
		if (!allowEscapeChars)
			root.clearEscapeChars();

		return root;
	}

	flatten(rule: RawRule, allowEscapeChars: boolean): string {
		var root = this.expand(rule, allowEscapeChars);

		return root.finishedText;
	}

	toJSON() {
		var keys = Object.keys(this.symbols);
		var symbolJSON = [];
		for (var i = 0; i < keys.length; i++) {
			var key = keys[i];
			symbolJSON.push(' "' + key + '" : ' + this.symbols[key].rulesToJSON());
		}
		return "{\n" + symbolJSON.join(",\n") + "\n}";
	}

	// Create or push rules
	pushRules(key: string, rawRules: SymbolDefinition, sourceAction: NodeAction) {

		if (this.symbols[key] === undefined) {
			this.symbols[key] = new Symbol(this.tracery, this, key, rawRules);
			if (sourceAction)
				this.symbols[key].isDynamic = true;
		} else {
			this.symbols[key].pushRules(rawRules);
		}
	}

	popRules(key: string) {
		if (!this.symbols[key])
			this.errors.push("Can't pop: no symbol for key " + key);
		this.symbols[key].popRules();
	}

	selectRule(key: string, node: TraceryNode, errors: ErrorLog): RawRule | null {
		if (this.symbols[key]) {
			var rule = this.symbols[key].selectRule(node, errors);

			return rule;
		}

		// Fail-over to alternative subGrammars
		for (var i = 0; i < this.subGrammars.length; i++) {

			if (this.subGrammars[i].symbols[key])
				return this.subGrammars[i].symbols[key].selectRule();
		}

		// No symbol?
		errors.push("No symbol for '" + key + "'");
		return "((" + key + "))";
	}
}