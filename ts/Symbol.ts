
import { Tracery } from "./Tracery";
import { Grammar } from "./Grammar";
import { RuleSet, RawRuleSet, Rule } from "./RuleSet";
import { TraceryNode } from "./TraceryNode";


export class Symbol {
	private baseRules: RuleSet;
	private stack: Array<RuleSet> = [];
	public isDynamic: boolean = false;

	//TODO: Make better type
	private uses: Array<{ node?: TraceryNode }> = [];
	constructor(private tracery: Tracery, private grammar: Grammar, private key: string, private rawRules: RawRuleSet) {

		this.baseRules = new RuleSet(tracery, grammar, rawRules);
		this.clearState();
	}

	clearState() {

		// Clear the stack and clear all ruleset usages
		this.stack = [this.baseRules];

		this.uses = [];
		this.baseRules.clearState();
	}

	pushRules(rawRules: RawRuleSet) {
		var rules = new RuleSet(this.tracery, this.grammar, rawRules);
		this.stack.push(rules);
	}

	popRules() {
		this.stack.pop();
	}

	selectRule(node?: TraceryNode, errors: Array<string> = []):Rule | null {
		this.uses.push({
			node: node
		});

		if (this.stack.length === 0) {
			errors.push("The rule stack for '" + this.key + "' is empty, too many pops?");
			return "((" + this.key + "))";
		}

		return this.stack[this.stack.length - 1].selectRule();
	}

	getActiveRules() {
		if (this.stack.length === 0) {
			return null;
		}
		return this.stack[this.stack.length - 1].selectRule();
	};

	rulesToJSON() {
		return JSON.stringify(this.rawRules);
	}
}