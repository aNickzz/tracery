declare interface Collection<T> { [propName: string]: T }

declare type RawRule = string;
declare type Expansion = RawRule | Array<RawRule>;

declare interface Obj {
	properties?: Collection<Expansion>,
	expansions?: Collection<Expansion>
}

declare type RawRuleDefinition = Expansion | Obj;

declare interface GrammarJSON {
	[propName: string]: RawRuleDefinition,
}