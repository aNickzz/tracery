import { Collection, escapeRegExp, isAlphaNum, isVowel } from "../Util";
import { Modifier } from "../Modifier";



export var DefaultModifiersEn: Collection<Modifier> = {

	replace: function (s, params) {
		//http://stackoverflow.com/questions/1144783/replacing-all-occurrences-of-a-string-in-javascript
		if (!params || params.length < 2)
			throw "Missing regex in modifier";

		return s.replace(new RegExp(escapeRegExp(params[0]), 'g'), params[1]);
	},

	capitalizeAll: function (s) {
		var s2 = "";
		var capNext = true;
		for (var i = 0; i < s.length; i++) {

			if (!isAlphaNum(s.charAt(i))) {
				capNext = true;
				s2 += s.charAt(i);
			} else {
				if (!capNext) {
					s2 += s.charAt(i);
				} else {
					s2 += s.charAt(i).toUpperCase();
					capNext = false;
				}

			}
		}
		return s2;
	},

	capitalize: function (s) {
		return s.charAt(0).toUpperCase() + s.substring(1);
	},

	a: function (s) {
		if (s.length > 0) {
			if (s.charAt(0).toLowerCase() === 'u') {
				if (s.length > 2) {
					if (s.charAt(2).toLowerCase() === 'i')
						return "a " + s;
				}
			}

			if (isVowel(s.charAt(0))) {
				return "an " + s;
			}
		}

		return "a " + s;

	},

	firstS: function (s) {
		console.log(s);
		var s2 = s.split(" ");

		var finished = DefaultModifiersEn.s(s2[0]) + " " + s2.slice(1).join(" ");
		console.log(finished);
		return finished;
	},

	s: function (s) {
		switch (s.charAt(s.length - 1)) {
			case 's':
				return s + "es";
			case 'h':
				return s + "es";
			case 'x':
				return s + "es";
			case 'y':
				if (!isVowel(s.charAt(s.length - 2)))
					return s.substring(0, s.length - 1) + "ies";
				else
					return s + "s";
			default:
				return s + "s";
		}
	},
	ed: function (s) {
		switch (s.charAt(s.length - 1)) {
			case 's':
				return s + "ed";
			case 'e':
				return s + "d";
			case 'h':
				return s + "ed";
			case 'x':
				return s + "ed";
			case 'y':
				if (!isVowel(s.charAt(s.length - 2)))
					return s.substring(0, s.length - 1) + "ied";
				else
					return s + "d";
			default:
				return s + "ed";
		}
	}
};

