/* Prancheta FC — Taça Raízes
 * Competição dos 40 clubes da 7ª e da 8ª divisão, para reforçar o caixa dos menores.
 * 8 grupos de 5 em turno único (cada clube faz 4 jogos, 2 em casa), os 2 primeiros
 * vão às oitavas; mata-mata em jogo único e final em campo neutro.
 * O campeão entra direto na 1ª fase da Copa Ultra do ano seguinte.
 */
(function (P) {
  P.RZ_DIVS = [7, 8];
  P.RZ_AFTER = [2, 6, 11, 16, 21, 26, 30, 33, 37]; // depois destas rodadas da liga (sem coincidir com a Copa Ultra)
  P.RZ_NAMES = ['Grupos · 1ª rodada', 'Grupos · 2ª rodada', 'Grupos · 3ª rodada', 'Grupos · 4ª rodada', 'Grupos · 5ª rodada', 'Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'];
  const GR = 5, KO0 = 5; // rodadas de grupo; índice da primeira fase de mata-mata
  Object.assign(P.ECON, {
    rzPart: 3e5,                        // por participar
    rzWin: 1.5e5, rzDraw: 5e4,          // por vitória/empate nos grupos
    rzKo: [3e5, 5e5, 8e5, 1.5e6]        // por vitória nas oitavas, quartas, semi e final
  });
  const LET = 'ABCDEFGH';
  const club = (g, cid) => P.club(g, cid);

  // Rodízio de 5 clubes: 5 rodadas de 2 jogos, cada clube folga uma vez e joga 2 em casa
  // (rodada k: folga o k; jogam os pares que somam 2k mod 5; manda quem tem o adversário 1 ou 2 posições à frente)
  const RR5 = [[[4, 1], [2, 3]], [[0, 2], [3, 4]], [[4, 0], [1, 3]], [[0, 1], [2, 4]], [[3, 0], [1, 2]]];

  function draw(g) {
    const ovrs = P.clubOvrs(g.db);
    const ids = g.db.clubs.filter((c) => P.RZ_DIVS.includes(c.div)).map((c) => c.id).sort((a, b) => ovrs[b] - ovrs[a]);
    const pots = [0, 1, 2, 3, 4].map((k) => P.shuffle(Math.random, ids.slice(k * 8, k * 8 + 8)));
    const groups = Array.from({ length: 8 }, (_, i) => ({ n: LET[i], ids: pots.map((pot) => pot[i]).filter(Boolean) }));
    for (const gr of groups) {
      gr.rounds = RR5.map((rd) => rd.filter(([h, a]) => gr.ids[h] && gr.ids[a]).map(([h, a]) => ({ h: gr.ids[h], a: gr.ids[a], done: false })));
    }
    g.rz = { season: g.season, groups, ko: [], w: null, ids };
    for (const cid of ids) P.pay(g, cid, P.ECON.rzPart, 'Premiação');
    const mine = groups.find((gr) => gr.ids.includes(g.user));
    if (mine) P.news(g, `Taça Raízes: seu time está no grupo ${mine.n} com ${mine.ids.filter((x) => x !== g.user).map((x) => club(g, x).name).join(', ')}. Os 2 primeiros vão às oitavas.`, 'good');
  }

  // Classificação de um grupo
  P.rzTable = function (g, gr) {
    const rows = {};
    for (const cid of gr.ids) rows[cid] = { cid, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 };
    for (const rd of gr.rounds) for (const m of rd) {
      if (!m.done) continue;
      const H = rows[m.h], Aw = rows[m.a];
      H.j++; Aw.j++; H.gp += m.hg; H.gc += m.ag; Aw.gp += m.ag; Aw.gc += m.hg;
      if (m.hg > m.ag) { H.v++; Aw.d++; H.pts += 3; } else if (m.hg < m.ag) { Aw.v++; H.d++; Aw.pts += 3; } else { H.e++; Aw.e++; H.pts++; Aw.pts++; }
    }
    const ovrs = P.clubOvrs(g.db);
    return Object.values(rows).sort((a, b) => b.pts - a.pts || (b.gp - b.gc) - (a.gp - a.gc) || b.gp - a.gp || b.v - a.v || (ovrs[b.cid] || 0) - (ovrs[a.cid] || 0));
  };

  function koDraw(g, r) {
    const k = r - KO0, z = g.rz;
    if (z.ko[k]) return;
    const ovrs = P.clubOvrs(g.db);
    const tie = (x, y, neutral) => Object.assign({ h: x, a: y, done: false }, neutral ? { neutral: true } : {});
    let ties = [];
    if (k === 0) {
      // oitavas: 1º de um grupo contra o 2º do grupo vizinho, em casa do 1º
      const tb = z.groups.map((gr) => P.rzTable(g, gr).map((x) => x.cid));
      for (let i = 0; i < 8; i += 2) { ties.push(tie(tb[i][0], tb[i + 1][1])); ties.push(tie(tb[i + 1][0], tb[i][1])); }
    } else {
      const prev = z.ko[k - 1].map((t) => t.w);
      for (let i = 0; i + 1 < prev.length; i += 2) {
        let [h, a] = [prev[i], prev[i + 1]];
        if ((ovrs[a] || 0) > (ovrs[h] || 0)) [h, a] = [a, h];
        ties.push(tie(h, a, r === P.RZ_NAMES.length - 1));
      }
    }
    z.ko[k] = ties;
  }

  // Jogos de uma rodada (sorteia na primeira)
  P.rzMatches = function (g, r) {
    if (!g.rz || g.rz.season !== g.season) { if (r !== 0) return []; draw(g); }
    if (r < GR) return g.rz.groups.flatMap((gr) => gr.rounds[r].map((m) => ({ m, ko: false, grp: gr.n })));
    koDraw(g, r);
    return g.rz.ko[r - KO0].map((m) => ({ m, ko: true }));
  };
  P.rzTies = (g) => (g.rz && g.rz.season === g.season ? g.rz.groups.flatMap((gr) => gr.rounds.flat()).concat(g.rz.ko.flat()) : []);

  // Depois de cada rodada: premiação e campeão
  P.rzWeek = function (g, step, results) {
    if (step.t !== 'rz') return;
    for (const { it } of results) {
      if (it.comp !== 'rz') continue;
      const m = it.m;
      if (step.r < GR) {
        if (m.hg === m.ag) { P.pay(g, m.h, P.ECON.rzDraw, 'Premiação'); P.pay(g, m.a, P.ECON.rzDraw, 'Premiação'); }
        else P.pay(g, m.hg > m.ag ? m.h : m.a, P.ECON.rzWin, 'Premiação');
      } else P.pay(g, m.w, P.ECON.rzKo[step.r - KO0], 'Premiação');
    }
    if (step.r === GR - 1) {
      const gr = g.rz.groups.find((x) => x.ids.includes(g.user));
      if (gr) {
        const pos = P.rzTable(g, gr).findIndex((x) => x.cid === g.user) + 1;
        P.news(g, pos <= 2 ? `Classificado às oitavas da Taça Raízes em ${pos}º lugar no grupo ${gr.n}!` : `Eliminado na fase de grupos da Taça Raízes (${pos}º no grupo ${gr.n}).`, pos <= 2 ? 'good' : 'bad');
      }
    }
    if (step.r === P.RZ_NAMES.length - 1) {
      const f = g.rz.ko[g.rz.ko.length - 1][0];
      g.rz.w = f.w;
      const c = club(g, f.w);
      c.rep = Math.min(99, Math.round((c.rep + 2) * 10) / 10);
      if (f.w === g.user && g.board) g.board.conf = P.clamp(g.board.conf + 6, 0, 100);
      P.news(g, f.w === g.user ? 'Campeão da Taça Raízes! No ano que vem o time entra direto na 1ª fase da Copa Ultra.' : `${c.name} é o campeão da Taça Raízes.`, f.w === g.user ? 'good' : '');
    }
  };

  // Fim de temporada: histórico e vaga direta na Copa Ultra seguinte
  P.rzSeasonEnd = function (g) {
    const z = g.rz;
    if (!z || z.season !== g.season || !z.w) return;
    g.rzHist = g.rzHist || [];
    const f = z.ko[z.ko.length - 1][0];
    g.rzHist.push({ season: g.season, w: z.w, f: f.w === f.h ? f.a : f.h });
    g.rzBye = z.w;
    const h = g.hist[g.hist.length - 1];
    if (h && h.season === g.season) { h.rz = club(g, z.w).name; h.rzMine = z.w === g.user; }
  };

  // Status do seu time (tela inicial)
  P.rzStatus = function (g) {
    const z = g.rz;
    if (!z || z.season !== g.season) return P.RZ_DIVS.includes((club(g, g.user) || {}).div) ? 'Aguardando' : null;
    if (!z.ids.includes(g.user)) return null;
    if (z.w === g.user) return 'Campeão';
    for (let k = z.ko.length - 1; k >= 0; k--) {
      const t = z.ko[k].find((m) => m.h === g.user || m.a === g.user);
      if (t) return t.done ? (t.w === g.user ? 'Classificado' : 'Eliminado') : P.RZ_NAMES[KO0 + k];
    }
    const gr = z.groups.find((x) => x.ids.includes(g.user));
    const pos = P.rzTable(g, gr).findIndex((x) => x.cid === g.user) + 1;
    const played = gr.rounds.flat().filter((m) => m.done).length;
    return played === gr.rounds.flat().length && pos > 2 ? 'Eliminado' : `Grupo ${gr.n} · ${pos}º`;
  };

  // ---------- Tela (aba na Tabela) ----------
  P.raizesView = function (g) {
    const A = P.app, esc = P.esc, st = A.st;
    const z = g.rz && g.rz.season === g.season ? g.rz : null;
    const total = P.ECON.rzPart + P.ECON.rzWin * 4 + P.ECON.rzKo.reduce((a, b) => a + b, 0);
    const intro = `<p class="muted" style="margin:0 0 12px;font-size:.88rem">Os 40 clubes da 7ª e da 8ª divisão em 8 grupos de 5 (turno único). Os 2 primeiros de cada grupo vão às oitavas; daí em diante é jogo único, com final em campo neutro. Participar rende ${P.money(P.ECON.rzPart)}, cada vitória nos grupos ${P.money(P.ECON.rzWin)}, e o campeão leva até ${P.money(total)} e entra direto na 1ª fase da Copa Ultra do ano seguinte.</p>`;
    if (!z) {
      const first = P.RZ_AFTER[0];
      return intro + `<p class="empty">O sorteio dos grupos acontece depois da rodada ${first} da liga.</p>${hist(g)}`;
    }
    const mineGr = z.groups.find((gr) => gr.ids.includes(g.user));
    const tab = st.rzTab || 'grp';
    const tabs = `<div class="seg tabs-x" style="margin-bottom:12px">${[['grp', 'Grupos'], ['ko', 'Mata-mata'], ['est', 'Estatísticas']].map(([k, n]) => `<button class="${tab === k ? 'on' : ''}" data-a="rzTab" data-k="${k}">${n}</button>`).join('')}</div>`;
    let body = '';
    if (tab === 'grp') {
      const order = mineGr ? [mineGr].concat(z.groups.filter((x) => x !== mineGr)) : z.groups;
      body = `<div class="rz-groups">${order.map((gr) => {
        const tb = P.rzTable(g, gr);
        return `<div class="rz-grp ${gr === mineGr ? 'mine' : ''}"><div class="label" style="margin-bottom:6px">Grupo ${gr.n}</div>
          <table class="tbl"><thead><tr><th class="n">#</th><th>Clube</th><th class="n">J</th><th class="n">SG</th><th class="n">P</th></tr></thead><tbody>
          ${tb.map((r, i) => { const c = club(g, r.cid); return `<tr class="${r.cid === g.user ? 'me' : ''}"><td class="n"><span class="zone ${i < 2 ? 'z1' : ''}">${i + 1}</span></td><td><span class="club">${P.badge(c, 18)}${esc(c.short)}<span class="nm-long"> ${esc(c.name)}</span></span></td><td class="n">${r.j}</td><td class="n">${r.gp - r.gc}</td><td class="n"><b>${r.pts}</b></td></tr>`; }).join('')}</tbody></table>
          ${gr === mineGr ? gr.rounds.map((rd, ri) => `<div class="label" style="margin:10px 0 4px">${ri + 1}ª rodada${rd.some((m) => m.h === g.user || m.a === g.user) ? '' : ' · seu time folga'}</div><div class="others" style="grid-template-columns:1fr">${rd.map((m) => (m.done ? A.ogRow(m, m.hg, m.ag, { click: !!m.ev, label: 'Taça Raízes · ' + P.RZ_NAMES[ri] }) : A.ogRow(m, '', ''))).join('')}</div>`).join('') : ''}</div>`;
      }).join('')}</div><div class="row legend" style="margin-top:8px"><span><span class="zone z1">&nbsp;</span> Classifica às oitavas</span></div>`;
    } else if (tab === 'ko') {
      body = z.ko.length ? z.ko.map((ties, k) => `<div class="label" style="margin:10px 0 6px">${P.RZ_NAMES[KO0 + k]}</div><div class="others">${ties.map((m) => m.done ? A.ogRow(m, m.hg, m.ag, { click: !!m.ev, pen: m.pen, label: 'Taça Raízes · ' + P.RZ_NAMES[KO0 + k] }) : A.ogRow(m, '', '')).join('')}</div>`).join('')
        + (z.w ? `<div class="winner" style="margin-top:12px">${P.badge(club(g, z.w), 40)}<div><span class="label">Campeão da Taça Raízes ${g.season}</span><h3>${esc(club(g, z.w).name)}</h3></div></div>` : '')
        : `<p class="empty">O mata-mata começa depois da fase de grupos (depois da rodada ${P.RZ_AFTER[KO0]} da liga).</p>`;
    } else {
      body = P.compStatsView ? P.compStatsView(g, 'rz', null, { minNote: 2 }) : '';
    }
    return intro + tabs + body + hist(g);
  };
  function hist(g) {
    const esc = P.esc, list = g.rzHist || [];
    if (!list.length) return '';
    return `<div class="label" style="margin:16px 0 6px">Campeões</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ano</th><th>Campeão</th><th class="hide-sm">Vice</th></tr></thead><tbody>
      ${list.slice().reverse().map((e) => { const w = club(g, e.w), f = club(g, e.f); return `<tr class="${e.w === g.user ? 'me' : ''}"><td>${e.season}</td><td><span class="club">${P.badge(w, 18)}${esc(w.name)}</span></td><td class="hide-sm">${f ? esc(f.name) : '-'}</td></tr>`; }).join('')}</tbody></table></div>`;
  }
  if (P.app && P.app.ACT) P.app.ACT.rzTab = function (d) { P.app.st.rzTab = d.k; P.app.render(); };
})(window.PFC);
