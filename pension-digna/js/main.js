/* Bootstrap: wait for fonts so the first entrance choreography is measured
   against the real typefaces, then start the deck. */
(function (global) {
  'use strict';

  const PD = global.PD;

  function start() {
    const root = document.getElementById('deck');
    const animate = new PD.Animate();
    const deck = new PD.Deck(root, { animate });
    PD.registerSlides(deck);
    deck.init();
    global.deck = deck; // handy for debugging from the console
  }

  const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const timeout = new Promise((resolve) => setTimeout(resolve, 1500));
  Promise.race([ready, timeout]).then(start);
})(window);
