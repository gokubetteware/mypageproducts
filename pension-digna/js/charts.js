/* ==========================================================================
   Chart builders. No data is invented here: every value comes from the
   assumptions stated on the slide; labels use the PDF's own figures.
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

  /* -- Compound growth area chart ----------------------------------------
     Two stacked series over months: contributions (linear, bone) and total
     value (compound, green), revealed left to right like time passing. */
  function compoundChart(svg) {
    const monthly = Number(svg.dataset.monthly);   // 3500
    const rate = Number(svg.dataset.rate);         // 0.08 annual net
    const ageFrom = Number(svg.dataset.from);      // 25
    const ageTo = Number(svg.dataset.to);          // 65
    const W = 1060;
    const H = 330;

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
    const y = (v) => H - (v / max) * H;

    const pathFor = (series) => {
      let d = `M0 ${H}`;
      series.forEach((v, m) => {
        d += ` L${x(m).toFixed(2)} ${y(v).toFixed(2)}`;
      });
      d += ` L${W} ${H} Z`;
      return d;
    };

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
    g.appendChild(svgEl('path', { d: pathFor(total), class: 'area-chart__growth' }));
    g.appendChild(svgEl('path', { d: pathFor(contrib), class: 'area-chart__contrib' }));
    svg.appendChild(g);
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

  PD.Charts = { compoundChart };
})(window);
