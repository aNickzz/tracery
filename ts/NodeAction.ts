import { TraceryNode } from "./TraceryNode";
import { Tracery } from "./Tracery";

declare type RawNodeAction = string;

export enum NodeActionType {
	/** [key:rule] */
	Push = 0,
	/** [key:POP] */
	Pop = 1,
	/**
	 * [functionName(param0,param1)]
	 * //TODO: implement
	 */
	Function = 2,
}
// An action that occurs when a node is expanded
// Types of actions:
// 0 Push:
// 1 Pop: 
// 2 function: 
export class NodeAction {
	private target: string;
	private rule: RawRule | undefined;

	private ruleSections: Array<string> | undefined;
	private finishedRules: Array<string> | undefined;

	public type: NodeActionType;

	constructor(private tracery: Tracery, private node: TraceryNode, raw: RawNodeAction) {
		/*
		 if (!node)
		 console.warn("No node for NodeAction");
		 if (!raw)
		 console.warn("No raw commands for NodeAction");
		 */

		var sections = raw.split(":");
		this.target = sections[0];

		// No colon? A function!
		if (sections.length === 1) {
			this.type = NodeActionType.Function;

		}

		// Colon? It's either a push or a pop
		else {
			this.rule = sections[1];
			if (this.rule === "POP") {
				this.type = NodeActionType.Pop;
			} else {
				this.type = NodeActionType.Push;
			}
		}
	}


	createUndo() {
		if (this.type === 0) {
			return new NodeAction(this.tracery, this.node, this.target + ":POP");
		}
		// TODO: Not sure how to make Undo actions for functions or POPs
		return null;
	};

	activate() {
		var grammar = this.node.grammar;
		switch (this.type) {
			case NodeActionType.Push:
				// split into sections (the way to denote an array of rules)
				this.ruleSections = (<string>this.rule).split(",");
				this.finishedRules = [];
				// this.ruleNodes = [];
				for (var i = 0; i < this.ruleSections.length; i++) {
					var n = new TraceryNode(this.tracery, grammar, 0, {
						type: -1,
						raw: this.ruleSections[i]
					});

					n.expand();

					this.finishedRules.push(n.finishedText);
				}

				// TODO: escape commas properly
				grammar.pushRules(this.target, this.finishedRules, this);
				break;
			case NodeActionType.Pop:
				grammar.popRules(this.target);
				break;
			case NodeActionType.Function:
				grammar.flatten(this.target, true);
				break;
		}

	};

	toText() {
		switch (this.type) {
			case 0:
				return this.target + ":" + this.rule;
			case 1:
				return this.target + ":POP";
			case 2:
				return "((some function))";
			default:
				return "((Unknown Action))";
		}
	};
}