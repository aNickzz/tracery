export enum SectionType {
	/** Needs parsing */
	Raw = -1,
	/** Plaintext */
	Plaintext = 0,
	/** Tag ("#symbol.mod.mod2.mod3#" or "#[pushTarget:pushRule]symbol.mod") */
	Tag = 1,
	/** Action ("[pushTarget:pushRule], [pushTarget:POP]", more in the future) */
	Action = 2
}
export interface Section { type: SectionType, raw: RawRule }