/* ==========================================================================
   Chart builders (SVG / DOM). Pure construction + GSAP choreography helpers.
   No data is invented here: every value comes from the slide markup.
   ========================================================================== */
(function (global) {
  'use strict';

  const PD = (global.PD = global.PD || {});
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(name, attrs = {}) {
    const el = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
    return el;
  }

  /* -- Waffle: "n de 100" as a 10×10 dot grid --------------------------- */
  function waffle(container) {
    const n = Number(container.dataset.n);
    const total = Number(container.dataset.of || 100);
    container.innerHTML = '';
    const dots = [];
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('i');
      dot.className = 'waffle__dot' + (i < n ? ' is-on' : '');
      container.appendChild(dot);
      dots.push(dot);
    }
    container.dataset.built = '1';
    return {
      on: dots.filter((d) => d.classList.contains('is-on')),
      all: dots,
      prime() {
        gsap.set(dots, { autoAlpha: 0, scale: 0.4, transformOrigin: 'center' });
      },
      settle() {
        gsap.set(dots, { clearProps: 'all' });
      },
      play(tl, at) {
        // Empty dots appear first as a faint grid, then the counted dots fill in.
        tl.to(dots, { autoAlpha: 1, scale: 1, duration: 0.5, stagger: { each: 0.004, from: 'start' }, ease: 'power2.out' }, at);
        tl.fromTo(
          this.on,
          { backgroundColor: 'var(--rule)' },
          { backgroundColor: 'var(--accent)', duration: 0.35, stagger: { each: 0.012, from: 'start' }, ease: 'none', clearProps: 'backgroundColor' },
          at + 0.35
        );
      },
    };
  }

  /* -- Compound growth area chart ----------------------------------------
     Draws two stacked series over months: contributions (linear) and
     total value (compound). Geometry derives from the assumptions stated on
     the slide; labels on the slide are the PDF's own figures. */
  function compoundChart(svg) {
    const monthly = Number(svg.dataset.monthly);   // 3500
    const rate = Number(svg.dataset.rate);         // 0.08 annual net
    const ageFrom = Number(svg.dataset.from);      // 25
    const ageTo = Number(svg.dataset.to);          // 65
    const W = 1000;
    const H = 520;
    const padB = 0;

    const months = (ageTo - ageFrom) * 12;
    const r = rate / 12;
    const contrib = [];
    const total = [];
    for (let m = 0; m <= months; m++) {
      contrib.push(monthly * m);
      total.push(m === 0 ? 0 : monthly * ((Math.pow(1 + r, m) - 1) / r));
    }
    const max = total[months];
    const x = (m) => (m / months) * W;
    const y = (v) => H - padB - (v / max) * (H - padB);

    const pathFor = (series) => {
      let d = `M0 ${H}`;
      series.forEach((v, m) => {
        d += ` L${x(m).toFixed(2)} ${y(v).toFixed(2)}`;
      });
      d += ` L${W} ${H} Z`;
      return d;
    };
    const lineFor = (series) => series.map((v, m) => `${m === 0 ? 'M' : 'L'}${x(m).toFixed(2)} ${y(v).toFixed(2)}`).join(' ');

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = '';

    const defs = svgEl('defs');
    const clip = svgEl('clipPath', { id: svg.id + '-clip' });
    const clipRect = svgEl('rect', { x: 0, y: 0, width: W, height: H });
    clip.appendChild(clipRect);
    defs.appendChild(clip);
    svg.appendChild(defs);

    const g = svgEl('g', { 'clip-path': `url(#${svg.id}-clip)` });
    const areaTotal = svgEl('path', { d: pathFor(total), class: 'area-chart__growth' });
    const areaContrib = svgEl('path', { d: pathFor(contrib), class: 'area-chart__contrib' });
    const lineTotal = svgEl('path', { d: lineFor(total), class: 'area-chart__line' });
    g.appendChild(areaTotal);
    g.appendChild(areaContrib);
    g.appendChild(lineTotal);
    svg.appendChild(g);

    // Vertical guides every decade
    for (let a = ageFrom + 10; a < ageTo; a += 10) {
      const gx = x((a - ageFrom) * 12);
      svg.appendChild(svgEl('line', { x1: gx, x2: gx, y1: 0, y2: H, class: 'area-chart__guide' }));
    }
    svg.appendChild(svgEl('line', { x1: 0, x2: W, y1: H - 0.5, y2: H - 0.5, class: 'area-chart__axis' }));

    return {
      prime() {
        gsap.set(clipRect, { attr: { width: 0 } });
      },
      settle() {
        gsap.set(clipRect, { attr: { width: W } });
      },
      play(tl, at, duration = 2.6) {
        tl.to(clipRect, { attr: { width: W }, duration, ease: 'power2.inOut' }, at);
      },
    };
  }

  PD.Charts = { waffle, compoundChart };
})(window);
