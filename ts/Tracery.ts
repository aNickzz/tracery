import { TraceryNode } from "./TraceryNode";
import { Grammar, RawGrammar } from "./Grammar";
import { Symbol } from "./Symbol";
import { RuleSet, Rule } from "./RuleSet";
import { NodeAction } from "./NodeAction";

export enum Type {
	/** Needs parsing */
	Raw = -1,
	/** Plaintext */
	Main = 0,
	/** Tag ("#symbol.mod.mod2.mod3#" or "#[pushTarget:pushRule]symbol.mod") */
	OpenSquare = 1,
	/** Action ("[pushTarget:pushRule], [pushTarget:POP]", more in the future) */
	CloseSquare = 2
}
export interface Section { type: Type, raw: Rule }
export interface ParseResult { sections: Array<Section>, errors: Array<string> };
export interface ParseTagResult {
	symbol: string,
	preactions: Array<Section>,
	postactions: Array<Section>,
	modifiers: Array<string>
}

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

	/**
	 * Shuffles an array using the internal randomiser
	 */
	fyshuffle(array: Array<any>): Array<any> {
		let currentIndex = array.length;
		let temporaryValue: any;
		let randomIndex: number;

		// While there remain elements to shuffle...
		while (0 !== currentIndex) {

			// Pick a remaining element...
			randomIndex = Math.floor(this.random() * currentIndex);
			currentIndex -= 1;

			// And swap it with the current element.
			temporaryValue = array[currentIndex];
			array[currentIndex] = array[randomIndex];
			array[randomIndex] = temporaryValue;
		}

		return array;
	}

	// Parse the contents of a tag
	//TODO: Don't know what a tag is yet
	parseTag(tagContents: Rule) : ParseTagResult | null {

		const preactions: Array<Section> = [];
		//TODO: postactions is always empty
		const postactions: Array<Section> = [];
		const modifiers: Array<string> = [];

		const parseResult = this.parse(tagContents);
		const sections = parseResult.sections;
		let symbolSection : string | null= null;

		for (var i = 0; i < sections.length; i++) {
			if (sections[i].type === Type.Main) {
				if (symbolSection === null) {
					symbolSection = sections[i].raw;
				} else {
					throw ("multiple main sections in " + tagContents);
				}
			} else {
				preactions.push(sections[i]);
			}
		}

		if (symbolSection === null) {
			console.log ("no main section in " + tagContents);
			return null;
		} else {
			const components = symbolSection.split(".");
			return {
				symbol: components[0],
				preactions: preactions,
				postactions: postactions,
				modifiers: components.slice(1)
			};
		}
	}


	// Parses a plaintext rule in the tracery syntax

	//Example rule: "Hello #person# how are you"
	parse(rule: Rule): ParseResult {
		let depth = 0;
		let inTag = false;
		let sections: Array<Section> = [];
		let escaped = false;

		let errors: Array<string> = [];
		let start = 0;

		let escapedSubstring = "";
		let lastEscapedChar: number | null = null;

		function createSection(start: number, end: number, type: Type) {
			if (end - start < 1) {
				if (type === Type.OpenSquare)
					errors.push(start + ": empty tag");
				if (type === Type.CloseSquare)
					errors.push(start + ": empty action");

			}
			let rawSubstring: string;
			if (lastEscapedChar !== null) {
				rawSubstring = escapedSubstring + "\\" + rule.substring(lastEscapedChar + 1, end);

			} else {
				rawSubstring = rule.substring(start, end);
			}
			sections.push({
				type: type,
				raw: rawSubstring
			});
			lastEscapedChar = null;
			escapedSubstring = "";
		};

		for (let i = 0; i < rule.length; i++) {

			if (!escaped) {
				var c = rule.charAt(i);

				switch (c) {

					// Enter a deeper bracketed section
					case '[':
						if (depth === 0 && !inTag) {
							if (start < i)
								createSection(start, i, Type.Main);
							start = i + 1;
						}
						depth++;
						break;

					case ']':
						depth--;

						// End a bracketed section
						if (depth === 0 && !inTag) {
							createSection(start, i, Type.CloseSquare);
							start = i + 1;
						}
						break;

					// Hashtag
					//   ignore if not at depth 0, that means we are in a bracket
					case '#':
						if (depth === 0) {
							if (inTag) {
								createSection(start, i, Type.OpenSquare);
								start = i + 1;
							} else {
								if (start < i)
									createSection(start, i, Type.Main);
								start = i + 1;
							}
							inTag = !inTag;
						}
						break;

					case '\\':
						escaped = true;
						escapedSubstring = escapedSubstring + rule.substring(start, i);
						start = i + 1;
						lastEscapedChar = i;
						break;
				}
			} else {
				escaped = false;
			}
		}
		if (start < rule.length)
			createSection(start, rule.length, Type.Main);

		if (inTag) {
			errors.push("Unclosed tag");
		}
		if (depth > 0) {
			errors.push("Too many [");
		}
		if (depth < 0) {
			errors.push("Too many ]");
		}

		// Strip out empty plaintext sections

		sections = sections.filter(function (section) {
			if (section.type === Type.Main && section.raw.length === 0)
				return false;
			return true;
		});

		return {
			sections: sections,
			errors: errors
		};
	}
}
