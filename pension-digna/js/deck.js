/* ==========================================================================
   Deck engine
   - Fixed 1920×1080 stage scaled to the viewport
   - Slide navigation with per-slide build steps
   - Keyboard, pointer, hash routing, progress + counter
   - Per-slide hooks (enter / step / leave / key) registered by slides.js
   ========================================================================== */
(function (global) {
  'use strict';

  const PD = (global.PD = global.PD || {});

  const KEYS_NEXT = ['ArrowRight', 'ArrowDown', ' ', 'Spacebar', 'PageDown', 'Enter'];
  const KEYS_PREV = ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'];

  class Deck {
    constructor(root, options = {}) {
      this.root = root;
      this.stage = root.querySelector('.stage');
      this.slides = Array.from(this.stage.querySelectorAll('.slide'));
      this.progressBar = root.querySelector('.progress__bar');
      this.counterCurrent = root.querySelector('.counter__current');
      this.counterTotal = root.querySelector('.counter__total');
      this.hint = root.querySelector('.hint');
      this.navPrev = root.querySelector('.nav--prev');
      this.navNext = root.querySelector('.nav--next');

      this.animate = options.animate;      // PD.Animate instance
      this.hooks = {};                     // slideId -> { enter, step, leave, key }
      this.index = -1;
      this.step = 0;
      this.transition = null;
      this.entrance = null;
      this.pointerTimer = null;
      this.hintShown = false;

      this.slides.forEach((slide, i) => {
        slide.dataset.index = String(i);
        if (!slide.dataset.steps) slide.dataset.steps = String(this.animate.countSteps(slide));
      });
    }

    /* -- registration ----------------------------------------------------- */
    on(slideId, hook) {
      this.hooks[slideId] = Object.assign(this.hooks[slideId] || {}, hook);
      return this;
    }

    hook(slide) {
      return this.hooks[slide.id] || {};
    }

    /* -- lifecycle -------------------------------------------------------- */
    init() {
      this.fit();
      global.addEventListener('resize', () => this.fit());

      this.counterTotal.textContent = pad(this.slides.length);

      this.slides.forEach((slide) => {
        this.animate.prime(slide);
        const h = this.hook(slide);
        if (h.init) h.init(slide, this);
      });

      this.bindKeyboard();
      this.bindPointer();
      global.addEventListener('hashchange', () => this.goToHash(true));

      const start = this.readHash();
      this.goTo(start, { direction: 1, immediate: true });
      if (start === 0) this.showHint();
    }

    fit() {
      const scale = Math.min(global.innerWidth / 1920, global.innerHeight / 1080);
      this.stage.style.setProperty('--scale', scale.toFixed(5));
    }

    /* -- navigation ------------------------------------------------------- */
    get current() {
      return this.slides[this.index];
    }

    get steps() {
      return Number(this.current.dataset.steps || 0);
    }

    next() {
      if (this.step < this.steps) {
        this.setStep(this.step + 1, 1);
      } else if (this.index < this.slides.length - 1) {
        this.goTo(this.index + 1, { direction: 1 });
      }
    }

    prev() {
      if (this.step > 0) {
        this.setStep(this.step - 1, -1);
      } else if (this.index > 0) {
        this.goTo(this.index - 1, { direction: -1 });
      }
    }

    first() {
      this.goTo(0, { direction: 1 });
    }

    last() {
      this.goTo(this.slides.length - 1, { direction: 1 });
    }

    setStep(n, direction) {
      const slide = this.current;
      const from = this.step;
      this.step = n;
      const tl = this.animate.applyStep(slide, n, direction, from);
      const h = this.hook(slide);
      if (h.step) h.step(slide, n, direction, this, tl);
    }

    /**
     * Navigate to slide `i`.
     * direction  +1 → entrance choreography plays from step 0
     * direction  -1 → slide is shown fully built (all steps), no replay
     */
    goTo(i, { direction = 1, immediate = false } = {}) {
      i = Math.max(0, Math.min(this.slides.length - 1, i));
      if (i === this.index) return;

      // Finish any in-flight transition instantly so state never desyncs.
      if (this.transition) {
        this.transition.progress(1).kill();
        this.transition = null;
      }
      if (this.entrance) {
        this.entrance.kill();
        this.entrance = null;
      }

      const from = this.current;
      const to = this.slides[i];
      const prevIndex = this.index;
      this.index = i;

      if (from) {
        const h = this.hook(from);
        if (h.leave) h.leave(from, this);
        this.animate.reset(from);
      }

      this.stage.dataset.theme = to.dataset.theme;
      this.updateChrome();
      this.writeHash();
      if (this.hint && prevIndex !== -1) this.hideHint();

      // Prepare target: hidden steps + primed entrance state, or settled.
      const hookTo = this.hook(to);
      if (direction < 0) {
        this.step = this.steps;
        this.animate.settle(to);
        if (hookTo.settle) hookTo.settle(to, this);
      } else {
        this.step = 0;
        this.animate.prime(to);
      }

      const tl = gsap.timeline({
        defaults: { overwrite: 'auto' },
        onComplete: () => {
          this.transition = null;
        },
      });

      if (from) {
        tl.to(from, { autoAlpha: 0, duration: immediate ? 0 : 0.38, ease: 'power2.inOut' }, 0);
      }
      tl.fromTo(
        to,
        { autoAlpha: 0, y: direction >= 0 ? 14 : 0 },
        { autoAlpha: 1, y: 0, duration: immediate ? 0 : 0.6, ease: 'power3.out', clearProps: 'transform' },
        from && !immediate ? 0.22 : 0
      );
      this.transition = tl;

      if (direction >= 0) {
        const entrance = this.animate.entrance(to, 0);
        if (hookTo.enter) hookTo.enter(to, entrance, this);
        entrance.delay(immediate ? 0.15 : 0.42);
        entrance.play();
        this.entrance = entrance;
      }
    }

    goToHash(fromEvent) {
      const target = this.readHash();
      if (target !== this.index) this.goTo(target, { direction: target > this.index ? 1 : -1 });
      else if (!fromEvent) this.writeHash();
    }

    readHash() {
      const m = /^#(\d+)$/.exec(global.location.hash || '');
      if (!m) return 0;
      return Math.max(0, Math.min(this.slides.length - 1, Number(m[1]) - 1));
    }

    writeHash() {
      const hash = '#' + (this.index + 1);
      if (global.location.hash !== hash) history.replaceState(null, '', hash);
    }

    updateChrome() {
      const n = this.slides.length;
      this.stage.dataset.kind = this.current.dataset.kind || 'slide';
      this.counterCurrent.textContent = pad(this.index + 1);
      gsap.to(this.progressBar, { scaleX: (this.index + 1) / n, duration: 0.6, ease: 'power3.out' });
      this.navPrev.toggleAttribute('disabled', this.index === 0);
      this.navNext.toggleAttribute('disabled', this.index === n - 1);
    }

    /* -- presenter hint --------------------------------------------------- */
    showHint() {
      if (!this.hint || this.hintShown) return;
      this.hintShown = true;
      gsap.to(this.hint, { autoAlpha: 1, duration: 0.8, delay: 2.2, ease: 'power2.out' });
    }

    hideHint() {
      if (!this.hint) return;
      gsap.to(this.hint, { autoAlpha: 0, duration: 0.4, overwrite: true });
      this.hint = null;
    }

    /* -- input ------------------------------------------------------------ */
    bindKeyboard() {
      global.addEventListener('keydown', (e) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const h = this.hook(this.current);
        if (h.key && h.key(e, this.current, this)) {
          e.preventDefault();
          return;
        }
        if (KEYS_NEXT.includes(e.key)) {
          e.preventDefault();
          this.next();
        } else if (KEYS_PREV.includes(e.key)) {
          e.preventDefault();
          this.prev();
        } else if (e.key === 'Home') {
          e.preventDefault();
          this.first();
        } else if (e.key === 'End') {
          e.preventDefault();
          this.last();
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          toggleFullscreen();
        }
      });
    }

    bindPointer() {
      this.navPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        this.prev();
      });
      this.navNext.addEventListener('click', (e) => {
        e.stopPropagation();
        this.next();
      });

      // A click on plain slide surface advances (clickers send keys anyway).
      this.stage.addEventListener('click', (e) => {
        if (e.target.closest('[data-interactive], a, button')) return;
        this.next();
      });

      const wake = () => {
        this.stage.classList.add('is-pointer-active');
        clearTimeout(this.pointerTimer);
        this.pointerTimer = setTimeout(() => this.stage.classList.remove('is-pointer-active'), 1800);
      };
      global.addEventListener('pointermove', wake);

      // Touch: horizontal swipe
      let x0 = null;
      this.stage.addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX), { passive: true });
      this.stage.addEventListener(
        'touchend',
        (e) => {
          if (x0 === null) return;
          const dx = e.changedTouches[0].clientX - x0;
          x0 = null;
          if (Math.abs(dx) < 50) return;
          dx < 0 ? this.next() : this.prev();
        },
        { passive: true }
      );
    }
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  PD.Deck = Deck;
})(window);
