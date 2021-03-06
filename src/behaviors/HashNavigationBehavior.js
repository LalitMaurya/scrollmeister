import Behavior from 'behaviors/Behavior.js';

export default class HashNavigationBehavior extends Behavior {
	static get behaviorSchema() {
		return {
			anchor: {
				type: 'string',
				enum: ['top', 'center', 'bottom'],
				default: 'top'
			},
			offset: {
				type: 'csslength',
				default: '0'
			}
		};
	}

	static get behaviorName() {
		return 'hash-navigation';
	}

	static get behaviorDependencies() {
		return ['guides-layout', 'scroll'];
	}

	behaviorDidAttach() {
		this.listen('click', this._handleClick.bind(this));
	}

	_handleClick(e) {
		//Only handle left click.
		if (e.which !== 1 && e.button !== 0) {
			return;
		}

		let link = this._findParentLink(e.target);

		//The click did not happen inside a link.
		if (!link) {
			return;
		}

		if (this._handleLink(link)) {
			e.preventDefault();
		}
	}

	_findParentLink(element) {
		//We reached the top, no link found.
		if (element === document || !element) {
			return null;
		}

		//Yay, it's a link!
		if (element.tagName.toUpperCase() === 'A') {
			return element;
		}

		//Maybe the parent is a link.
		return this._findParentLink(element.parentElement);
	}

	_handleLink(link) {
		if (link.hash.length < 2) {
			return false;
		}

		//The link points to something completely different.
		if (link.hostname !== window.location.hostname) {
			return false;
		}

		//The link does not link to the same page/path.
		if (link.pathname !== window.location.pathname) {
			return false;
		}

		let scrollTarget = document.getElementById(link.hash.substr(1));

		//Ignore the click if no target is found.
		if (!scrollTarget) {
			return false;
		}

		//The target needs the layout behavior or else we don't know where it is.
		if (!scrollTarget.hasAttribute('layout') || !scrollTarget.layout) {
			return false;
		}

		let layoutBehavior = scrollTarget.layout;
		let layout = layoutBehavior.layout;
		let engine = this.el.guidesLayout.engine;
		let offset = engine.lengthToPixel(this.props.offset, layout.height);
		let targetTop = engine.calculateAnchorPosition(layoutBehavior, this.props.anchor, -offset);

		this.el.scroll.scrollTo(targetTop, true);

		return true;
	}
}
