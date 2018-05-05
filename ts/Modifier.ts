
/**
 * A function that mutates string expansions. E.g. the "a" modifier seen after the dot in "#noun.a#" prepends the string returned by the "name" symbol with "a" or "an" depending on the first character.
 */
export type Modifier = (text: string, params?: Array<string>) => string;