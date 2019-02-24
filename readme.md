# Tracery 3 v0.1.0

## About

Tracery was developed by Kate Compton, beginning March 2013 as a class assignment.

This version was forked the [tracery2 branch](https://github.com/galaxykate/tracery/tree/tracery2) in Kate's repo, and converted to TypeScript.

## Setup

1. Install Node.js if you don't have it installed already
    - This will install the Node Package Manager (npm) required in steps 4. and 5.
2. `git clone git@github.com:aNickzz/tracery.git`
    - This will download the latest version of the project.
    - Alternatively you could download and extract a zip of the project from the GitHub page
3. `cd tracery`
    - Navigate to the location where you cloned / unzipped the project
4. `npm install`
    - This will install all the required packages
5. `npm install --global gulp`
    - Gulp is a build tool that you'll use in the next step
6. `gulp build`
    - This compiles the TypeScript and creates some JavaScript files in a `js` directory. These are used by the various `.html` files in the project.
7. Open `interactive.html` in your browser

## Basic usage

### TL:DR; Example

(Subject to heavy change, but i'll try to keep this example updated)

```TypeScript
import { Tracery } from "../Tracery";
import { RawGrammar } from "../Grammar";
import { DefaultModifiersEn } from "../default/modifiers-en";

const rawGrammar: RawGrammar = {
    "origin": "Hello, my name is #name.capitalize#.",
    "name"  : [
        "bob",
        "james",
        "jordan",
        "lucy",
        "wendy"
    ]
};

const tracery = new Tracery();
const grammar = tracery.createGrammar(rawGrammar);

//Load the default english modifiers like ".capitalize" and ".a"
grammar.addModifiers(DefaultModifiersEn);

let root = rawGrammar.origin;
let result = grammar.expand(root);

console.log(result.finishedText);
```

**NOTE:** The below is leftover from the original project which was written in JavaScript. It kinda mostly applies to this project but it won't be exactly the same.

### Create a grammar

Create an empty grammar:

    grammar = tracery.createGrammar();

Create a grammar from a Tracery-formatted object:

    grammar = tracery.createGrammar({origin:"foo"});

Add modifiers to the grammar (import "mods-eng-basic.js" for basic English modifiers, or write your own)

    grammar.addModifiers(baseEngModifiers);

### Expand rules

Get the fully-expanded string from a rule

    grammar.flatten("#origin#");

Get the fully-expanded node from a rule, this will return a root node containing a full expanded tree with many potentially interesting properties, including "finishedText" for each node.

    grammar.expand("#origin#");

Get the root node from a rule _not_ fully expanded (this allows for animating the expansion of the tree) TODO, this is still buggy and does not correctly set the "finishedText"

    grammar.expand("#origin#", true);

    // animate the expansion over time
    var stepTimer = setInterval(function() {
        app.stepIterator.node.expand(true);
        var action = app.stepIterator.next();
        if (!action)
            clearInterval(stepTimer);
        refreshVisualization();
        refreshGrammarOutput();
    }, 40);

### Making Tracery deterministic

By default, Tracery uses Math.random() to generate random numbers. If you need Tracery to be deterministic, you can make it use your own random number generator using:

    tracery.setRng(myRng);

where myRng is a function that, [like Math.random()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random), returns a floating-point, pseudo-random number in the range [0, 1).

By using a local random number generator that takes a seed and controlling this seed, you can make Tracery's behaviour completely deterministic.

(Alternatively, you could use something like [seedrandom](https://github.com/davidbau/seedrandom) to make Math.random() seedable, but then you need to be very careful about who uses Math.random() - it effectively becomes a global variable that anyone can modify. Using a local random number generator - perhaps from seedrandom - instead of replacing Math.random() avoids this problem.)

## Library Concepts

### Grammar

A Grammar is

-   _a dictionary of symbols_: a key-value object matching keys (the names of symbols) to expansion rules
-   optional metadata such as a title, edit data, and author
-   optional connectivity graphs describing how symbols call each other

_clearState_: symbols and rulesets have state (the stack, and possible ruleset state recording recently called rules). This function clears any state, returning the dictionary to its original state;

Grammars are usually created by feeding in a raw JSON grammar, which is then parsed into symbols and rules. You can also build your own Grammar objects from scratch, without using this utility function, and can always edit the grammar after creating it.

### Symbol

A symbol is a **key** (usually a short human-readable string) and a set of expansion rules

-   the key
-   rulesetStack: the stack of expansion **rulesets** for this symbol. This stack records the previous, inactive rulesets, and the current one.
-   optional connectivity data, such as average depth and average expansion length

Putting a **key** in hashtags, in a Tracery syntax object, will create a expansion node for that symbol within the text.

Each top-level key-value pair in the raw JSON object creates a **symbol**. The symbol's _key_ is set from the key, and the _value_ determines the **ruleset**.

### Modifier

A function that takes a string (and optionally parameters) and returns a string. A set of these is included in mods-eng-basic.js. Modifiers are applied, in order, after a tag is fully expanded.

To apply a modifier, add its name after a period, after the tag's main symbol:

    #animal.capitalize#
    #booktitle.capitalizeAll#
    Hundreds of #animal.s#

Modifiers can have parameters, too! (soon they will can have parameter that contain tags, which will be expanded when applying the modifier, but not yet)

    #story.replace(he,she).replace(him,her).replace(his,hers)#

### Action

An action that occurs when its node is expanded. Built-in actions are

-   Generating some rules "[key:#rule#]" and pushing them to the "key" symbol's rule stack. If that symbol does not exist, it creates it.
-   Popping rules off of a rule stack, "[key:POP]"
-   Other functions

TODO: figure out syntax and implementation for generating _arrays_ of rules, or other complex rulesets to push onto symbols' rulestacks

TODO: figure out syntax and storage for calling other functions, especially for async APIs.

### Ruleset

A ruleset is an object that defines a _getRule_ function. Calling this function may change the internal state of the ruleset, such as annotating which rules were most recently returned, or drawing and removing a rule from a shuffled list of available rules.

#### Basic ruleset

A basic ruleset is just an array of options.

They can be created by raw JSON by having an _array_ or a _string_ as the value, like this:
"someKey":["rule0", "rule1", "some#complicated#rule"]
If there is only one rule, it is acceptable short hand to leave off the array, but this only works with Strings.
"someKey":"just one rule"

These use the default distribution of the Grammar that owns them, which itself defaults to regular stateless pseudo-randomness.

#### Rulesets with conditions, distributions, or ranked fall-backs

**Note:** this feature is under development, coming soon

These rulesets are created when the raw JSON has an _object_ rather than an _array_ as the value.

Some attributes of this object can be:

-   baseRules: a single ruleset,
-   ruleRanking: an array of rulesets, call _getRule_ on each in order until one returns a value, if none do, return _baseRules_._getRule_,
-   distribution: a new distribution to override the default)
-   conditionRule: a rule to expand
-   conditionValue: a value to match the expansion against
-   conditionSuccess: a ruleset to use if expanding _conditionRule_ returns _conditionValue_, otherwise use _baseRules_

These can be nested, so it is possible to make a ruleset
