/* Prancheta FC — utilidades gerais
 * Tudo fica no objeto global PFC para funcionar até abrindo o index.html direto no navegador.
 */
window.PFC = window.PFC || {};
(function (P) {
  // Gerador de números aleatórios com semente (mulberry32): mesmo seed = mesmo banco de dados
  P.rng = function (seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  P.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  P.pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  P.gauss = (r) => {
    let u = 0, v = 0;
    while (!u) u = r();
    while (!v) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  P.shuffle = (r, arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  // Escolhe um item com probabilidade proporcional ao peso
  P.weighted = (r, items, wfn) => {
    let total = 0;
    const ws = items.map((it) => { const w = Math.max(0, wfn(it)); total += w; return w; });
    if (total <= 0) return items[Math.floor(r() * items.length)];
    let x = r() * total;
    for (let i = 0; i < items.length; i++) { x -= ws[i]; if (x <= 0) return items[i]; }
    return items[items.length - 1];
  };
  // Arredondamento probabilístico (0.3 vira 1 em 30% das vezes)
  P.sround = (r, v) => Math.floor(v) + (r() < v - Math.floor(v) ? 1 : 0);

  P.uid = (prefix) => prefix + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

  P.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  P.money = (n) => {
    if (n >= 1e6) return 'R$ ' + (n / 1e6).toFixed(1).replace('.', ',') + ' mi';
    if (n >= 1e3) return 'R$ ' + Math.round(n / 1e3) + ' mil';
    return 'R$ ' + Math.round(n);
  };

  // localStorage pode falhar (aba anônima, preview): nunca deixa o jogo quebrar por isso
  P.store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignora */ } }
  };

  P.clone = (o) => JSON.parse(JSON.stringify(o));
})(window.PFC);
