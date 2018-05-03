import { TraceryNode } from "./TraceryNode";

/**
 * @author Kate
 */

class NodeIterator {
	private itSpacer = "";
	private childIndex = -1;
	private mode = 0;

	constructor(private node: TraceryNode) { }

	// Go to the next
	next() {

		// Actions for this node
		// 0: Just entered
		// 1: Start children
		// 2: Children finished, exit

		switch (this.mode) {
			case 0:
				this.itSpacer += "   ";
				this.mode = 1;
				return {
					log: this.itSpacer + "Enter " + this.node
				};

				break;
			case 1:
				if (!this.node.children || this.node.children.length === 0) {
					this.mode = 2;
					return {
						log: this.itSpacer + "start children: no children"
					};
				} else {
					var childCount = this.node.children.length;
					this.node = this.node.children[0];
					this.mode = 0;
					return {
						log: this.itSpacer + "starting 0 of " + childCount + " children"
					};
				}
				break;
			case 2:
				this.itSpacer = this.itSpacer.substring(3);

				// Find a sibling
				if (this.node.parent) {

					// Attempt sibling
					var nextSib = (this.node.childIndex + 1);
					if (this.node.parent.children[nextSib] !== undefined) {
						this.node = this.node.parent.children[nextSib];
						this.mode = 0;
						return {
							log: this.itSpacer + " starting sibling " + nextSib
						};
					} else {
						this.node = this.node.parent;
						this.mode = 2;
						return {
							log: this.itSpacer + " no remaining siblings, exit to parent"
						};
					}

				} else {

					return null;

				}

				break;
		};

	}
}