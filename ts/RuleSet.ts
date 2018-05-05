import { Tracery } from "./Tracery";
import { Grammar } from "./Grammar";

import { range, fyShuffle } from "./Util";
// Sets of rules
// Can also contain conditional or fall-back sets of ruleSets)

export type RawRule = string;
export type RawRuleSet = RawRule | Array<RawRule> | object;

export enum Distribution {
	/**
	 * Shuffles the set of options and returns them in sequence
	 */
	Shuffle = "shuffle",
	/**
	 * Picks an option at random based on individual weights
	 */
	Weighted = "weighted",
	/**
	 * TODO: Figure out what this is supposed to do
	 */
	Falloff = "falloff",

	/**
	 * Picks an option at random
	 */
	Random = "random"
};

/**
 * A collection of possible expansions for a symbol
 */
export class RuleSet {
	//TODO: Better type
	private conditionalRule: any = false;
	private conditionalValues: { [propName: string]: RuleSet } = {};
	private defaultRules: Array<RawRule> = [];
	private falloff = 1;
	private shuffledDeck: Array<number> = [];

	private ranking: any;
	private distribution: Distribution | null = null;
	private defaultUses: Array<number> | null = null;

	constructor(private tracery: Tracery, private grammar: Grammar, private raw: RawRuleSet) {

		if (Array.isArray(raw)) {
			this.defaultRules = raw;
		} else if (typeof (raw) === 'string') {
			this.defaultRules = [raw];
		} else {
			// TODO: support for conditional and hierarchical rule sets
			throw "Object typed rule sets are not supported";
		}

	};

	selectRule(errors: ErrorLog = []): RawRule | null {
		// console.log("Get rule", this.raw);
		// Is there a conditional?

		//TODO: No tests for conditionalRule (or not possible to use)
		if (this.conditionalRule) {
			const value = this.grammar.expand(this.conditionalRule, true);
			// does this value match any of the conditionals?
			if (this.conditionalValues[value.toString()]) {
				const v = this.conditionalValues[value.toString()].selectRule(errors);
				if (v !== null && v !== undefined)
					return v;
			}
			// No returned value?
		}

		// Is there a ranked order?
		//TODO: No tests for ranking (or not possible to use)
		if (this.ranking) {
			for (let i = 0; i < this.ranking.length; i++) {
				const v = this.ranking.selectRule();
				if (v !== null && v !== undefined)
					return v;
			}

			// Still no returned value?
		}

		if (this.defaultRules !== undefined) {
			let index = 0;
			// Select from this basic array of rules

			// Get the distribution from the grammar if there is no other
			const distribution = this.distribution || this.grammar.distribution;

			switch (distribution) {
				case Distribution.Shuffle:

					// create a shuffle desk
					if (this.shuffledDeck.length === 0) {
						// make an array
						this.shuffledDeck = fyShuffle(
							range(this.defaultRules.length),
							/*this.falloff,*/
							this.tracery.random
						);
					}

					index = <number>this.shuffledDeck.pop();

					break;

				case Distribution.Weighted:
					errors.push("Weighted distribution not yet implemented");
					break;

				case Distribution.Falloff:
					errors.push("Falloff distribution not yet implemented");
					break;

				case Distribution.Random:
				default:

					index = Math.floor(Math.pow(this.tracery.random(), this.falloff) * this.defaultRules.length);
					break;
			}

			//Counts how many time each rule has been used
			if (this.defaultUses === null)
				this.defaultUses = [];
			this.defaultUses[index] = ++this.defaultUses[index] || 1;

			return this.defaultRules[index];
		}

		errors.push("No default rules defined for " + this);
		return null;

	};

	clearState() {

		if (this.defaultUses) {
			this.defaultUses = [];
		}
	};
}