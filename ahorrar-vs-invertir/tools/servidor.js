// Servidor estático mínimo: la raíz es ahorrar-vs-invertir/ y /assets apunta a ../assets.
const http = require('http'), fs = require('fs'), path = require('path');
const RAIZ = path.resolve(__dirname, '..'), ASSETS = path.resolve(RAIZ, '../assets');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
module.exports = function servir(puerto = 0) {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const f = u.startsWith('/assets/') ? path.join(ASSETS, u.slice(8)) : path.join(RAIZ, u);
      if (!f.startsWith(RAIZ) && !f.startsWith(ASSETS)) { rsp.writeHead(403); return rsp.end(); }
      fs.readFile(f, (e, d) => {
        if (e) { rsp.writeHead(404); return rsp.end('404 ' + u); }
        rsp.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' }); rsp.end(d);
      });
    }).listen(puerto, '127.0.0.1', () => res({ srv, url: `http://127.0.0.1:${srv.address().port}` }));
  });
};
