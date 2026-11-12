/* Prancheta FC — moral, conversas e lesões detalhadas
 * - Discurso depois do jogo (elogiar, neutro, criticar e citar jogadores)
 * - Insatisfação de quem fica no banco e conversa individual na ficha do jogador
 * - Tipos de lesão com durações diferentes
 */
(function (P) {
  const A = P.app, esc = P.esc;

  // ---------- Lesões ----------
  P.INJURIES = [
    { n: 'Contusão', w: [1, 1], p: 30 },
    { n: 'Pancada no tornozelo', w: [1, 2], p: 20 },
    { n: 'Entorse no tornozelo', w: [2, 4], p: 15 },
    { n: 'Distensão na coxa', w: [2, 5], p: 14 },
    { n: 'Lesão muscular na panturrilha', w: [3, 6], p: 9 },
    { n: 'Lesão no joelho', w: [4, 8], p: 6 },
    { n: 'Fratura no pé', w: [6, 12], p: 4 },
    { n: 'Ruptura de ligamento', w: [16, 30], p: 2 }
  ];
  P.injuryType = function (r) {
    const t = P.weighted(r, P.INJURIES, (x) => x.p);
    return { n: t.n, w: t.w[0] + Math.floor(r() * (t.w[1] - t.w[0] + 1)) };
  };

  // ---------- Tempo de jogo e insatisfação ----------
  const rankOf = (g, p) => P.squad(g, g.user).map(P.ovr).sort((a, b) => b - a).indexOf(P.ovr(p)) + 1;
  P.afterUserMatch = function (g, it, r, home) {
    const side = home ? 0 : 1, played = new Set(r.played[side]);
    const gf = home ? r.hg : r.ag, ga = home ? r.ag : r.hg;
    g.lastMatch = { h: it.m.h, a: it.m.a, home, res: it.ko ? (it.m.w === g.user ? 1 : -1) : Math.sign(gf - ga), notes: r.notes, played: r.played[side], talked: false, w: g.week };
    for (const p of P.squad(g, g.user)) {
      p.rg = (p.rg || []).concat(played.has(p.id) ? 1 : 0).slice(-8);
      if (p.promise) {
        p.promise.left--;
        if (played.has(p.id)) p.promise.got++;
        if (p.promise.left <= 0) {
          if (p.promise.got >= 2) { p.unh = false; P.news(g, `${p.name} ficou satisfeito: você cumpriu a promessa de tempo de jogo.`, 'good'); }
          else { p.mor = Math.max(20, p.mor - 25); p.unh = true; p.broke = true; P.news(g, `${p.name} está revoltado: a promessa de tempo de jogo não foi cumprida.`, 'bad'); }
          delete p.promise;
        }
      }
      // quem é forte e não joga fica insatisfeito
      if (p.rg.length >= 6 && !p.inj && !p.promise) {
        const share = p.rg.reduce((a, b) => a + b, 0) / p.rg.length;
        const expects = rankOf(g, p) <= 12 && p.age >= 21;
        if (!p.unh && expects && share < 0.25) { p.unh = true; P.news(g, `${p.name} está insatisfeito com a falta de oportunidades. Converse com ele pela ficha.`, 'warn'); }
        else if (p.unh && share >= 0.6) p.unh = false;
      }
      if (p.unh) p.mor = Math.max(20, p.mor - 2);
    }
  };

  // ---------- Conversa individual ----------
  P.talkButton = (p) => `<button class="btn" data-a="talkOpen" data-id="${p.id}">Conversar${p.unh ? ' <span class="chip sus">!</span>' : ''}</button>`;
  P.talkPanel = function (p) {
    const g = A.g, cool = p.talkW != null && g.week - p.talkW < 3 && p.talkS === g.season;
    const res = A.st.talkRes && A.st.talkRes.id === p.id ? `<div class="msg ${A.st.talkRes.good ? 'good' : ''}">${esc(A.st.talkRes.msg)}</div>` : '';
    if (cool && !res) return `<div class="card"><b>Conversa com ${esc(p.name)}</b><p class="muted" style="margin:6px 0 0">Vocês conversaram há pouco. Espere algumas semanas.</p></div>`;
    const opts = p.unh
      ? [['promise', 'Prometer tempo de jogo', 'Ele precisa jogar pelo menos 2 dos próximos 4 jogos.'], ['wait', 'Pedir paciência', 'Funciona melhor com jovens ou quem não é titular.'], ['sell', 'Colocar à venda', 'Ele aceita sair, mas a moral cai um pouco.']]
      : [['praise', 'Elogiar o momento', 'Motiva quem vem jogando bem.'], ['push', 'Cobrar mais empenho', 'Pode motivar ou irritar, depende do momento.']];
    return `<div class="card" style="display:flex;flex-direction:column;gap:8px"><b>Conversa com ${esc(p.name)}</b>
      <div class="muted" style="font-size:.88rem">${p.unh ? 'Ele está insatisfeito com o tempo de jogo.' : 'Ele está tranquilo no clube.'} Moral: ${p.mor}.</div>
      ${res || `<div class="roles">${opts.map(([k, n, d]) => `<button class="role" data-a="talkDo" data-id="${p.id}" data-k="${k}"><b>${n}</b><span>${d}</span></button>`).join('')}</div>`}</div>`;
  };
  function talk(g, p, k) {
    const r = Math.random, form = (p.rg || []).slice(-4).reduce((a, b) => a + b, 0);
    p.talkW = g.week; p.talkS = g.season;
    if (k === 'promise') { p.promise = { left: 4, got: 0 }; p.mor = Math.min(100, p.mor + 15); return { good: true, msg: `${p.name} gostou e vai esperar sua chance nos próximos jogos.` }; }
    if (k === 'wait') {
      const ok = p.age <= 21 || rankOf(g, p) > 11;
      p.mor = P.clamp(p.mor + (ok ? 6 : -6), 20, 100);
      if (ok) p.unh = false;
      return { good: ok, msg: ok ? `${p.name} entendeu e vai continuar trabalhando.` : `${p.name} não aceitou a explicação.` };
    }
    if (k === 'sell') { p.listed = true; p.unh = false; p.mor = Math.max(20, p.mor - 5); return { good: true, msg: `${p.name} foi colocado à venda e aceita sair.` }; }
    if (k === 'praise') { const ok = form >= 2; p.mor = P.clamp(p.mor + (ok ? 6 : 2), 20, 100); return { good: true, msg: ok ? `${p.name} ficou confiante.` : `${p.name} agradeceu, mas sabe que precisa jogar mais.` }; }
    const ok = p.mor > 70 ? r() < 0.4 : r() < 0.65;
    p.mor = P.clamp(p.mor + (ok ? 5 : -6), 20, 100);
    return { good: ok, msg: ok ? `${p.name} reagiu bem e promete mais empenho.` : `${p.name} não gostou da cobrança.` };
  }

  // ---------- Discurso pós-jogo ----------
  P.teamTalkPanel = function () {
    const g = A.g, lm = g.lastMatch;
    if (!lm || lm.w !== g.week - 1) return '';
    if (lm.talked) return `<div class="msg good">${esc(lm.talkMsg || 'Discurso feito.')}</div>`;
    const tt = A.st.tt || (A.st.tt = { tone: 'neu', praise: '', crit: '' });
    const pls = lm.played.map((id) => g.db.players[id]).filter(Boolean).sort((a, b) => (lm.notes[b.id] || 0) - (lm.notes[a.id] || 0));
    const opt = (k) => `<select class="sel" data-c="ttSel" data-k="${k}"><option value="">Ninguém</option>${pls.map((p) => `<option value="${p.id}" ${tt[k] === p.id ? 'selected' : ''}>${esc(p.name)} (${String(lm.notes[p.id] || '-').replace('.', ',')})</option>`).join('')}</select>`;
    return `<div class="card" style="display:flex;flex-direction:column;gap:10px"><b>Conversa com o elenco</b>
      <div class="seg">${[['elo', 'Elogiar'], ['neu', 'Neutro'], ['cri', 'Criticar']].map(([k, n]) => `<button class="${tt.tone === k ? 'on' : ''}" data-a="ttTone" data-v="${k}">${n}</button>`).join('')}</div>
      <div class="form-grid"><div class="field"><span class="label">Destacar (elogio)</span>${opt('praise')}</div><div class="field"><span class="label">Cobrar (crítica)</span>${opt('crit')}</div></div>
      <div><button class="btn primary" data-a="ttDo">Falar com o time</button></div></div>`;
  };
  function teamTalk(g, tt) {
    const lm = g.lastMatch;
    // efeito do tom conforme o resultado: [vitória, empate, derrota]
    const idx = lm.res > 0 ? 0 : lm.res === 0 ? 1 : 2;
    const eff = { elo: [4, 2, -2], neu: [1, 0, 0], cri: [-3, 1, 3] }[tt.tone][idx];
    for (const id of lm.played) { const p = g.db.players[id]; if (p) p.mor = P.clamp(p.mor + eff, 20, 100); }
    const out = [];
    if (tt.praise) { const p = g.db.players[tt.praise], n = lm.notes[tt.praise] || 6; p.mor = P.clamp(p.mor + (n >= 7 ? 8 : 3), 20, 100); out.push(`${p.name} adorou o elogio`); }
    if (tt.crit) {
      const p = g.db.players[tt.crit], n = lm.notes[tt.crit] || 6;
      const d = n >= 7 ? -10 : n < 6 ? (Math.random() < 0.5 ? 4 : -6) : -4;
      p.mor = P.clamp(p.mor + d, 20, 100);
      out.push(d > 0 ? `${p.name} aceitou a crítica e quer reagir` : `${p.name} ficou chateado com a crítica`);
    }
    const tone = { elo: 'O elenco recebeu os elogios', neu: 'O elenco ouviu a conversa', cri: 'O elenco ouviu as críticas' }[tt.tone];
    lm.talked = true;
    lm.talkMsg = `${tone} ${eff > 1 ? 'e saiu motivado' : eff < 0 ? 'e não gostou' : 'sem grandes reações'}${out.length ? '. ' + out.join('; ') : ''}.`;
  }

  Object.assign(A.ACT, {
    talkOpen(d) { A.st.talkRes = null; A.playerSheet(d.id, 'talk'); },
    talkDo(d) { const p = A.g.db.players[d.id]; A.st.talkRes = Object.assign({ id: d.id }, talk(A.g, p, d.k)); A.save(); A.render(); A.playerSheet(d.id, 'talk'); },
    ttTone(d) { A.st.tt.tone = d.v; if (A.redrawMd) A.redrawMd(); },
    ttDo() { teamTalk(A.g, A.st.tt); A.st.tt = null; A.save(); if (A.redrawMd) A.redrawMd(); }
  });
  Object.assign(A.CHG, { ttSel(el) { A.st.tt[el.dataset.k] = el.value; } });
})(window.PFC);
