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
    inconst: { n: 'Inconsistente', d: 'As notas oscilam bastante de um jogo para o outro.', gk: true, bad: true },
    // ---- novas (v2) ----
    drible: { n: 'Driblador nato', d: 'Parte para cima e ajuda o time a criar mais chances claras.', pos: ['PD', 'PE', 'MEI', 'ATA'], v: 2 },
    lanca: { n: 'Lançador', d: 'Acha passes longos; dá mais assistências.', pos: ['VOL', 'MC', 'ZAG', 'MEI'], v: 2 },
    cruzador: { n: 'Cruzador', d: 'Cruza muito bem: escanteios e cruzamentos mais perigosos.', pos: ['LD', 'LE', 'PD', 'PE'], v: 2 },
    matador: { n: 'Matador', d: 'Converte mais as chances claras.', pos: ['ATA'], x: 'afobado', v: 2 },
    pivo: { n: 'Pivô', d: 'Segura a bola de costas e serve os companheiros.', pos: ['ATA'], v: 2 },
    oport: { n: 'Oportunista', d: 'Está sempre no lugar certo nas chances claras.', pos: ['ATA', 'MEI', 'PD', 'PE'], v: 2 },
    veloz: { n: 'Velocista', d: 'Explora a velocidade; muito perigoso contra defesas de linha alta.', pos: ['PD', 'PE', 'ATA', 'LD', 'LE'], v: 2 },
    incans: { n: 'Incansável', d: 'Cansa bem menos nas partidas.', gk: false, pos: ['VOL', 'MC', 'LD', 'LE', 'PD', 'PE'], x: 'pregui', v: 2 },
    fisico: { n: 'Físico imponente', d: 'Ganha as divididas e o jogo aéreo no corpo.', pos: ['ZAG', 'VOL', 'ATA'], v: 2 },
    leitura: { n: 'Lê o jogo', d: 'Antecipa as jogadas: corta muito mais ataques.', pos: ['ZAG', 'VOL', 'LD', 'LE', 'MC'], x: 'desat', v: 2 },
    raca: { n: 'Raçudo', d: 'Briga por toda bola; desarma mais e não se abate na derrota.', gk: true, pos: ['VOL', 'MC', 'ZAG', 'LD', 'LE'], v: 2 },
    visao: { n: 'Visionário', d: 'Enxerga o passe que ninguém vê; muitas assistências.', pos: ['MEI', 'MC', 'VOL'], v: 2 },
    vestiario: { n: 'Líder de vestiário', d: 'Segura o ânimo do elenco depois das derrotas.', gk: true, pos: ['ZAG', 'VOL', 'MC', 'GOL'], v: 2 },
    polival: { n: 'Polivalente', d: 'Aprende novas posições bem mais rápido.', gk: false, v: 2 },
    estrela: { n: 'Estrela', d: 'Fica chateado no banco: a moral cai se não jogar.', gk: true, bad: true, v: 2 },
    pregui: { n: 'Preguiçoso', d: 'Não volta para marcar: rende menos na defesa.', pos: ['ATA', 'MEI', 'PD', 'PE'], x: 'incans', bad: true, v: 2 },
    afobado: { n: 'Afobado', d: 'Chuta demais e erra as chances claras.', pos: ['ATA', 'PD', 'PE', 'MEI'], x: 'matador', bad: true, v: 2 },
    desat: { n: 'Desatento', d: 'Se perde na marcação e corta menos ataques.', pos: ['ZAG', 'LD', 'LE', 'VOL'], x: 'leitura', bad: true, v: 2 }
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
  // Jogadores que já existiam ganham, às vezes, uma das características novas (uma vez só)
  function upgrade(p) {
    p.ttv = 2;
    if (p.tt.length >= 2) return;
    const r = P.rng(hash(String(p.id) + '|v2|' + p.name));
    if (r() > 0.42) return;
    const pool = Object.entries(P.TRAITS).filter(([key, t]) => t.v === 2 && !p.tt.includes(key) && !(t.x && p.tt.includes(t.x)) && (p.pos === 'GOL' ? t.gk : !t.only) && (!t.only || t.only.includes(p.pos)));
    if (!pool.length) return;
    const [key] = P.weighted(r, pool, ([, t]) => (t.pos && t.pos.includes(p.pos) ? 3 : 1) * (t.bad ? 0.8 : 1));
    p.tt.push(key);
  }
  P.traitsOf = (p) => { if (!p.tt) { p.tt = gen(p); p.ttv = 2; } else if (p.ttv !== 2) upgrade(p); return p.tt; };
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
