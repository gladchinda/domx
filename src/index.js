!(function (window, document) {
  'use strict';

  const DOMX_GLOBAL_ANIMATION_NAME = 'observe-element';

  const DOMX_FIRST_CHILD = 0b01; // 1
  const DOMX_LAST_CHILD = 0b10; // 2
  const DOMX_ONLY_CHILD = 0b11; // 3

  const DOMX_ALWAYS_CHILDREN = 0b01; // 1
  const DOMX_ZERO_CHILDREN = 0b10; // 2

  const DOMX_CHILD_TYPES = {
    first: DOMX_FIRST_CHILD,
    last: DOMX_LAST_CHILD,
    only: DOMX_ONLY_CHILD
  };

  const DOMX_CHILDREN_TYPES = {
    always: DOMX_ALWAYS_CHILDREN,
    zero: DOMX_ZERO_CHILDREN
  };

  // Setup the AnimationObserver object.
  // Provide a `handleEvent()` method to be used as event listener.
  const AnimationObserver = Object.create(null, {
    _getElementTypes: {
      value: function _getElementTypes (elem) {
        let classes = String();

        if (elem instanceof Element) {
          classes = (typeof elem.className === 'string')
            ? elem.className
            : elem.getAttribute('class') || String();
        }

        const child = (
          elem.dataset.domxChild ||
          elem.getAttribute('data-domx-child') ||
          String()
        ).toLowerCase();

        const children = (
          elem.dataset.domxChildren ||
          elem.getAttribute('data-domx-children') ||
          String()
        ).toLowerCase();

        return classes.replace(/\s+/g, ' ').split(' ')
          .reduce((_typesMapping, _class) => {
            let [, type, children] = [].concat(_class.match(/^domx-([^-]+)-child(ren)?$/i)).filter(Boolean);

            if (type) {
              const _type = children ? 'children' : 'child';
              const typeDictionary = children ? DOMX_CHILDREN_TYPES : DOMX_CHILD_TYPES;

              if (typeDictionary.hasOwnProperty(type = type.toLowerCase())) {
                const classType = typeDictionary[type];
                const currentType = _typesMapping[_type];

                if (classType > currentType) {
                  return { ..._typesMapping, [_type]: classType };
                }
              }
            }

            return _typesMapping;
          }, {
            child: DOMX_CHILD_TYPES.hasOwnProperty(child) ? DOMX_CHILD_TYPES[child] : 0,
            children: DOMX_CHILDREN_TYPES.hasOwnProperty(children) ? DOMX_CHILDREN_TYPES[children] : 0
          });
      }
    },

    _updateElementTargetChildHelper: {
      value: function _updateElementTargetChildHelper (elem, elemProperty, elemPositionFlag) {
        const parent = elem.parentNode;

        if (!parent[elemProperty]) {
          let $elem;

          Object.defineProperty(parent, elemProperty, {
            get () { return $elem },

            set (elem) {
              if (elem instanceof Node) {
                if (!($elem instanceof Node && (elem.compareDocumentPosition($elem) & elemPositionFlag))) {
                  $elem = elem;
                }
              }
            }
          });
        }

        parent[elemProperty] = elem;
      }
    },

    _updateElementTargetChild: {
      value: function _updateElementTargetChild (elem, childType) {
        if ((childType & DOMX_ONLY_CHILD) === DOMX_ONLY_CHILD) {
          return this._updateElementTargetChildHelper(elem, '$domx-only-child', Node.DOCUMENT_POSITION_PRECEDING);
        }

        if (childType & DOMX_LAST_CHILD) {
          return this._updateElementTargetChildHelper(elem, '$domx-last-child', Node.DOCUMENT_POSITION_FOLLOWING);
        }

        if (childType & DOMX_FIRST_CHILD) {
          return this._updateElementTargetChildHelper(elem, '$domx-first-child', Node.DOCUMENT_POSITION_PRECEDING);
        }
      }
    },

    handleEvent: {
      value: function _observer (evt) {
        if (evt.animationName === DOMX_GLOBAL_ANIMATION_NAME) {
          // ...handle target here
          const elem = evt.target;
          const { child: childType, children: childrenType } = this._getElementTypes(elem);

          this._updateElementTargetChild(elem, childType);

          if (childrenType & DOMX_ALWAYS_CHILDREN) { }

          if (childrenType & DOMX_ZERO_CHILDREN) { }

          // const clonedElem = elem.cloneNode(true);
          // const lastChild = parent.lastChild;
          // const firstChild = parent.firstChild;
        }
      }
    }
  });

  // A no-op utility function
  function noop () { }

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
  function _setupObservationListeners () {
    document.addEventListener('animationstart', AnimationObserver, false);
    document.addEventListener('MSAnimationStart', AnimationObserver, false);
    document.addEventListener('webkitAnimationStart', AnimationObserver, false);
  }

  function _dropObservationListeners () {
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