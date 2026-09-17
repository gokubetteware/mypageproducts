/* ==========================================================================
   Declarative entrance animations
   Elements opt in with data attributes:
     data-anim="rise | fade | line | bar | bar-y | clip | lines | count | scale"
     data-step="n"     element (and its animated descendants) belong to build n
     data-at="0.4"     absolute position (s) inside the slide timeline
     data-dur="0.8"    duration override (s)
     data-origin="left|right|bottom"   transform origin for bar/line
     data-stagger      on a parent: children with [data-anim] cascade tighter
   Counters:
     data-anim="count" data-to="12.22" data-decimals="2" data-prefix="$" data-suffix=" M"
   Everything is reversible: prime() puts elements in their start state,
   settle() puts them in their end state without animating.
   ========================================================================== */
(function (global) {
  'use strict';

  const PD = (global.PD = global.PD || {});

  const CASCADE = 0.11;      // default gap between consecutive elements
  const CASCADE_TIGHT = 0.07; // gap inside a [data-stagger] group

  const DUR = {
    rise: 0.9,
    fade: 0.8,
    line: 0.9,
    bar: 1.0,
    'bar-y': 1.0,
    clip: 1.2,
    lines: 1.0,
    count: 1.6,
    scale: 0.8,
  };

  const numberFormat = new Intl.NumberFormat('en-US');

  function formatCount(el, value) {
    const decimals = Number(el.dataset.decimals || 0);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const fixed = Number(value).toFixed(decimals);
    const [int, frac] = fixed.split('.');
    let out = numberFormat.format(Number(int));
    if (decimals > 0) out += '.' + frac;
    return prefix + out + suffix;
  }

  class Animate {
    constructor() {
      this.prefersReduced = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (this.prefersReduced) gsap.globalTimeline.timeScale(20);
    }

    /* -- queries ---------------------------------------------------------- */
    stepOf(el) {
      const owner = el.closest('[data-step]');
      return owner ? Number(owner.dataset.step) : 0;
    }

    animated(slide) {
      return Array.from(slide.querySelectorAll('[data-anim]'));
    }

    countSteps(slide) {
      let max = 0;
      slide.querySelectorAll('[data-step]').forEach((el) => {
        max = Math.max(max, Number(el.dataset.step));
      });
      return max;
    }

    stepRoots(slide, n) {
      return Array.from(slide.querySelectorAll(`[data-step="${n}"]`));
    }

    /* -- start / end states ----------------------------------------------- */
    startState(el) {
      const kind = el.dataset.anim;
      const origin = el.dataset.origin || (kind === 'bar-y' ? 'bottom' : 'left');
      switch (kind) {
        case 'rise':
          return { autoAlpha: 0, y: 34 };
        case 'fade':
          return { autoAlpha: 0 };
        case 'scale':
          return { autoAlpha: 0, scale: 0.92, transformOrigin: 'center' };
        case 'line':
          return { scaleX: 0, transformOrigin: origin + ' center' };
        case 'bar':
          return { scaleX: 0, transformOrigin: origin + ' center' };
        case 'bar-y':
          return { scaleY: 0, transformOrigin: 'center ' + origin };
        case 'clip':
          return { clipPath: 'inset(0 100% 0 0)' };
        case 'lines':
          return null; // handled on children
        case 'count':
          return null;
        default:
          return { autoAlpha: 0 };
      }
    }

    /** Put one animated element in its start state. */
    primeElement(el) {
      const kind = el.dataset.anim;
      if (kind === 'lines') {
        gsap.set(el.querySelectorAll('.line'), { yPercent: 108, autoAlpha: 1 });
      } else if (kind === 'count') {
        el.textContent = formatCount(el, Number(el.dataset.from || 0));
      } else {
        gsap.set(el, this.startState(el));
      }
    }

    prime(slide) {
      this.animated(slide).forEach((el) => this.primeElement(el));
      // Hide every build step > 0
      slide.querySelectorAll('[data-step]').forEach((root) => {
        if (Number(root.dataset.step) > 0) gsap.set(root, { autoAlpha: 0 });
      });
    }

    settle(slide) {
      this.animated(slide).forEach((el) => {
        const kind = el.dataset.anim;
        if (kind === 'lines') {
          gsap.set(el.querySelectorAll('.line'), { clearProps: 'all' });
        } else if (kind === 'count') {
          el.textContent = formatCount(el, Number(el.dataset.to || 0));
        } else {
          gsap.set(el, { clearProps: 'all' });
        }
      });
      slide.querySelectorAll('[data-step]').forEach((root) => gsap.set(root, { clearProps: 'all' }));
    }

    reset(slide) {
      gsap.killTweensOf(slide.querySelectorAll('*'));
      this.prime(slide);
    }

    /* -- timelines -------------------------------------------------------- */
    /** Build the entrance timeline for build step `n` (0 = slide entry). */
    entrance(slide, n) {
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
      const els = this.animated(slide).filter((el) => this.stepOf(el) === n);

      if (n > 0) this.stepRoots(slide, n).forEach((root) => tl.set(root, { autoAlpha: 1 }, 0));

      let cursor = 0;
      let lastGroup = null;
      els.forEach((el, i) => {
        const group = el.closest('[data-stagger]');
        const inGroup = group !== null && group === lastGroup;
        if (i > 0) cursor += inGroup ? CASCADE_TIGHT : CASCADE;
        lastGroup = group;
        const at = el.dataset.at !== undefined ? Number(el.dataset.at) : cursor;
        if (el.dataset.at !== undefined) cursor = at;
        this.tween(tl, el, at);
      });
      return tl;
    }

    tween(tl, el, at) {
      const kind = el.dataset.anim;
      const dur = el.dataset.dur !== undefined ? Number(el.dataset.dur) : DUR[kind] || 0.8;

      switch (kind) {
        case 'lines':
          tl.to(el.querySelectorAll('.line'), { yPercent: 0, duration: dur, stagger: 0.12, ease: 'power4.out' }, at);
          break;
        case 'count': {
          const from = Number(el.dataset.from || 0);
          const to = Number(el.dataset.to || 0);
          const proxy = { v: from };
          tl.to(
            proxy,
            {
              v: to,
              duration: dur,
              ease: 'power2.out',
              onUpdate: () => {
                el.textContent = formatCount(el, proxy.v);
              },
              onComplete: () => {
                el.textContent = formatCount(el, to);
              },
            },
            at
          );
          break;
        }
        case 'clip':
          tl.to(el, { clipPath: 'inset(0 0% 0 0)', duration: dur, ease: 'power2.inOut' }, at);
          break;
        case 'line':
        case 'bar':
          tl.to(el, { scaleX: 1, duration: dur, ease: 'power3.inOut' }, at);
          break;
        case 'bar-y':
          tl.to(el, { scaleY: 1, duration: dur, ease: 'power3.inOut' }, at);
          break;
        case 'scale':
          tl.to(el, { autoAlpha: 1, scale: 1, duration: dur }, at);
          break;
        case 'rise':
          tl.to(el, { autoAlpha: 1, y: 0, duration: dur }, at);
          break;
        default:
          tl.to(el, { autoAlpha: 1, duration: dur }, at);
      }
    }

    /**
     * Apply build step `n` on `slide`.
     * direction +1 → play the step's entrance
     * direction -1 → hide the step we are leaving (`from`) and restore its start state
     */
    applyStep(slide, n, direction, from) {
      if (direction > 0) {
        // Kill anything still running from a previous undo/redo of this step and
        // restart its elements from a clean start state.
        const roots = this.stepRoots(slide, n);
        roots.forEach((root) => {
          gsap.killTweensOf(root);
          gsap.killTweensOf(root.querySelectorAll('*'));
          root.querySelectorAll('[data-anim]').forEach((el) => this.primeElement(el));
        });
        const tl = this.entrance(slide, n);
        tl.play();
        return tl;
      }
      const roots = this.stepRoots(slide, from);
      roots.forEach((root) => {
        gsap.killTweensOf(root.querySelectorAll('*'));
        gsap.to(root, {
          autoAlpha: 0,
          duration: 0.22,
          overwrite: true,
          onComplete: () => {
            root.querySelectorAll('[data-anim]').forEach((el) => this.primeElement(el));
          },
        });
      });
      return null;
    }
  }

  PD.Animate = Animate;
  PD.formatCount = formatCount;
})(window);
