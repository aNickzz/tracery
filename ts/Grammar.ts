import { Distribution, Rule } from "./RuleSet";
import { TraceryNode } from "./TraceryNode";
import { Symbol } from "./Symbol";
import { Tracery } from "./Tracery";
import { NodeAction } from "./NodeAction";
/**
 * The raw JSON text that is loaded by Tracery to define the grammar
 */
export interface RawGrammar {
	[propName: string]: SymbolDefinition;
}

export type SymbolDefinition = string | Array<string>;

/**
 * A function that mutates string expansions. E.g. the "a" modifier seen after the dot in "#noun.a#" prepends the string returned by the "name" symbol with "a" or "an" depending on the first character.
 * 
 * Modifiers come in @see ModifierCollection objects
 */
export type Modifier = (text: string, params?: Array<string>) => string;
export interface ModifierCollection { [propName: string]: Modifier }
export interface SymbolCollection { [propName: string]: Symbol }

export class Grammar {
	private raw: RawGrammar;
	private symbols: SymbolCollection;
	private errors: Array<string>;

	private subgrammars: Array<Grammar> = [];

	//TODO: Create getter/setters
	public distribution: Distribution | null = null;
	public modifiers: ModifierCollection;

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

	addModifiers(mods: ModifierCollection) {
		for (var key in mods) {
			this.modifiers[key] = mods[key];
		};
	}

	loadFromRawObj(raw: RawGrammar) {

		this.raw = raw;
		this.symbols = {};
		this.subgrammars = [];

		if (this.raw) {
			// Add all rules to the grammar
			for (var key in this.raw) {
				if (this.raw.hasOwnProperty(key)) {
					this.symbols[key] = new Symbol(this.tracery, this, key, this.raw[key]);
				}
			}
		}
	}

	createRoot(rule: Rule) {
		// Create a node and subnodes
		var root = new TraceryNode(this.tracery, this, 0, {
			type: -1,
			raw: rule,
		});

		return root;
	}

	expand(rule: Rule, allowEscapeChars: boolean) {
		var root = this.createRoot(rule);
		root.expand();
		if (!allowEscapeChars)
			root.clearEscapeChars();

		return root;
	}

	flatten(rule: Rule, allowEscapeChars: boolean): string {
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

	selectRule(key: string, node: TraceryNode, errors: Array<string>): Rule | null {
		if (this.symbols[key]) {
			var rule = this.symbols[key].selectRule(node, errors);

			return rule;
		}

		// Failover to alternative subgrammars
		for (var i = 0; i < this.subgrammars.length; i++) {

			if (this.subgrammars[i].symbols[key])
				return this.subgrammars[i].symbols[key].selectRule();
		}

		// No symbol?
		errors.push("No symbol for '" + key + "'");
		return "((" + key + "))";
	}
}