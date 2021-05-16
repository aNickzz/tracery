/* eslint-disable @typescript-eslint/ban-types */
import DefaultModifiersEn from './modifiers/defaultEn';
import selectRandom from './util/selectRandom';

export type Modifier = (string: string, ...args: string[]) => string;

export default class Tracery<T extends Grammar = Grammar> {
	private readonly _rules: {
		[ruleName: string]: Rule;
	};

	private readonly _varStack: {
		[varName: string]: string;
	}[];

	public readonly modifiers: {
		[modifierName: string]: Modifier;
	};

	public randomiser: () => number = Math.random;

	constructor(grammar: T) {
		this._rules = {};
		this._varStack = [];
		this.modifiers = {};

		for (const ruleName in grammar) {
			if (grammar.hasOwnProperty(ruleName)) {
				this._rules[ruleName] = new Rule(
					this,
					ruleName,
					grammar[ruleName]
				);
			}
		}
	}

	static generate<T extends Grammar>(
		grammar: T,
		entry: keyof T & string
	): string {
		const tracery = new Tracery<T>(grammar);

		tracery.addModifiers(DefaultModifiersEn);
		return tracery.generate(entry);
	}

	static escape(str: string) {
		return str.replace(/([#\[])/g, (match) => `\\${match}`);
	}

	generate(entry: keyof T & string): string {
		return this.evaluate(`#${entry}#`);
	}

	evaluate(expression: string): string {
		return new Rule(this, null, expression).evaluate([]);
	}

	addModifiers(modifiers: { [name: string]: (str: string) => string }): void {
		for (const name in modifiers) {
			if (modifiers.hasOwnProperty(name)) {
				const modifier = modifiers[name];
				this.modifiers[name] = modifier;
			}
		}
	}

	getModifier(name: string): Modifier {
		return this.modifiers[name];
	}

	setVar(name: string, val: string): void {
		this._varStack[0][name] = val;
	}
	getVar(name: string): string | null {
		for (const vars of this._varStack) {
			if (typeof vars[name] === 'string') {
				return vars[name];
			}
		}
		return null;
	}

	pushVars(): void {
		this._varStack.unshift({});
	}
	popVars(): void {
		this._varStack.shift();
	}

	getRule(name: string): Rule {
		return this._rules[name] || null;
	}

	modify(string: string, modifiers: string[]): string {
		return modifiers.reduce(
			(string: string, modifier: string) =>
				this.getModifier(modifier)(string),
			string
		);
	}
}

// eslint-disable-next-line @typescript-eslint/ban-types
type CompiledDefinition = (() => string) | object;
class Rule {
	private readonly _compiledDefinition: CompiledDefinition;

	public constructor(
		private readonly _tracery: Tracery<Grammar>,
		public readonly name: string | null,
		definition: RuleDefinition
	) {
		this._compiledDefinition = this.compileDefinition(definition);
	}

	private compileDefinition(definition: RuleDefinition): CompiledDefinition {
		switch (typeof definition) {
			case 'string':
				const compiledString = this.parse(definition);
				return () => compiledString.map((part) => part()).join('');
			case 'number':
				const compiledNumber = definition.toString();
				return () => compiledNumber;
			case 'function':
				return () => {
					const functionResult = this.compileDefinition(
						definition(this._tracery)
					);

					if (functionResult instanceof Function) {
						return functionResult();
					} else {
						return functionResult;
					}
				};
			case 'object':
				if (definition instanceof Array) {
					const compiledArrayDefinitions = definition.map(
						(subDefinition) => this.compileDefinition(subDefinition)
					);

					return () => {
						const randomSubDefinition = selectRandom(
							compiledArrayDefinitions,
							null,
							this._tracery.randomiser
						);

						if (randomSubDefinition instanceof Function) {
							return randomSubDefinition();
						} else {
							return randomSubDefinition;
						}
					};
				} else {
					return definition;
				}
			default:
				throw new Error('unrecognized rule definition');
		}
	}

	private parse(string: string): (() => string)[] {
		let head = 0;
		const length = string.length;

		const tokenRegex: {
			tokenName: 'reference' | 'assignment' | 'plainText';
			regexp: RegExp;
		}[] = [
			{
				tokenName: 'reference',
				regexp: /^\#(?<text>.*?)(?<ending>\#|$)/, // Any text between a # and another unescaped #, or # and end of string
			},
			{
				tokenName: 'assignment',
				regexp: /^\[(?<variable>.*?)(:)(?<expression>[^]*?)((?<!\\)\]|$)/, // Any text between [ and a :, and between the : and an unescaped ], or between the : and end of string
			},
			{
				tokenName: 'plainText',
				regexp: /^([^]*?)((?<!\\)(\#|\[)|$)/, // Any text up to an unescaped # or [
			},
		];

		const getToken = (
			str: string
		):
			| ['reference' | 'assignment' | 'plainText', RegExpMatchArray]
			| null => {
			for (const tokenStuff of tokenRegex) {
				const { tokenName, regexp } = tokenStuff;

				const match = regexp.exec(str);
				if (match !== null) return [tokenName, match];
			}

			return null;
		};

		const parts: (() => string)[] = [];
		while (head < length) {
			const tokenStuff = getToken(string.substring(head));

			if (tokenStuff === null) {
				throw new Error(
					"can't find token in string, this may happen if a variable name contains a newline"
				);
			}

			const [tokenName, match] = tokenStuff;

			switch (tokenName) {
				case 'plainText':
					parts.push(textPart(match[1].replace(/\\([#\[])/g, '$1')));
					head += match[1].length;
					break;
				case 'assignment':
					const { variable, expression } = match.groups as {
						variable: string;
						expression: string;
					};

					if (/\[(?<!\/)/.test(expression)) {
						throw new Error(
							`Don't nest variable assignments "${match[0]}" in "${string}"`
						);
					}

					parts.push(
						varPart(
							variable,
							expression.replace(/\\([#\[])/g, '$1'),
							this._tracery
						)
					);

					head += match[0].length;

					break;
				case 'reference':
					const { text, ending } = match.groups as {
						text: string;
						ending: string;
					};

					if (ending == '') {
						throw new Error(`Unclosed # in "${string}"`);
					}

					parts.push(referencePart(text, this._tracery));
					head += match[0].length;
					break;
			}
		}
		return parts;
	}

	public evaluate(modifiers: string[]): string {
		this._tracery.pushVars();

		const result = this.reduce(this._compiledDefinition, modifiers);

		this._tracery.popVars();
		return result;
	}

	private safeGetProperty(
		obj: Record<string, unknown>,
		property: string
	): unknown {
		const val = obj[property];
		return val;
	}

	private reduceObject(
		obj: Record<string, unknown>,
		modifiers: string[]
	): [string | number | (() => unknown), string[]] {
		if (modifiers.length === 0) {
			throw new Error('Object could not be reduced to string or number');
		}

		let gotProperty = false;
		let objectLookupResult = undefined;
		if (obj.hasOwnProperty(modifiers[0])) {
			objectLookupResult = this.safeGetProperty(
				obj as Record<string, unknown>,
				modifiers[0]
			);
			gotProperty = true;
		} else {
			const descriptor = Object.getOwnPropertyDescriptor(
				obj.__proto__,
				modifiers[0]
			);
			if (descriptor?.get) {
				objectLookupResult = descriptor?.get.call(obj);
				gotProperty = true;
			}
		}

		if (gotProperty) {
			const remainingModifiers = modifiers.slice(1);

			if (
				objectLookupResult === null ||
				objectLookupResult === undefined
			) {
				throw new Error(
					'Property lookup on object returned null or undefined'
				);
			}

			switch (typeof objectLookupResult) {
				case 'string':
				case 'number':
					return [objectLookupResult, remainingModifiers];

				case 'function':
					if (objectLookupResult instanceof Function) {
						return [objectLookupResult, remainingModifiers];
					}

				case 'object':
					return this.reduceObject(
						objectLookupResult as Record<string, unknown>,
						remainingModifiers
					);
				default:
					throw new Error(
						`Invalid type ${typeof objectLookupResult} after reduction`
					);
			}
		} else {
			throw new Error(
				`Missing property "${modifiers[0]}" on object for reduction in rule "${this.name}"`
			);
		}
	}

	private reduce(
		definition: string | number | (() => unknown) | object,
		modifiers: string[]
	): string {
		switch (typeof definition) {
			case 'string':
				return this._tracery.modify(definition, modifiers);

			case 'number':
				return this._tracery.modify(definition.toString(), modifiers);

			case 'function':
				return this.reduce(definition(), modifiers);

			case 'object':
				const [reductionResult, remainingModifiers] = this.reduceObject(
					definition as Record<string, unknown>,
					modifiers
				);

				return this.reduce(reductionResult, remainingModifiers);
			default:
				throw new Error(
					`Unexpected type to reduce "${typeof definition}"`
				);
		}
	}
}

const textPart =
	(string: string): (() => string) =>
	(): string =>
		string;
const referencePart = <T extends Grammar>(
	string: string,
	tracery: Tracery<T>
): (() => string) => {
	const parts = string.split('.');
	return (): string => {
		const variable = tracery.getVar(parts[0]);

		if (variable !== null) {
			return tracery.modify(variable, parts.slice(1));
		}

		const rule = tracery.getRule(parts[0]);

		if (rule === null) {
			throw new Error(`Missing rule named "${parts[0]}"`);
		}

		return rule.evaluate(parts.slice(1));
	};
};
const varPart = <T extends Grammar>(
	variable: string,
	expression: string,
	tracery: Tracery<T>
) => {
	return (): string => {
		tracery.setVar(variable, tracery.evaluate(expression));
		return '';
	};
};

// We can't be real specific about the allowed grammar as it would be too restricting (thoughts?)
// So this way (with "object" as an option) it really allows anything, but the type hinting does work for
// functions declared at the top level
export type RuleDefinition =
	| string
	| number
	| RuleDefinition[]
	| object
	| ((tracery: Tracery<Grammar>, ...args: unknown[]) => RuleDefinition);

export type Grammar = {
	[ruleName: string]: RuleDefinition;
};
