/* ==========================================================================
   Per-slide behaviour. Most slides are fully declarative (data-anim /
   data-step). The hooks here add charts and the few interactions that need
   real logic: the cover timeline, the page-2/page-3 build, the "65 años" swap, the
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
      step(slide, n, direction, _deck, tl) {
        if (n !== 2 || direction <= 0 || !tl) return;
        const dot = slide.querySelector('.cover__dot');
        tl.fromTo(dot, { left: '0%', autoAlpha: 1 }, { left: '100%', duration: 2.4, ease: 'power2.inOut' }, 0);
        tl.to(dot, { autoAlpha: 0, duration: 0.5 }, 2.3);
      },
      leave(slide) {
        gsap.set(slide.querySelector('.cover__dot'), { clearProps: 'all' });
      },
    });

    /* -- 02 · The page-2 layout becomes the page-3 layout on the last click - */
    deck.on('s02', {
      step(slide, n, direction, _deck, tl) {
        const compact = n === 6;
        slide.classList.toggle('is-compact', compact);
        // Let the rows travel before the bars draw into their new positions.
        if (compact && direction > 0 && tl) tl.pause(0).delay(0.55).restart(true);
      },
      settle(slide) {
        slide.classList.add('is-compact');
      },
      leave(slide) {
        slide.classList.remove('is-compact');
      },
    });

    /* -- 03 · The opening line gives way to the question ------------------ */
    deck.on('s03', {
      enter(slide) {
        gsap.set(slide.querySelector('.moment__opening'), { clearProps: 'all' });
      },
      step(slide, n, direction, _deck, tl) {
        const opening = slide.querySelector('.moment__opening');
        if (n === 1 && direction > 0) {
          // Let the opening line leave before the question rises into its place.
          gsap.to(opening, { autoAlpha: 0, y: -28, duration: 0.6, ease: 'power2.in', overwrite: true });
          if (tl) tl.pause(0).delay(0.55).restart(true);
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
        const closing = slide.querySelector('.wait__closing-wrap');

        const TALLEST = 290; // px: the PDF's tallest bar (the 8% / 25-year case)

        const apply = (row, animate) => {
          rows.forEach((r) => r.classList.toggle('is-active', r === row));
          // The closing sentence ("≈ $4.19 millones") is the PDF's 8% case.
          closing.classList.toggle('is-muted', row !== defaultRow);
          const nums = row.dataset.values.split(',').map(Number);
          const max = Math.max(...nums);
          bars.forEach((bar, i) => {
            const target = (nums[i] / max) * TALLEST;
            const label = values[i];
            const from = Number(label.dataset.to);
            label.dataset.to = String(nums[i]);
            if (!animate) {
              bar.style.setProperty('--h', target + 'px');
              label.textContent = PD.formatCount(label, nums[i]);
              return;
            }
            gsap.to(bar, { '--h': target + 'px', duration: 0.9, ease: 'power3.inOut', overwrite: 'auto' });
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

        // Click (or Enter/Space on a focused row) switches the rate; hovering
        // only highlights, so the PDF's 8% case is never left by accident.
        rows.forEach((row) => {
          row.addEventListener('click', () => apply(row, true));
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
        if (n !== 2 || direction <= 0) return;
        const oldF = slide.querySelector('#formula-old');
        const newF = slide.querySelector('#formula-new');
        const scale = stageScale(slide);
        const ratio = parseFloat(getComputedStyle(oldF).fontSize) / parseFloat(getComputedStyle(newF).fontSize);
        const terms = Array.from(newF.querySelectorAll('.term'));
        const ops = newF.querySelectorAll('.op');

        const tl = gsap.timeline({ delay: 0.15 });
        terms.forEach((term, i) => {
          const source = oldF.querySelector(`.term[data-term="${term.dataset.term}"]`);
          const a = source.getBoundingClientRect();
          const b = term.getBoundingClientRect();
          const dx = (a.left - b.left) / scale;
          const dy = (a.top - b.top) / scale;
          // Terms that swap places travel on opposite arcs so they never collide:
          // the one moving left rises, the one moving right dips.
          const arc = dx === 0 ? 0 : dx > 0 ? -70 : 70;
          gsap.set(term, { x: dx, y: dy, scale: ratio, transformOrigin: '0 0', opacity: 0 });
          const at = i * 0.07;
          tl.to(term, { opacity: 1, duration: 0.45, ease: 'power1.out' }, at);
          tl.to(term, { x: 0, scale: 1, duration: 1.15, ease: 'power3.inOut' }, at);
          tl.to(
            term,
            { keyframes: { '0%': { y: dy }, '50%': { y: dy / 2 + arc }, '100%': { y: 0 }, easeEach: 'sine.inOut' }, duration: 1.15 },
            at
          );
        });
        gsap.set(ops, { autoAlpha: 0 });
        tl.to(ops, { autoAlpha: 1, duration: 0.5 }, 0.85);
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
        const scoreBox = slide.querySelector('.score');
        const state = { shown: 0 };

        const update = () => {
          const count = items.filter((it) => it.classList.contains('is-on')).length;
          scoreBox.classList.add('is-visible');
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
