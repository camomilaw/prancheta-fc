/* Prancheta FC — Supercopa Ultra
 * A cada 4 temporadas, no fim da 4ª, os 4 campeões da Ultraliga e os 4 campeões da
 * Copa Ultra do ciclo disputam quartas, semifinal e final em jogo único.
 * Se o campeão já está classificado, a vaga passa para o próximo colocado
 * (vice e 3º da liga; vice e semifinalistas da copa).
 * Maior premiação do jogo e estádio sempre cheio.
 */
(function (P) {
  P.SC_FIRST = 2027;      // primeira temporada do primeiro ciclo
  P.SC_EVERY = 4;         // a Supercopa acontece no fim da 4ª temporada
  P.SC_NAMES = ['Quartas de final', 'Semifinal', 'Final'];
  Object.assign(P.ECON, {
    scPart: 6e6,                     // por participar
    scPrize: [10e6, 20e6, 40e6],     // por vitória em cada fase (campeão leva 76 mi no total)
    scTicket: 2.5                    // ingresso mais caro: jogo de maior prestígio, estádio cheio
  });

  const club = (g, cid) => P.club(g, cid);
  const S = (g) => (g.scup = g.scup || { recs: {}, eds: [], cur: null });

  // Esta temporada termina com Supercopa?
  P.scSeason = (g) => (g.season - P.SC_FIRST) % P.SC_EVERY === P.SC_EVERY - 1;
  P.scNextSeason = (g) => g.season + ((P.SC_EVERY - 1 - (g.season - P.SC_FIRST) % P.SC_EVERY) + P.SC_EVERY) % P.SC_EVERY;
  P.scCycle = (scSeason) => Array.from({ length: P.SC_EVERY }, (_, i) => scSeason - P.SC_EVERY + 1 + i);

  // Guarda a 1ª divisão e a campanha da copa da temporada atual
  function record(g) {
    const s = S(g);
    const cupR = g.cup.rounds || [];
    const fin = cupR[P.CUP_NAMES.length - 1], semi = cupR[P.CUP_NAMES.length - 2];
    const cup = [];
    if (fin && fin.ties[0] && fin.ties[0].done) {
      const f = fin.ties[0];
      cup.push(f.w, f.w === f.h ? f.a : f.h);
      if (semi) semi.ties.forEach((t) => { if (t.done) cup.push(t.w === t.h ? t.a : t.h); });
    }
    s.recs[g.season] = { lg: P.table(g, 1).map((x) => x.cid), cup };
    for (const k of Object.keys(s.recs)) if (Number(k) < g.season - P.SC_EVERY) delete s.recs[k];
  }

  // Saves antigos: sem registro, usa os nomes do histórico
  function recOf(g, season) {
    const s = S(g);
    if (s.recs[season]) return s.recs[season];
    const h = (g.hist || []).find((x) => x.season === season);
    if (!h) return null;
    const byName = (n) => { const c = g.db.clubs.find((x) => x.name === n); return c ? c.id : null; };
    const lg = [byName(h.champ)].filter(Boolean), cup = [byName(h.cup)].filter(Boolean);
    return { lg, cup, partial: true };
  }

  const ord = (n) => n + 'º';
  // Os 8 classificados do ciclo. Temporadas ainda sem resultado viram "a definir".
  P.scQualifiers = function (g, scSeason) {
    scSeason = scSeason || P.scNextSeason(g);
    const q = [], taken = new Set();
    const fallback = [];
    const put = (cid, why, info) => { q.push({ cid, why, info }); if (cid) taken.add(cid); };
    for (const season of P.scCycle(scSeason)) {
      const rec = recOf(g, season);
      if (!rec) { put(null, `Campeão da Ultraliga ${season}`); put(null, `Campeão da Copa Ultra ${season}`); continue; }
      fallback.push({ season, lg: rec.lg });
      const sh = (cid) => (club(g, cid) ? club(g, cid).short : '?');
      const late = rec.partial ? 'campeão já classificado; a vaga vai para o melhor da 1ª divisão no sorteio' : '';
      // Ultraliga: campeão, ou o próximo colocado ainda sem vaga
      const li = rec.lg.findIndex((cid) => !taken.has(cid));
      if (li < 0) put(null, `Vaga da Ultraliga ${season}`, late);
      else put(rec.lg[li], `${li === 0 ? 'Campeão' : li === 1 ? 'Vice' : ord(li + 1)} da Ultraliga ${season}`, li ? `no lugar de ${sh(rec.lg[0])}, já classificado` : '');
      // Copa Ultra: campeão, vice, semifinalistas; sem nenhum livre, o próximo da Ultraliga daquele ano
      const ci = rec.cup.findIndex((cid) => !taken.has(cid));
      const lj = rec.lg.findIndex((cid) => !taken.has(cid));
      if (ci >= 0) put(rec.cup[ci], `${['Campeão', 'Vice', 'Semifinalista', 'Semifinalista'][ci]} da Copa Ultra ${season}`, ci ? `no lugar de ${sh(rec.cup[0])}, já classificado` : '');
      else if (!rec.partial && lj >= 0) put(rec.lg[lj], `${ord(lj + 1)} da Ultraliga ${season}`, `vaga da Copa Ultra ${season}: finalistas já classificados`);
      else put(null, `Vaga da Copa Ultra ${season}`, late);
    }
    return q;
  };

  // Sorteio e chaveamento
  const better = (g, ovrs, x, y) => {
    const a = club(g, x), b = club(g, y);
    return a.div !== b.div ? a.div < b.div : (ovrs[x] || 0) >= (ovrs[y] || 0);
  };
  const tie = (g, ovrs, x, y, neutral) => {
    const [h, a] = better(g, ovrs, x, y) ? [x, y] : [y, x];
    return Object.assign({ h, a, done: false }, neutral ? { neutral: true } : {});
  };
  P.scDraw = function (g, r) {
    const s = S(g);
    if (s.cur && s.cur.season === g.season && (s.cur.rounds[r] || s.cur.archived)) return;
    const ovrs = P.clubOvrs(g.db);
    if (r === 0) {
      record(g);
      let q = P.scQualifiers(g, g.season);
      // vaga sem dono (save antigo sem histórico): melhores da 1ª divisão atual
      const taken = new Set(q.map((x) => x.cid).filter(Boolean));
      const tb = P.table(g, 1).map((x) => x.cid).filter((cid) => !taken.has(cid));
      q = q.map((x) => (x.cid ? x : (taken.add(tb[0]), { cid: tb.shift(), why: x.why, info: 'vaga sem dono, entrou o melhor da 1ª divisão' })));
      const pool = P.shuffle(Math.random, q.map((x) => x.cid));
      const ties = [];
      for (let i = 0; i < 8; i += 2) ties.push(tie(g, ovrs, pool[i], pool[i + 1]));
      s.cur = { season: g.season, q, rounds: [{ name: P.SC_NAMES[0], ties }], w: null, gls: {} };
      for (const x of q) P.pay(g, x.cid, P.ECON.scPart, 'Premiação');
      const mine = q.find((x) => x.cid === g.user);
      P.news(g, mine
        ? `Seu time está na Supercopa Ultra! Vaga: ${mine.why}. Só a participação rende ${P.money(P.ECON.scPart)}, e o campeão leva até ${P.money(P.ECON.scPart + P.ECON.scPrize.reduce((a, b) => a + b, 0))}.`
        : `Sorteada a Supercopa Ultra ${g.season}: ${q.map((x) => club(g, x.cid).short).join(', ')}.`, mine ? 'good' : '');
      return;
    }
    const prev = s.cur.rounds[r - 1].ties.map((t) => t.w);
    const ties = [];
    for (let i = 0; i + 1 < prev.length; i += 2) ties.push(tie(g, ovrs, prev[i], prev[i + 1], r === P.SC_NAMES.length - 1));
    s.cur.rounds[r] = { name: P.SC_NAMES[r], ties };
  };
  P.scMatches = (g, r) => { P.scDraw(g, r); const c = S(g).cur; return (c && c.season === g.season && c.rounds[r]) ? c.rounds[r].ties : []; };
  // Todos os jogos da Supercopa desta temporada (para estatísticas)
  P.scTies = (g) => (g.scup && g.scup.cur && g.scup.cur.season === g.season ? g.scup.cur.rounds.flatMap((r) => r.ties) : []);

  // Depois de cada semana da Supercopa: premiação, artilharia e campeão
  P.scWeek = function (g, step, results) {
    if (step.t !== 'sc') return;
    const cur = S(g).cur;
    for (const { it, r } of results) {
      if (it.comp !== 'sc') continue;
      P.pay(g, it.m.w, P.ECON.scPrize[step.r], 'Premiação');
      for (const e of r.ev) if (e.t === 'gol') cur.gls[e.p] = (cur.gls[e.p] || 0) + 1;
    }
    if (step.r !== P.SC_NAMES.length - 1) return;
    const f = cur.rounds[step.r].ties[0];
    cur.w = f.w;
    const vice = f.w === f.h ? f.a : f.h;
    const wc = club(g, f.w), vc = club(g, vice);
    wc.rep = Math.min(99, Math.round((wc.rep + 3) * 10) / 10);
    vc.rep = Math.min(99, Math.round((vc.rep + 1) * 10) / 10);
    if (f.w === g.user && g.board) g.board.conf = P.clamp(g.board.conf + 12, 0, 100);
    P.news(g, f.w === g.user
      ? `Campeão da Supercopa Ultra! O título mais importante do futebol, e a reputação do clube sobe.`
      : `${wc.name} é o campeão da Supercopa Ultra ${g.season}, vencendo o ${vc.name} na final.`, f.w === g.user ? 'good' : '');
  };

  // Fim de temporada: registra o ano e arquiva a edição (chamado depois do histórico)
  P.scSeasonEnd = function (g) {
    record(g);
    const s = S(g), cur = s.cur;
    if (!cur || cur.season !== g.season) return;
    const fin = cur.rounds[P.SC_NAMES.length - 1] && cur.rounds[P.SC_NAMES.length - 1].ties[0];
    const slim = (t) => ({ h: t.h, a: t.a, hg: t.hg, ag: t.ag, pen: t.pen || null, w: t.w, neutral: t.neutral || false, done: t.done });
    const topG = Object.entries(cur.gls).sort((a, b) => b[1] - a[1])[0];
    const tp = topG && g.db.players[topG[0]];
    s.eds.push({
      season: cur.season, q: cur.q, w: cur.w, f: fin ? (fin.w === fin.h ? fin.a : fin.h) : null,
      rounds: cur.rounds.map((r) => ({ name: r.name, ties: r.ties.map(slim) })),
      top: tp ? `${tp.name} (${topG[1]})` : null
    });
    const h = g.hist[g.hist.length - 1];
    if (h && h.season === g.season && cur.w) {
      h.sc = club(g, cur.w).name;
      h.scMine = cur.w === g.user;
      if (h.scMine) h.result += ' · Supercopa';
    }
    if (g.summary) g.summary.sc = cur.w;
    cur.archived = true; // fica até a virada, para as telas da temporada encerrada
  };

  // Saves antigos: temporada de Supercopa já montada sem as datas dela
  P.ensureSuper = function (g) {
    S(g);
    if (g.over || !g.cal || !P.scSeason(g) || g.cal.some((x) => x.t === 'sc')) return;
    P.SC_NAMES.forEach((_, r) => g.cal.push({ t: 'sc', r }));
  };

  // Aviso no começo da temporada da Supercopa
  const prevNew = P.clubNewSeason;
  P.clubNewSeason = function (g) {
    if (prevNew) prevNew(g);
    const s = S(g); if (s.cur && s.cur.season < g.season) s.cur = null;
    if (P.scSeason(g)) P.news(g, `Ano de Supercopa Ultra! No fim desta temporada, os campeões da Ultraliga e da Copa Ultra de ${g.season - 3} a ${g.season} disputam o maior prêmio do futebol.`, 'good');
  };

  // Status do seu time (tela inicial)
  P.scStatus = function (g) {
    const cur = g.scup && g.scup.cur;
    if (cur && cur.season === g.season) {
      if (!cur.q.some((x) => x.cid === g.user)) return 'Fora';
      if (cur.w === g.user) return 'Campeão';
      for (let r = cur.rounds.length - 1; r >= 0; r--) {
        const t = cur.rounds[r].ties.find((m) => m.h === g.user || m.a === g.user);
        if (t) return t.done ? (t.w === g.user ? 'Classificado' : 'Eliminado') : P.SC_NAMES[r];
      }
    }
    const q = P.scQualifiers(g);
    return q.some((x) => x.cid === g.user) ? 'Classificado' : 'Na disputa';
  };

  // ---------- Tela ----------
  P.superView = function (g) {
    const A = P.app, esc = P.esc;
    const s = S(g), cur = s.cur && s.cur.season === g.season ? s.cur : null;
    const next = P.scNextSeason(g);
    const ed = cur || (g.over && s.eds.length && s.eds[s.eds.length - 1].season === g.season ? s.eds[s.eds.length - 1] : null);
    const total = P.ECON.scPart + P.ECON.scPrize.reduce((a, b) => a + b, 0);
    const intro = `<p class="muted" style="margin:0 0 12px;font-size:.88rem">A cada 4 anos, no fim da temporada, os campeões da Ultraliga e da Copa Ultra do ciclo se enfrentam em quartas, semifinal e final, em jogo único e com estádio cheio. Se um campeão já tem vaga, ela vai para o vice ou o 3º. Participar rende ${P.money(P.ECON.scPart)}; o campeão leva ${P.money(total)}.</p>`;
    const qRow = (x) => {
      const c = x.cid && club(g, x.cid);
      return `<div class="sc-q ${x.cid === g.user ? 'me' : ''}">${c ? P.badge(c, 22) : '<span class="sc-tbd">?</span>'}
        <span class="nm"><b>${c ? esc(c.name) : 'A definir'}</b><small>${esc(x.why)}${x.info ? ' · ' + esc(x.info) : ''}</small></span></div>`;
    };
    let body = '';
    if (ed) {
      body += ed.w ? `<div class="winner">${P.badge(club(g, ed.w), 40)}<div><span class="label">Campeão da Supercopa ${ed.season}</span><h3>${esc(club(g, ed.w).name)}</h3></div></div>` : '';
      body += ed.rounds.map((r) => `<div class="label" style="margin:10px 0 6px">${r.name}</div><div class="others">${r.ties.map((m) => m.done ? A.ogRow(m, m.hg, m.ag, { click: !!m.ev, pen: m.pen, label: 'Supercopa · ' + r.name }) : A.ogRow(m, '', '')).join('')}</div>`).join('');
      if (cur && cur.rounds[0].ties.some((t) => t.done)) body += P.compStatsView(g, 'sc', null, { title: 'Estatísticas da Supercopa', n: 10 });
      else if (!cur && ed.top) body += `<p class="muted" style="margin:12px 0 0">Artilheiro: <b>${esc(ed.top)}</b></p>`;
      body += `<div class="label" style="margin:14px 0 6px">Classificados</div><div class="sc-qs">${ed.q.map(qRow).join('')}</div>`;
    } else {
      const q = P.scQualifiers(g, next);
      const done = q.filter((x) => x.cid).length;
      body += `<div class="kv" style="margin-bottom:12px"><div><span class="label">Próxima edição</span><b>Fim de ${next}</b></div><div><span class="label">Vagas definidas</span><b>${done} de 8</b></div><div><span class="label">Seu time</span><b style="font-size:1rem">${esc(P.scStatus(g))}</b></div></div>
        <div class="label" style="margin-bottom:6px">Classificados do ciclo ${next - 3}–${next}</div><div class="sc-qs">${q.map(qRow).join('')}</div>`;
    }
    if (s.eds.length) {
      body += `<div class="label" style="margin:16px 0 6px">Campeões</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ano</th><th>Campeão</th><th class="hide-sm">Vice</th><th class="hide-sm">Artilheiro</th></tr></thead><tbody>
        ${s.eds.slice().reverse().map((e) => { const w = club(g, e.w), f = e.f && club(g, e.f); return `<tr class="${e.w === g.user ? 'me' : ''}"><td>${e.season}</td><td><span class="club">${P.badge(w, 18)}${esc(w.name)}</span></td><td class="hide-sm">${f ? esc(f.name) : '-'}</td><td class="hide-sm">${esc(e.top || '-')}</td></tr>`; }).join('')}</tbody></table></div>`;
    }
    return intro + body;
  };
})(window.PFC);
