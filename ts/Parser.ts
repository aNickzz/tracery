import { Section, SectionType } from "./Section";

export interface ParseResult { sections: Array<Section>, errors: ErrorLog };
export interface ParseTagResult {
	symbol: string,
	preActions: Array<Section>,
	postActions: Array<Section>,
	modifiers: Array<string>
}

export class Parser {
	
	// Parse the contents of a tag
	//TODO: Don't know what a tag is yet
	public static parseTag(tagContents: RawRule) : ParseTagResult | null {

		const preActions: Array<Section> = [];
		//TODO: postActions is always empty
		const postActions: Array<Section> = [];
		const modifiers: Array<string> = [];

		const parseResult = Parser.parse(tagContents);
		const sections = parseResult.sections;
		let symbolSection : string | null= null;

		for (var i = 0; i < sections.length; i++) {
			if (sections[i].type === SectionType.Plaintext) {
				if (symbolSection === null) {
					symbolSection = sections[i].raw;
				} else {
					throw ("multiple main sections in " + tagContents);
				}
			} else {
				preActions.push(sections[i]);
			}
		}

		if (symbolSection === null) {
			console.log ("no main section in " + tagContents);
			return null;
		} else {
			const components = symbolSection.split(".");
			return {
				symbol: components[0],
				preActions: preActions,
				postActions: postActions,
				modifiers: components.slice(1)
			};
		}
	}


	// Parses a plaintext rule in the tracery syntax

	//Example rule: "Hello #person# how are you"
	public static parse(rule: RawRule): ParseResult {
		let depth = 0;
		let inTag = false;
		let sections: Array<Section> = [];
		let escaped = false;

		let errors: ErrorLog = [];
		let start = 0;

		let escapedSubstring = "";
		let lastEscapedChar: number | null = null;

		function createSection(start: number, end: number, type: SectionType) {
			if (end - start < 1) {
				if (type === SectionType.Tag)
					errors.push(start + ": empty tag");
				if (type === SectionType.Action)
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
								createSection(start, i, SectionType.Plaintext);
							start = i + 1;
						}
						depth++;
						break;

					case ']':
						depth--;

						// End a bracketed section
						if (depth === 0 && !inTag) {
							createSection(start, i, SectionType.Action);
							start = i + 1;
						}
						break;

					// Hashtag
					//   ignore if not at depth 0, that means we are in a bracket
					case '#':
						if (depth === 0) {
							if (inTag) {
								createSection(start, i, SectionType.Tag);
								start = i + 1;
							} else {
								if (start < i)
									createSection(start, i, SectionType.Plaintext);
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
			createSection(start, rule.length, SectionType.Plaintext);

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
			if (section.type === SectionType.Plaintext && section.raw.length === 0)
				return false;
			return true;
		});

		return {
			sections: sections,
			errors: errors
		};
	}
}