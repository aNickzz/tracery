import { TraceryNode } from "./TraceryNode";
import { Grammar } from "./Grammar";
import { Symbol } from "./Symbol";
import { RuleSet } from "./RuleSet";
import { NodeAction } from "./NodeAction";
import { Section, SectionType } from "./Section";
import { Parser } from "./Parser";

export class Tracery {
	private rng: () => number;


	static TraceryNode = TraceryNode;
	static Grammar = Grammar;
	static Symbol = Symbol;
	static RuleSet = RuleSet;


	constructor() {
		this.rng = Math.random;
	}

	/**
	 * Sets the internal random number generator
	 */
	setRng(rng: () => number) {
		this.rng = rng;
	}

	random() {
		return this.rng();
	}
	createGrammar(raw: GrammarJSON) {
		return new Grammar(this, raw);
	}
}