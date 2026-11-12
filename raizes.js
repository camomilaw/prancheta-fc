/* Prancheta FC — copas por faixa de divisão
 * Três copas no mesmo formato, para reforçar o caixa e dar títulos fora da 1ª divisão:
 *   Copa Ascensão (3ª e 4ª) · Taça Travessia (5ª e 6ª) · Taça Raízes (7ª e 8ª)
 * 40 clubes em 8 grupos de 5 (turno único, cada clube faz 4 jogos, 2 em casa); os 2
 * primeiros vão às oitavas; mata-mata em jogo único e final em campo neutro.
 * As três usam as mesmas 9 datas (etapas 'rz' do calendário): cada clube só está numa.
 * O campeão entra direto na 1ª fase da Copa Ultra do ano seguinte (se já não entraria).
 */
(function (P) {
  // m = multiplicador da premiação base (a da Raízes), na proporção das cotas de TV das divisões
  P.TIERS = [
    { k: 'as', n: 'Copa Ascensão', short: 'Ascensão', divs: [3, 4], m: 5, rep: 3, color: '#7a5cc8' },
    { k: 'tv', n: 'Taça Travessia', short: 'Travessia', divs: [5, 6], m: 2.2, rep: 2, color: '#2f8f8a' },
    { k: 'rz', n: 'Taça Raízes', short: 'Raízes', divs: [7, 8], m: 1, rep: 2, color: '#b5763a' }
  ];
  P.TIER_KEYS = P.TIERS.map((t) => t.k);
  P.RZ_AFTER = [2, 6, 11, 16, 21, 26, 30, 33, 37]; // depois destas rodadas da liga (sem coincidir com a Copa Ultra)
  P.RZ_NAMES = ['Grupos · 1ª rodada', 'Grupos · 2ª rodada', 'Grupos · 3ª rodada', 'Grupos · 4ª rodada', 'Grupos · 5ª rodada', 'Oitavas de final', 'Quartas de final', 'Semifinal', 'Final'];
  const GR = 5, KO0 = 5; // rodadas de grupo; índice da primeira fase de mata-mata
  // premiação base (Taça Raízes); as outras copas multiplicam por m
  P.TIER_PRIZE = { part: 3e5, win: 1.5e5, draw: 5e4, ko: [3e5, 5e5, 8e5, 1.5e6] };
  const money = (v, m) => Math.round(v * m / 1e4) * 1e4;
  P.tierPrize = (t) => ({ part: money(P.TIER_PRIZE.part, t.m), win: money(P.TIER_PRIZE.win, t.m), draw: money(P.TIER_PRIZE.draw, t.m), ko: P.TIER_PRIZE.ko.map((v) => money(v, t.m)) });
  P.tierChampTotal = (t) => { const p = P.tierPrize(t); return p.part + p.win * 4 + p.ko.reduce((a, b) => a + b, 0); };
  const LET = 'ABCDEFGH';
  const club = (g, cid) => P.club(g, cid);
  P.tierByKey = (k) => P.TIERS.find((t) => t.k === k);
  P.tierOfDiv = (div) => P.TIERS.find((t) => t.divs.includes(div)) || null;
  const zOf = (g, k) => { const z = g.tz && g.tz[k]; return z && z.season === g.season ? z : null; };
  // Copa de um clube nesta temporada (pelo sorteio; antes dele, pela divisão)
  P.tierOf = function (g, cid) {
    cid = cid || g.user;
    let drawn = false;
    for (const t of P.TIERS) { const z = zOf(g, t.k); if (z) { drawn = true; if (z.ids.includes(cid)) return t; } }
    return drawn ? null : P.tierOfDiv((club(g, cid) || {}).div);
  };

  // Rodízio de 5 clubes: 5 rodadas de 2 jogos, cada clube folga uma vez e joga 2 em casa
  // (rodada k: folga o k; jogam os pares que somam 2k mod 5; manda quem tem o adversário 1 ou 2 posições à frente)
  const RR5 = [[[4, 1], [2, 3]], [[0, 2], [3, 4]], [[4, 0], [1, 3]], [[0, 1], [2, 4]], [[3, 0], [1, 2]]];

  function draw(g, t) {
    const ovrs = P.clubOvrs(g.db);
    const ids = g.db.clubs.filter((c) => t.divs.includes(c.div)).map((c) => c.id).sort((a, b) => ovrs[b] - ovrs[a]);
    const pots = [0, 1, 2, 3, 4].map((k) => P.shuffle(Math.random, ids.slice(k * 8, k * 8 + 8)));
    const groups = Array.from({ length: 8 }, (_, i) => ({ n: LET[i], ids: pots.map((pot) => pot[i]).filter(Boolean) }));
    for (const gr of groups) gr.rounds = RR5.map((rd) => rd.filter(([h, a]) => gr.ids[h] && gr.ids[a]).map(([h, a]) => ({ h: gr.ids[h], a: gr.ids[a], done: false })));
    g.tz = g.tz || {};
    g.tz[t.k] = { season: g.season, groups, ko: [], w: null, ids };
    const pr = P.tierPrize(t);
    for (const cid of ids) P.pay(g, cid, pr.part, 'Premiação');
    const mine = groups.find((gr) => gr.ids.includes(g.user));
    if (mine) P.news(g, `${t.n}: seu time está no grupo ${mine.n} com ${mine.ids.filter((x) => x !== g.user).map((x) => club(g, x).name).join(', ')}. Os 2 primeiros vão às oitavas.`, 'good');
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

  function koDraw(g, z, r) {
    const k = r - KO0;
    if (z.ko[k]) return;
    const ovrs = P.clubOvrs(g.db);
    const tie = (x, y, neutral) => Object.assign({ h: x, a: y, done: false }, neutral ? { neutral: true } : {});
    const ties = [];
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

  // Jogos de uma data, das três copas (sorteiam na primeira data; copa sem sorteio fica de fora no ano)
  P.rzMatches = function (g, r) {
    const out = [];
    for (const t of P.TIERS) {
      let z = zOf(g, t.k);
      if (!z) { if (r !== 0) continue; draw(g, t); z = zOf(g, t.k); }
      if (r < GR) z.groups.forEach((gr) => gr.rounds[r].forEach((m) => out.push({ m, ko: false, comp: t.k })));
      else { koDraw(g, z, r); z.ko[r - KO0].forEach((m) => out.push({ m, ko: true, comp: t.k })); }
    }
    return out;
  };
  P.rzTies = (g) => P.TIERS.flatMap((t) => { const z = zOf(g, t.k); return z ? z.groups.flatMap((gr) => gr.rounds.flat()).concat(z.ko.flat()) : []; });
  P.rzReady = (g, r) => P.TIERS.some((t) => { const z = zOf(g, t.k); return z && (r < GR || z.ko[r - KO0]); });
  P.tierLabel = function (step) {
    const g = P.app && P.app.g, t = g ? P.tierOf(g) : null;
    return (t ? t.n : 'Copas regionais') + ' · ' + P.RZ_NAMES[step.r];
  };

  // Depois de cada data: premiação e campeões
  P.rzWeek = function (g, step, results) {
    if (step.t !== 'rz') return;
    for (const { it } of results) {
      const t = P.tierByKey(it.comp); if (!t) continue;
      const m = it.m, pr = P.tierPrize(t);
      if (step.r < GR) {
        if (m.hg === m.ag) { P.pay(g, m.h, pr.draw, 'Premiação'); P.pay(g, m.a, pr.draw, 'Premiação'); }
        else P.pay(g, m.hg > m.ag ? m.h : m.a, pr.win, 'Premiação');
      } else P.pay(g, m.w, pr.ko[step.r - KO0], 'Premiação');
    }
    const mt = P.tierOf(g), mz = mt && zOf(g, mt.k);
    if (step.r === GR - 1 && mz) {
      const gr = mz.groups.find((x) => x.ids.includes(g.user));
      if (gr) {
        const pos = P.rzTable(g, gr).findIndex((x) => x.cid === g.user) + 1;
        P.news(g, pos <= 2 ? `Classificado às oitavas da ${mt.n} em ${pos}º lugar no grupo ${gr.n}!` : `Eliminado na fase de grupos da ${mt.n} (${pos}º no grupo ${gr.n}).`, pos <= 2 ? 'good' : 'bad');
      }
    }
    if (step.r === P.RZ_NAMES.length - 1) {
      for (const t of P.TIERS) {
        const z = zOf(g, t.k); if (!z || !z.ko[z.ko.length - 1]) continue;
        const f = z.ko[z.ko.length - 1][0];
        z.w = f.w;
        const c = club(g, f.w);
        c.rep = Math.min(99, Math.round((c.rep + t.rep) * 10) / 10);
        if (f.w === g.user && g.board) g.board.conf = P.clamp(g.board.conf + 6, 0, 100);
        if (f.w === g.user) P.news(g, `Campeão da ${t.n}! No ano que vem o time entra direto na 1ª fase da Copa Ultra.`, 'good');
        else if (mt === t) P.news(g, `${c.name} é o campeão da ${t.n}.`, '');
      }
    }
  };

  // Fim de temporada: histórico e vaga direta na Copa Ultra seguinte
  P.rzSeasonEnd = function (g) {
    g.tzHist = g.tzHist || {};
    g.tierByes = [];
    const h = g.hist[g.hist.length - 1];
    for (const t of P.TIERS) {
      const z = zOf(g, t.k);
      if (!z || !z.w) continue;
      const f = z.ko[z.ko.length - 1][0];
      (g.tzHist[t.k] = g.tzHist[t.k] || []).push({ season: g.season, w: z.w, f: f.w === f.h ? f.a : f.h });
      g.tierByes.push(z.w);
      if (h && h.season === g.season) {
        h.tz = h.tz || {}; h.tz[t.k] = club(g, z.w).name;
        if (z.w === g.user) h.tzMine = t.k;
      }
    }
  };

  // Saves da versão que só tinha a Taça Raízes
  P.ensureTiers = function (g) {
    if (g.rz) { g.tz = g.tz || {}; if (!g.tz.rz) g.tz.rz = g.rz; delete g.rz; }
    if (g.rzHist) { g.tzHist = g.tzHist || {}; g.tzHist.rz = (g.tzHist.rz || []).concat(g.rzHist); delete g.rzHist; }
    if (g.rzBye) { g.tierByes = (g.tierByes || []).concat([g.rzBye]); delete g.rzBye; }
    for (const h of g.hist || []) if (h.rz && !h.tz) { h.tz = { rz: h.rz }; if (h.rzMine) h.tzMine = 'rz'; delete h.rz; delete h.rzMine; }
  };

  // Status do seu time (tela inicial)
  P.rzStatus = function (g) {
    const t = P.tierOf(g); if (!t) return null;
    const z = zOf(g, t.k);
    if (!z) return 'Aguardando';
    if (z.w === g.user) return 'Campeão';
    for (let k = z.ko.length - 1; k >= 0; k--) {
      const m = z.ko[k].find((x) => x.h === g.user || x.a === g.user);
      if (m) return m.done ? (m.w === g.user ? 'Classificado' : 'Eliminado') : P.RZ_NAMES[KO0 + k];
    }
    const gr = z.groups.find((x) => x.ids.includes(g.user));
    const pos = P.rzTable(g, gr).findIndex((x) => x.cid === g.user) + 1;
    const played = gr.rounds.flat().filter((m) => m.done).length;
    return played === gr.rounds.flat().length && pos > 2 ? 'Eliminado' : `Grupo ${gr.n} · ${pos}º`;
  };
  P.rzStatusName = (g) => { const t = P.tierOf(g); return t ? t.n : ''; };

  // ---------- Tela (aba na Tabela) ----------
  P.raizesView = function (g) {
    const A = P.app, esc = P.esc, st = A.st;
    const mt = P.tierOf(g);
    const t = P.tierByKey(st.tierK) || mt || P.TIERS[0];
    const z = zOf(g, t.k), pr = P.tierPrize(t);
    const pick = `<div class="seg tabs-x tier-pick" style="margin-bottom:12px">${P.TIERS.map((x) => `<button class="${x === t ? 'on' : ''}" data-a="tierK" data-k="${x.k}"><i class="lg-dot" style="background:${x.color}"></i>${esc(x.n)} <small class="muted">${x.divs[0]}ª e ${x.divs[1]}ª</small></button>`).join('')}</div>`;
    const intro = `<p class="muted" style="margin:0 0 12px;font-size:.88rem">Os 40 clubes da ${t.divs[0]}ª e da ${t.divs[1]}ª divisão em 8 grupos de 5 (turno único). Os 2 primeiros de cada grupo vão às oitavas; daí em diante é jogo único, com final em campo neutro. Participar rende ${P.money(pr.part)}, cada vitória nos grupos ${P.money(pr.win)}, e o campeão leva até ${P.money(P.tierChampTotal(t))} e entra direto na 1ª fase da Copa Ultra do ano seguinte.</p>`;
    if (!z) {
      const started = P.TIERS.some((x) => zOf(g, x.k));
      return pick + intro + `<p class="empty">${started ? 'Esta copa começa na próxima temporada.' : `O sorteio dos grupos acontece depois da rodada ${P.RZ_AFTER[0]} da liga.`}</p>${hist(g, t)}`;
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
          ${gr === mineGr ? gr.rounds.map((rd, ri) => `<div class="label" style="margin:10px 0 4px">${ri + 1}ª rodada${rd.some((m) => m.h === g.user || m.a === g.user) ? '' : ' · seu time folga'}</div><div class="others" style="grid-template-columns:1fr">${rd.map((m) => (m.done ? A.ogRow(m, m.hg, m.ag, { click: !!m.ev, label: t.n + ' · ' + P.RZ_NAMES[ri] }) : A.ogRow(m, '', ''))).join('')}</div>`).join('') : ''}</div>`;
      }).join('')}</div><div class="row legend" style="margin-top:8px"><span><span class="zone z1">&nbsp;</span> Classifica às oitavas</span></div>`;
    } else if (tab === 'ko') {
      body = z.ko.length ? z.ko.map((ties, k) => `<div class="label" style="margin:10px 0 6px">${P.RZ_NAMES[KO0 + k]}</div><div class="others">${ties.map((m) => m.done ? A.ogRow(m, m.hg, m.ag, { click: !!m.ev, pen: m.pen, label: t.n + ' · ' + P.RZ_NAMES[KO0 + k] }) : A.ogRow(m, '', '')).join('')}</div>`).join('')
        + (z.w ? `<div class="winner" style="margin-top:12px">${P.badge(club(g, z.w), 40)}<div><span class="label">Campeão da ${esc(t.n)} ${g.season}</span><h3>${esc(club(g, z.w).name)}</h3></div></div>` : '')
        : `<p class="empty">O mata-mata começa depois da fase de grupos (depois da rodada ${P.RZ_AFTER[KO0]} da liga).</p>`;
    } else {
      body = P.compStatsView ? P.compStatsView(g, t.k, null, { minNote: 2 }) : '';
    }
    return pick + intro + tabs + body + hist(g, t);
  };
  function hist(g, t) {
    const esc = P.esc, list = (g.tzHist && g.tzHist[t.k]) || [];
    if (!list.length) return '';
    return `<div class="label" style="margin:16px 0 6px">Campeões</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ano</th><th>Campeão</th><th class="hide-sm">Vice</th></tr></thead><tbody>
      ${list.slice().reverse().map((e) => { const w = club(g, e.w), f = club(g, e.f); return `<tr class="${e.w === g.user ? 'me' : ''}"><td>${e.season}</td><td><span class="club">${P.badge(w, 18)}${esc(w.name)}</span></td><td class="hide-sm">${f ? esc(f.name) : '-'}</td></tr>`; }).join('')}</tbody></table></div>`;
  }
  if (P.app && P.app.ACT) Object.assign(P.app.ACT, {
    rzTab(d) { P.app.st.rzTab = d.k; P.app.render(); },
    tierK(d) { P.app.st.tierK = d.k; P.app.st.rzTab = 'grp'; P.app.render(); }
  });
})(window.PFC);
