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
  
  const DOMX_OBSERVE_TARGET_ELEMENTS = [];

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
    
    _updateElementTarget: {
      value: (function () {
        function _updateElementTargetHelper (elem, targetProperty, elemFlag) {
          const isChildElem = targetProperty !== '$domx-children-flag';
          const target = isChildElem ? elem.parentNode : elem;

          if (!target[targetProperty]) {
            if (isChildElem) {
              let $elem;
              
              Object.defineProperty(target, targetProperty, {
                get () { return $elem },
                
                set (elem) {
                  if (elem instanceof Element && !($elem instanceof Element && (elem.compareDocumentPosition($elem) & elemFlag))) {
                    $elem = elem;
                  }
                }
              });
            }
            
            else {
              let _flag;
              
              Object.defineProperty(target, targetProperty, {
                get () { return _flag },

                set (flag) {
                  if (Number.isInteger(flag) && _flag !== flag) {
                    _flag = flag;
                  }
                }
              });
            }
          }

          if (!target['$domx-observe-element']) {
            DOMX_OBSERVE_TARGET_ELEMENTS.push(target);
            
            Object.defineProperty(target, '$domx-observe-element', {
              get () { return true }
            });
          }

          target[targetProperty] = isChildElem ? elem : elemFlag;
        }
        
        return function _updateElementTarget (elem) {
          if (elem instanceof Element) {
            const { child: childType, children: childrenType } = this._getElementTypes(elem);
            
            if ((childType & DOMX_ONLY_CHILD) === DOMX_ONLY_CHILD) {
              _updateElementTargetHelper(elem, '$domx-only-child', Node.DOCUMENT_POSITION_PRECEDING);
            }

            else if (childType & DOMX_LAST_CHILD) {
              _updateElementTargetHelper(elem, '$domx-last-child', Node.DOCUMENT_POSITION_FOLLOWING);
            }

            else if (childType & DOMX_FIRST_CHILD) {
              _updateElementTargetHelper(elem, '$domx-first-child', Node.DOCUMENT_POSITION_PRECEDING);
            }
            
            if (childrenType & DOMX_ZERO_CHILDREN) {
              _updateElementTargetHelper(elem, '$domx-children-flag', DOMX_ZERO_CHILDREN);
            }
            
            else if (childrenType & DOMX_ALWAYS_CHILDREN) {
              _updateElementTargetHelper(elem, '$domx-children-flag', DOMX_ALWAYS_CHILDREN);
            }
          }
        }
      })()
    },
    
    _scheduleUpdate: {
      value: function _scheduleUpdate () {
        if (DOMX_OBSERVE_TARGET_ELEMENTS.length === 0) {
          requestAnimationFrame(function () {
            DOMX_OBSERVE_TARGET_ELEMENTS.forEach(function (target) {
              const $elem = target['$domx-only-child'] || target['$domx-last-child'] || target['$domx-first-child'];
              
              if ($elem) {
                const $lastChild = target.lastChild;
                const $firstChild = target.firstChild;
                const $clonedElem = $elem.cloneNode(true);
              
                if ($elem === target['$domx-only-child'] && !($elem === $firstChild && $elem === $lastChild)) {
                  target.innerHTML = '';
                  target.appendChild($clonedElem);
                }
                
                else if ($elem === target['$domx-last-child'] && $elem !== $lastChild) {
                  target.removeChild($elem);
                  target.appendChild($clonedElem);
                }
                
                else if ($elem === target['$domx-first-child'] && $elem !== $firstChild) {
                  target.removeChild($elem);
                  target.insertBefore($clonedElem, $firstChild);
                }
              }
              
              switch (target['$domx-children-flag']) {
                case DOMX_ZERO_CHILDREN: {
                  if (target.children.length > 0) {
                    target.innerHTML = '';
                  }
                  break;
                }
                
                case DOMX_ALWAYS_CHILDREN: {
                  target.parentNode.removeChild(target);
                  break;
                }
              }
            });
          });
        }
      }
    },
    
    handleEvent: {
      value: function _observer (evt) {
        if (evt.animationName === DOMX_GLOBAL_ANIMATION_NAME) {
          this._scheduleUpdate();
          this._updateElementTarget(evt.target);
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
