/* ==========================================================================
   Per-slide behaviour. Most slides are fully declarative (data-anim /
   data-step). The hooks here add charts and the few interactions that need
   real logic: the cover timeline, the "65 años" swap, waffle grids, the
   compound-interest chart, the rate switcher, the formula morph and the
   self-assessment checklist.
   ========================================================================== */
(function (global) {
  'use strict';

  const PD = (global.PD = global.PD || {});

  /** Read the stage scale so DOM measurements map back to canvas pixels. */
  function stageScale(el) {
    const stage = el.closest('.stage');
    return Number(getComputedStyle(stage).getPropertyValue('--scale')) || 1;
  }

  PD.registerSlides = function registerSlides(deck) {
    /* -- 01 · Cover: the marker travels from "hoy" to 65 ------------------ */
    deck.on('s01', {
      enter(slide, tl) {
        const dot = slide.querySelector('.cover__dot');
        tl.fromTo(dot, { left: '0%' }, { left: '100%', duration: 2.4, ease: 'power2.inOut' }, 1.2);
      },
      settle(slide) {
        gsap.set(slide.querySelector('.cover__dot'), { left: '100%' });
      },
    });

    /* -- 03 · The opening line gives way to the question ------------------ */
    deck.on('s03', {
      enter(slide) {
        gsap.set(slide.querySelector('.moment__opening'), { clearProps: 'all' });
      },
      step(slide, n, direction) {
        const opening = slide.querySelector('.moment__opening');
        if (n === 1 && direction > 0) {
          gsap.to(opening, { autoAlpha: 0, y: -28, duration: 0.7, ease: 'power2.in', overwrite: true });
        } else if (n === 0 && direction < 0) {
          gsap.to(opening, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out', overwrite: true });
        }
      },
      settle(slide) {
        gsap.set(slide.querySelector('.moment__opening'), { autoAlpha: 0 });
      },
      leave(slide) {
        gsap.set(slide.querySelector('.moment__opening'), { clearProps: 'all' });
      },
    });

    /* -- 04 / 06 · Waffle grids ------------------------------------------- */
    const waffles = new WeakMap();
    const waffleHook = {
      init(slide) {
        const list = Array.from(slide.querySelectorAll('[data-chart="waffle"]')).map((el) => ({
          el,
          chart: PD.Charts.waffle(el),
        }));
        waffles.set(slide, list);
      },
      enter(slide, tl) {
        waffles.get(slide).forEach(({ el, chart }) => {
          chart.prime();
          const at = Number(el.parentElement.querySelector('[data-anim="count"]').dataset.at || 0);
          chart.play(tl, at - 0.1);
        });
      },
      settle(slide) {
        waffles.get(slide).forEach(({ chart }) => chart.settle());
      },
      leave(slide) {
        waffles.get(slide).forEach(({ chart }) => chart.prime());
      },
    };
    deck.on('s04', waffleHook);
    deck.on('s06', waffleHook);

    /* -- 09 · Compound growth chart (build step 1) ------------------------ */
    let compound = null;
    deck.on('s09', {
      init(slide) {
        compound = PD.Charts.compoundChart(slide.querySelector('[data-chart="compound"]'));
        compound.prime();
      },
      step(slide, n, direction, _deck, tl) {
        if (n === 1 && direction > 0 && tl) {
          compound.prime();
          compound.play(tl, 0.15, 2.6);
        }
      },
      settle() {
        compound.settle();
      },
      leave() {
        compound.prime();
      },
    });

    /* -- 10 · Rate switcher: table rows drive the bars -------------------- */
    deck.on('s10', {
      init(slide) {
        const rows = Array.from(slide.querySelectorAll('.rtable__row'));
        const bars = Array.from(slide.querySelectorAll('.wbar'));
        const values = bars.map((b) => b.querySelector('.wbar__value'));
        const defaults = values.map((v) => v.dataset.to);
        const defaultRow = rows.find((r) => r.classList.contains('is-active'));

        const apply = (row, animate) => {
          rows.forEach((r) => r.classList.toggle('is-active', r === row));
          const nums = row.dataset.values.split(',').map(Number);
          const max = Math.max(...nums);
          bars.forEach((bar, i) => {
            const target = (nums[i] / max) * 100;
            const label = values[i];
            const from = Number(label.dataset.to);
            label.dataset.to = String(nums[i]);
            if (!animate) {
              bar.style.setProperty('--h', target + '%');
              label.textContent = PD.formatCount(label, nums[i]);
              return;
            }
            gsap.to(bar, { '--h': target + '%', duration: 0.9, ease: 'power3.inOut', overwrite: 'auto' });
            const proxy = { v: from };
            gsap.to(proxy, {
              v: nums[i],
              duration: 0.9,
              ease: 'power3.inOut',
              overwrite: 'auto',
              onUpdate: () => {
                label.textContent = PD.formatCount(label, proxy.v);
              },
            });
          });
        };

        // Browsers synthesize pointer events when content appears under a parked
        // cursor; only a genuine movement (new coordinates) switches the rate.
        let lastPointer = null;
        rows.forEach((row) => {
          row.addEventListener('click', () => apply(row, true));
          row.addEventListener('pointermove', (e) => {
            const moved = !lastPointer || lastPointer.x !== e.clientX || lastPointer.y !== e.clientY;
            lastPointer = { x: e.clientX, y: e.clientY };
            if (moved && !row.classList.contains('is-active')) apply(row, true);
          });
          row.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              apply(row, true);
            }
          });
        });

        slide.__resetRate = () => {
          values.forEach((v, i) => (v.dataset.to = defaults[i]));
          apply(defaultRow, false);
        };
      },
      leave(slide) {
        slide.__resetRate();
      },
    });

    /* -- 14 · Formula morph: the terms of "lo de siempre" reorder --------- */
    deck.on('s14', {
      step(slide, n, direction) {
        if (n !== 1 || direction <= 0) return;
        const oldF = slide.querySelector('#formula-old');
        const newF = slide.querySelector('#formula-new');
        const scale = stageScale(slide);
        const ratio = parseFloat(getComputedStyle(oldF).fontSize) / parseFloat(getComputedStyle(newF).fontSize);
        const terms = Array.from(newF.querySelectorAll('.term'));
        const ops = newF.querySelectorAll('.op');

        terms.forEach((term) => {
          const source = oldF.querySelector(`.term[data-term="${term.dataset.term}"]`);
          const a = source.getBoundingClientRect();
          const b = term.getBoundingClientRect();
          gsap.set(term, {
            x: (a.left - b.left) / scale,
            y: (a.top - b.top) / scale,
            scale: ratio,
            transformOrigin: '0 0',
            opacity: 0.35,
          });
        });
        gsap.set(ops, { autoAlpha: 0 });

        const tl = gsap.timeline({ delay: 0.15 });
        tl.to(terms, { x: 0, y: 0, scale: 1, opacity: 1, duration: 1.15, ease: 'power3.inOut', stagger: 0.07 }, 0);
        tl.to(ops, { autoAlpha: 1, duration: 0.5 }, 0.8);
      },
      leave(slide) {
        gsap.set(slide.querySelectorAll('#formula-new .term, #formula-new .op'), { clearProps: 'all' });
      },
      settle(slide) {
        gsap.set(slide.querySelectorAll('#formula-new .term, #formula-new .op'), { clearProps: 'all' });
      },
    });

    /* -- 16 · Self-assessment checklist ----------------------------------- */
    deck.on('s16', {
      init(slide) {
        const items = Array.from(slide.querySelectorAll('.check__item'));
        const scoreEl = slide.querySelector('.score__n');
        const state = { shown: 0 };

        const update = () => {
          const count = items.filter((it) => it.classList.contains('is-on')).length;
          gsap.to(state, {
            shown: count,
            duration: 0.5,
            ease: 'power2.out',
            overwrite: true,
            onUpdate: () => {
              scoreEl.textContent = String(Math.round(state.shown));
            },
          });
          gsap.fromTo(scoreEl, { scale: 1.12 }, { scale: 1, duration: 0.5, ease: 'power2.out', transformOrigin: 'right bottom' });
        };

        const toggle = (item) => {
          const on = !item.classList.contains('is-on');
          item.classList.toggle('is-on', on);
          item.querySelector('.check__toggle').setAttribute('aria-pressed', String(on));
          update();
        };

        items.forEach((item) => {
          item.addEventListener('click', (e) => {
            e.stopPropagation();
            toggle(item);
          });
        });

        slide.__toggleKey = (key) => {
          const item = items.find((it) => it.dataset.key === key);
          if (item) toggle(item);
          return Boolean(item);
        };
      },
      key(e, slide) {
        return /^[1-5]$/.test(e.key) && slide.__toggleKey(e.key);
      },
    });
  };
})(window);
