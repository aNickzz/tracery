import { TraceryNode } from "./TraceryNode";
import { Grammar, RawGrammar } from "./Grammar";
import { Symbol } from "./Symbol";
import { RuleSet, RawRule } from "./RuleSet";
import { NodeAction } from "./NodeAction";
import { Section, SectionType } from "./Section";
import { Parser } from "./Parser";


export type Tag = string;

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
	createGrammar(raw: RawGrammar) {
		return new Grammar(this, raw);
	}
}
