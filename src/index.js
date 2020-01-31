!(function (window, document) {
	'use strict';

	const DOMX_GLOBAL_ANIMATION_NAME = 'observe-element';

	// Setup the AnimationObserver object.
	// Provide a `handleEvent()` method to be used as event listener.
	const AnimationObserver = Object.create(null, {
		handleEvent: {
			value: function _observer (evt) {
				if (evt.animationName === DOMX_GLOBAL_ANIMATION_NAME) {
					// ...handle target here
				}
			}
		}
	});

	// A no-op utility function
	function noop () {}

	// Utility function for wrapping a function required to be called only once.
	function once (fn) {
		if (typeof fn !== 'function')
			return fn;

		let _invokedOnce = 0;

		return function _onceWrappedFn (...args) {
			// Get the result of the function call with the passed arguments.
			// Switch to a no-op function call after the first call.
			return (!_invokedOnce && (_invokedOnce = 1))
				? fn(...args)
				: noop();
		}
	}

	// Register document event listener to setup observation.
	// Provide a `setTimeout` fallback in case the `DOMContentLoaded` is missed.
	// Regardless of which one fires first, the observation listeners should be
	// setup only once.
	function _setupObservationListeners() {
		document.addEventListener('animationstart', AnimationObserver, false);
		document.addEventListener('MSAnimationStart', AnimationObserver, false);
		document.addEventListener('webkitAnimationStart', AnimationObserver, false);
	}

	function _dropObservationListeners() {
		document.removeEventListener('animationstart', AnimationObserver, false);
		document.removeEventListener('MSAnimationStart', AnimationObserver, false);
		document.removeEventListener('webkitAnimationStart', AnimationObserver, false);
	}

	const __setupObservationListeners = once(_setupObservationListeners);

	document.addEventListener('DOMContentLoaded', __setupObservationListeners);
	setTimeout(__setupObservationListeners, 0);

	// Make the immutable `Domx` global available on the `window` object.
	Object.defineProperty(window, 'Domx', {
		value: Object.create(null, {
			stop: {
				value: function _stopAnimationObservation () {
					setTimeout(_dropObservationListeners, 0);
				}
			},

			resume: {
				value: function _startAnimationObservation () {
					setTimeout(_setupObservationListeners, 0);
				}
			}
		})
	});
})(window, document);
