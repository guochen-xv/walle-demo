/* Shared content transitions for the learning and Situation views. */
(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const active = new WeakMap();
  function enter(element, scope = element) {
    if (!scope) return;
    active.get(scope)?.cancel();
    active.delete(scope);
    if (!element?.animate || reducedMotion.matches || document.body.classList.contains('motion-off')) return;
    const animation = element.animate(
      [{opacity: 0, transform: 'translateY(7px)'}, {opacity: 1, transform: 'translateY(0)'}],
      {duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)'}
    );
    active.set(scope, animation);
    animation.onfinish = () => { if (active.get(scope) === animation) active.delete(scope); };
  }
  window.WalleMotion = {enter};
})();
