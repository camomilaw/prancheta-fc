/* Prancheta FC — relatório do adjunto sobre o próximo adversário
 * Resumo no card do próximo jogo e relatório completo: última escalação,
 * destaques, estilo de jogo e chance de vitória (300 simulações do jogo).
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const avg = (p) => (p.s.j ? p.s.nt / p.s.j : 0);

  // Chance de vitória: simula o jogo várias vezes sem alterar nada no save
  P.predict = function (g, m, n) {
    n = n || 300;
    const t = g.tac[g.user];
    const sig = [g.season, g.week, m.h, m.a, t.xi.join(','), t.men, t.pre, JSON.stringify(t.ins || {}), JSON.stringify(t.xy || ''), JSON.stringify(t.roles || '')].join('|');
    if (g._pred && g._pred.sig === sig) return g._pred.r;
    const savedXi = t.xi.slice();
    if (t.auto) t.xi = P.autoXI(g, g.user, t.f); else P.fixXI(g, g.user);
    const home = m.h === g.user;
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    for (let i = 0; i < n; i++) {
      const r = P.simulate(g, { h: m.h, a: m.a, neutral: m.neutral });
      const f = home ? r.hg : r.ag, c = home ? r.ag : r.hg;
      gf += f; ga += c;
      if (f > c) w++; else if (f < c) l++; else d++;
    }
    t.xi = savedXi;
    const res = { w: Math.round(w / n * 100), d: Math.round(d / n * 100), l: Math.round(l / n * 100), gf: gf / n, ga: ga / n };
    res.adv = Math.round(res.w + res.d / 2);
    Object.defineProperty(g, '_pred', { value: { sig, r: res }, writable: true, configurable: true, enumerable: false });
    return res;
  };

  // Leitura do estilo do adversário
  function style(g, cid) {
    const t = g.tac[cid], ins = P.insOf(t);
    const slots = P.slots(t);
    const wide = slots.filter((s) => ['LD', 'LE', 'PD', 'PE'].includes(s.pos)).length;
    const central = slots.filter((s) => ['MEI', 'ATA', 'MC'].includes(s.pos)).length;
    const parts = [];
    parts.push(`Mentalidade ${P.MENTALITY[t.men].toLowerCase()}`);
    parts.push(`pressão ${P.PRESSING[t.pre].toLowerCase()}`);
    parts.push({ pos: 'gostam de ficar com a bola', con: 'apostam no contra-ataque', equ: 'constroem de forma equilibrada' }[ins.build]);
    if (ins.pass === 'dir') parts.push('lançam bolas diretas');
    parts.push(wide > central ? 'atacam mais pelos lados' : central > wide + 1 ? 'concentram o jogo pelo meio' : 'variam entre lados e meio');
    return { f: t.xy ? 'formação própria' : t.f, txt: parts.join(', ') };
  }
  function compare(g, cid) {
    const me = P.teamPreview(g, g.user), op = P.teamPreview(g, cid);
    const rel = (a, b) => (a / b);
    const notes = [];
    const pairs = [['ataque', op.att, me.def, 'o ataque deles contra a sua defesa'], ['meio', op.mid, me.mid, 'o meio-campo'], ['defesa', op.def, me.att, 'a defesa deles contra o seu ataque']];
    for (const [k, a, b] of pairs) {
      const r = rel(a, b);
      if (r > 1.08) notes.push({ good: false, txt: `${k[0].toUpperCase() + k.slice(1)} deles é mais forte` });
      else if (r < 0.92) notes.push({ good: true, txt: `${k[0].toUpperCase() + k.slice(1)} deles é mais fraco` });
    }
    return notes;
  }
  function keyPlayers(g, cid) {
    const sq = P.squad(g, cid);
    const best = sq.filter((p) => p.s.j >= 3).sort((a, b) => avg(b) - avg(a))[0];
    const top = sq.filter((p) => p.s.g + p.s.cg > 0).sort((a, b) => (b.s.g + b.s.cg) - (a.s.g + a.s.cg))[0];
    const star = sq.slice().sort((a, b) => P.ovr(b) - P.ovr(a))[0];
    return { best, top, star };
  }

  // Resumo no card do próximo jogo
  P.scoutLine = function (g, um) {
    const m = um.m, opp = m.h === g.user ? m.a : m.h, c = P.club(g, opp);
    const st = style(g, opp), k = keyPlayers(g, opp), pr = P.predict(g, m, 200);
    const danger = k.top ? `${k.top.name} (${k.top.s.g + k.top.s.cg} gols)` : `${k.star.name} (força ${P.ovr(k.star)})`;
    return `<div class="scout-line"><span class="label">Adjunto</span>
      <p style="margin:4px 0 8px">O ${esc(c.name)} joga no ${esc(st.f)}: ${esc(st.txt)}. Cuidado com ${esc(danger)}.</p>
      ${probBar(pr)}
      <button class="btn sm" data-a="scoutOpen" style="margin-top:8px">Ver relatório do adversário</button></div>`;
  };
  function probBar(pr) {
    return `<div class="prob" role="img" aria-label="Vitória ${pr.w}%, empate ${pr.d}%, derrota ${pr.l}%"><i class="w" style="width:${pr.w}%"></i><i class="d" style="width:${pr.d}%"></i><i class="l" style="width:${pr.l}%"></i></div>
      <div class="prob-lbl"><span>Vitória ${pr.w}%</span><span>Empate ${pr.d}%</span><span>Derrota ${pr.l}%</span></div>`;
  }

  // Relatório completo
  P.scoutSheet = function () {
    const g = A.g, um = P.userMatch(g);
    if (!um) return;
    const m = um.m, opp = m.h === g.user ? m.a : m.h, c = P.club(g, opp), t = g.tac[opp];
    const slots = P.slots(t), st = style(g, opp), k = keyPlayers(g, opp), notes = compare(g, opp);
    const pr = P.predict(g, m, 300);
    const tb = P.table(g, c.div), pos = tb.findIndex((r) => r.cid === opp) + 1, row = tb[pos - 1];
    const pl = (p, extra) => (p ? `<div class="kp"><span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span><div style="flex:1;min-width:0"><b>${esc(p.name)}</b><div class="muted" style="font-size:.82rem">${extra}</div></div><span class="ovr">${P.ovr(p)}</span></div>` : '<p class="muted" style="margin:0">Sem dados ainda.</p>');
    A.openSheet(`<div class="bar-top">${P.badge(c, 34)}<h2>${esc(c.name)}</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
      <div class="muted">${c.div}ª divisão · ${pos}º lugar${row ? ` · ${row.pts} pts · ${row.v}-${row.e}-${row.d}` : ''} · força ${P.clubOvrs(g.db)[opp]}</div>
      <div><div class="label" style="margin-bottom:6px">Chance da sua equipe</div>${probBar(pr)}
        <p class="muted" style="font-size:.82rem;margin:6px 0 0">Placar médio previsto: ${pr.gf.toFixed(1).replace('.', ',')} × ${pr.ga.toFixed(1).replace('.', ',')}.${um.ko ? ` Chance de classificação (com pênaltis): ${pr.adv}%.` : ''} Muda se você alterar a escalação ou a tática.</p></div>
      <div><div class="label" style="margin-bottom:6px">Estilo de jogo</div><p style="margin:0">${esc(st.f)}. ${esc(st.txt[0].toUpperCase() + st.txt.slice(1))}.</p>
        ${notes.length ? `<div class="row" style="margin-top:8px">${notes.map((n) => `<span class="chip ${n.good ? 'xi' : 'inj'}" style="font-size:.72rem">${esc(n.txt)}</span>`).join('')}</div>` : '<p class="muted" style="margin:6px 0 0;font-size:.85rem">Times bem equilibrados.</p>'}</div>
      <div><div class="label" style="margin-bottom:6px">Destaques</div>
        ${pl(k.best, k.best ? `Melhor nota média: ${avg(k.best).toFixed(2).replace('.', ',')} em ${k.best.s.j} jogos` : '')}
        ${k.top && k.top !== k.best ? pl(k.top, `Artilheiro: ${k.top.s.g + k.top.s.cg} gols`) : k.top ? '<p class="muted" style="margin:4px 0 0;font-size:.85rem">Ele também é o artilheiro, com ' + (k.top.s.g + k.top.s.cg) + ' gols.</p>' : ''}
        ${!k.best && !k.top ? pl(k.star, 'Jogador mais forte do elenco') : ''}</div>
      <div><div class="label" style="margin-bottom:6px">Última escalação usada</div>
        <div class="pitch mini"><div class="ln mid"></div><div class="ln circ"></div><div class="ln box1"></div><div class="ln box2"></div>
          ${slots.map((s, i) => { const p = g.db.players[t.xi[i]]; return p ? `<div class="slot" style="left:${s.x}%;top:${100 - s.y}%"><span class="dot">${P.ovrAt(p, s.pos)}</span><span class="nm">${esc(p.name.length <= 11 ? p.name : p.name.split(' ')[0].slice(0, 10))}</span><span class="ps">${s.pos}</span></div>` : ''; }).join('')}
        </div></div>`);
  };

  Object.assign(A.ACT, { scoutOpen() { P.scoutSheet(); } });
})(window.PFC);
