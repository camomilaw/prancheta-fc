/* Prancheta FC — características dos jogadores (como os traços do FM)
 * Cada jogador tem de 0 a 2 características, sorteadas pela posição e fixas
 * (a mesma semente para o mesmo jogador). Todas têm efeito no motor:
 * veja P.hasT nos pontos de engine.js, calendar.js e training.js.
 */
(function (P) {
  // pos: posições em que aparece mais (peso 3); nas outras, peso 1. gk: pode aparecer em goleiros.
  P.TRAITS = {
    pressao: { n: 'Lida bem sob pressão', d: 'Rende mais nos minutos finais de jogos apertados e cobra pênaltis com frieza na disputa.', gk: true, x: 'nervoso' },
    nervoso: { n: 'Sente a pressão', d: 'Rende menos nos minutos finais de jogos apertados e nas disputas de pênaltis.', gk: true, x: 'pressao', bad: true },
    lider: { n: 'Líder', d: 'Como capitão em campo, puxa o rendimento do time.', gk: true, pos: ['ZAG', 'VOL', 'MC'] },
    cabeca: { n: 'Forte no jogo aéreo', d: 'Mais perigoso nos escanteios e nos cabeceios.', pos: ['ZAG', 'ATA'] },
    longe: { n: 'Chuta de longe', d: 'Arrisca mais de fora da área e com mais perigo.', pos: ['MC', 'MEI', 'VOL', 'PD', 'PE'] },
    faltas: { n: 'Especialista em faltas', d: 'Cobranças de falta direta bem mais perigosas.', pos: ['MEI', 'MC', 'PD', 'PE', 'LE', 'LD'] },
    penal: { n: 'Frio nos pênaltis', d: 'Converte mais pênaltis.', pos: ['ATA', 'MEI', 'PD', 'PE'] },
    pegapen: { n: 'Pegador de pênaltis', d: 'Defende mais pênaltis.', gk: true, only: ['GOL'] },
    garcom: { n: 'Garçom', d: 'Dá mais assistências; nos escanteios, cruza com mais precisão.', pos: ['MEI', 'MC', 'PD', 'PE', 'LD', 'LE'] },
    decisivo: { n: 'Decisivo', d: 'Finaliza melhor a partir dos 75 minutos.', pos: ['ATA', 'MEI', 'PD', 'PE'] },
    temper: { n: 'Temperamental', d: 'Leva mais cartões.', gk: true, x: 'disc', bad: true },
    disc: { n: 'Disciplinado', d: 'Leva bem menos cartões.', gk: true, x: 'temper' },
    vidro: { n: 'Propenso a lesões', d: 'Se machuca com mais frequência.', gk: true, x: 'ferro', bad: true },
    ferro: { n: 'Resistente a lesões', d: 'Raramente se machuca.', gk: true, x: 'vidro' },
    prof: { n: 'Profissional', d: 'Evolui mais nos treinos.', gk: true },
    inconst: { n: 'Inconsistente', d: 'As notas oscilam bastante de um jogo para o outro.', gk: true, bad: true }
  };

  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function gen(p) {
    const r = P.rng(hash(String(p.id) + '|' + p.name));
    const x = r();
    const n = x < 0.38 ? 0 : x < 0.86 ? 1 : 2;
    const out = [];
    for (let k = 0; k < n; k++) {
      const pool = Object.entries(P.TRAITS).filter(([key, t]) =>
        !out.includes(key) && !(t.x && out.includes(t.x)) &&
        (p.pos === 'GOL' ? t.gk : !t.only) && (!t.only || t.only.includes(p.pos)));
      if (!pool.length) break;
      const [key] = P.weighted(r, pool, ([, t]) => (t.only ? 4 : t.pos && t.pos.includes(p.pos) ? 3 : 1) * (t.bad ? 0.8 : 1));
      out.push(key);
    }
    return out;
  }
  P.traitsOf = (p) => (p.tt || (p.tt = gen(p)));
  P.hasT = (p, k) => !!p && P.traitsOf(p).includes(k);

  // ---------- Telas ----------
  P.traitChips = (p, small) => P.traitsOf(p).map((k) => {
    const t = P.TRAITS[k]; if (!t) return '';
    return `<span class="trait ${t.bad ? 'bad' : ''}${small ? ' sm' : ''}" title="${P.esc(t.d)}">${P.esc(t.n)}</span>`;
  }).join('');
  P.traitsBlock = function (p) {
    const list = P.traitsOf(p);
    return `<div><div class="label" style="margin-bottom:6px">Características</div>${list.length
      ? `<div class="traits">${list.map((k) => { const t = P.TRAITS[k]; return `<div class="trait-row"><span class="trait ${t.bad ? 'bad' : ''}">${P.esc(t.n)}</span><small class="muted">${P.esc(t.d)}</small></div>`; }).join('')}</div>`
      : '<p class="muted" style="margin:0;font-size:.86rem">Nenhuma característica marcante.</p>'}</div>`;
  };
})(window.PFC);
