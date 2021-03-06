// @flow

const PAUSE_DELAY = 300; //ms
const MAX_HISTORY_LENGTH = 30;
const MAX_HISTORY_AGE = 300; //ms

export default class ScrollState {
	onScroll: Function;
	onPause: Function;
	position: number;
	maxPosition: number;
	velocity: number;
	progress: number;
	direction: 'up' | 'down';
	history: Array<number>;
	_pauseTimer: TimeoutID;

	constructor(onScroll: Function, onPause: Function) {
		this.onScroll = onScroll;
		this.onPause = onPause;

		this.position = 0;
		this.maxPosition = 0;
		this.velocity = 0;
		this.progress = 0;
		this.direction = 'down';
		this.history = [];
	}

	tick(now: number, newPosition: number) {
		let direction;

		//We keep track of the position and time for calculating an accurate velocity in later frames.
		this.history.push(this.position, now);

		//Keep the history short, but don't splice() at every frame (only when it's twice as large as the max).
		//TODO: a ring buffer would make this much nicer. But meh.
		if (this.history.length > MAX_HISTORY_LENGTH * 2) {
			this.history.splice(0, MAX_HISTORY_LENGTH);
		}

		this.velocity = this._calculateScrollVelocity(now);

		if (this.position !== newPosition) {
			direction = newPosition > this.position ? 'down' : 'up';

			this.position = newPosition;
			this.progress = newPosition / this.maxPosition;

			//When the direction changed, we clear the history.
			//This way we get better scroll velocity calculations
			//when the users moves up/down very fast (e.g. touch display scratching).
			if (this.direction !== direction) {
				this.direction = direction;
				this.history.length = 0;
			}

			if (this._pauseTimer) {
				clearTimeout(this._pauseTimer);
				delete this._pauseTimer;
			}

			this.onScroll();
		} else {
			if (!this._pauseTimer) {
				this._pauseTimer = setTimeout(this.onPause, PAUSE_DELAY);
			}
		}
	}

	destroy() {
		clearTimeout(this._pauseTimer);
	}

	_calculateScrollVelocity(now: number) {
		//Figure out what the scroll position was about MAX_HISTORY_AGE ago.
		//We do this because using just the past two frames for calculating the veloctiy
		//gives very jumpy results.
		let positions = this.history;
		let positionsIndexEnd = positions.length - 1;
		let positionsIndexStart = positionsIndexEnd;
		let positionsIndex = positionsIndexEnd;
		let timeOffset;
		let movedOffset;

		//Move pointer to position measured MAX_HISTORY_AGE ago
		//The positions array contains alternating offset/timeStamp pairs.
		for (; positionsIndex > 0; positionsIndex = positionsIndex - 2) {
			//Did we go back far enough and found the position MAX_HISTORY_AGE ago?
			if (positions[positionsIndex] <= now - MAX_HISTORY_AGE) {
				break;
			}

			positionsIndexStart = positionsIndex;
		}

		//Compute relative movement between these two points.
		timeOffset = positions[positionsIndexEnd] - positions[positionsIndexStart];
		movedOffset = positions[positionsIndexEnd - 1] - positions[positionsIndexStart - 1];

		if (timeOffset > 0 && Math.abs(movedOffset) > 0) {
			return movedOffset / timeOffset;
		} else {
			return 0;
		}
	}
}
