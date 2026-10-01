/* js/main.js — YA NO SE CARGA. index.html incluye core.js, ui.js, sections.js, gl.js y accordion.js como <script type="module">
   independientes (si uno falla al bajar, los demás siguen). Se conserva solo porque algunas herramientas de prueba lo copian;
   cargarlo daría el mismo resultado que antes (core → ui → sections), con la desventaja de que un fallo en cualquiera
   de los tres tumba a los otros. Ver js/CONTRATO.md, §0.13. */
import './core.js';
import './ui.js';
import './sections.js';
