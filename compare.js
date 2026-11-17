/* Prancheta FC — comparar um jogador de fora com alguém do seu elenco
 * Botão "Comparar" na ficha de jogadores de outros clubes: escolhe alguém do elenco (separado por setor)
 * e mostra um radar com os setores do jogo e os atributos lado a lado.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const pl = (id) => A.g.db.players[id] || (A.g.y && A.g.y.squad[id]);
  const LINES = [['GOL', 'Goleiros'], ['DEF', 'Defesa'], ['MEI', 'Meio-campo'], ['ATA', 'Ataque']];

  // Escolher com quem comparar
  A.compareSheet = function (pid) {
    const g = A.g, p = pl(pid); if (!p) return;
    const sq = P.squad(g, g.user);
    const mine = P.LINE[p.pos];
    const order = LINES.slice().sort((a, b) => (a[0] === mine ? -1 : b[0] === mine ? 1 : 0));
    A.openSheet(`<div class="bar-top"><h2>Comparar ${esc(p.name)}</h2><button class="btn sm" data-a="player" data-id="${pid}">‹ Voltar</button></div>
      <p class="muted" style="margin:0">Escolha um jogador do seu elenco. O setor de ${esc(p.name)} (${p.pos}) vem primeiro.</p>
      ${order.map(([k, n]) => {
        const list = sq.filter((x) => P.LINE[x.pos] === k).sort((a, b) => P.ovr(b) - P.ovr(a));
        if (!list.length) return '';
        return `<div><div class="label" style="margin:8px 0 2px">${n} (${list.length})</div><div class="plist">${list.map((x) => `<button class="prow" data-a="cmpPick" data-id="${pid}" data-m="${x.id}"><span class="pos-tag ${P.LINE[x.pos]}">${x.pos}</span><span class="nm"><b>${esc(x.name)}</b><small>${x.age} anos · como ${p.pos}: ${P.ovrAt(x, p.pos)}</small></span><span></span><span class="ovr">${P.ovr(x)}</span></button>`).join('')}</div></div>`;
      }).join('')}`);
  };

  // Radar (gráfico redondo) com os setores do jogo
  function axes(p) {
    const r = P.roles(p), a = p.a;
    const ax = [['Ataque', r.att], ['Criação', r.cre], ['Defesa', r.def], ['Físico', r.phys], ['Mental', (a.vis + a.dec + a.pos + a.com) / 4]];
    if (p.pos === 'GOL') ax.push(['Goleiro', r.gk]);
    return ax;
  }
  function radar(p1, p2) {
    const A1 = axes(p1), A2 = axes(p2);
    const names = A1.length >= A2.length ? A1.map((x) => x[0]) : A2.map((x) => x[0]);
    const val = (ax, n) => { const f = ax.find((x) => x[0] === n); return f ? f[1] : (n === 'Goleiro' ? 1 : 0); };
    const N = names.length, cx = 110, cy = 105, R = 78;
    const pt = (i, v) => { const ang = -Math.PI / 2 + i * 2 * Math.PI / N; const rr = R * Math.max(0, Math.min(16, v - 4)) / 16; return [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]; };
    const poly = (ax) => names.map((n, i) => pt(i, val(ax, n)).map((x) => x.toFixed(1)).join(',')).join(' ');
    const rings = [8, 12, 16, 20].map((v) => `<polygon points="${names.map((_, i) => pt(i, v).map((x) => x.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="var(--line)" stroke-width="${v === 20 ? 1.2 : 0.6}"/>`).join('');
    const spokes = names.map((_, i) => { const [x, y] = pt(i, 20); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width=".6"/>`; }).join('');
    const labels = names.map((n, i) => { const [x, y] = pt(i, 24.5); return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="var(--f-label)" letter-spacing=".5">${n.toUpperCase()}</text>`; }).join('');
    return `<svg class="cmp-radar" viewBox="0 0 220 210" role="img" aria-label="Comparação por setor">${rings}${spokes}
      <polygon points="${poly(A2)}" fill="color-mix(in srgb, var(--info) 22%, transparent)" stroke="var(--info)" stroke-width="2"/>
      <polygon points="${poly(A1)}" fill="color-mix(in srgb, var(--accent) 22%, transparent)" stroke="var(--accent)" stroke-width="2"/>${labels}</svg>`;
  }

  // Radar de desempenho na temporada: cada eixo é o percentil por jogo contra a liga (0 = pior, 1 = melhor)
  function radarPerf(p1, p2) {
    const gk = p1.pos === 'GOL' || p2.pos === 'GOL';
    const a = P.perfAxes(p1, gk), b = P.perfAxes(p2, gk);
    if (!a.ok && !b.ok) return '<p class="muted cmp-none">Nenhum dos dois tem 3 jogos na temporada ainda.</p>';
    const names = a.ax.map((x) => x[0]), N = names.length, cx = 110, cy = 105, R = 78;
    const pt = (i, v) => { const ang = -Math.PI / 2 + i * 2 * Math.PI / N, rr = R * Math.max(0.04, Math.min(1, v)); return [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]; };
    const poly = (ax) => ax.map((x, i) => pt(i, x[1]).map((v) => v.toFixed(1)).join(',')).join(' ');
    const rings = [0.25, 0.5, 0.75, 1].map((v) => `<polygon points="${names.map((_, i) => pt(i, v).map((x) => x.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="var(--line)" stroke-width="${v === 1 ? 1.2 : 0.6}"/>`).join('');
    const spokes = names.map((_, i) => { const [x, y] = pt(i, 1); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line)" stroke-width=".6"/>`; }).join('');
    const labels = names.map((n, i) => { const ang = -Math.PI / 2 + i * 2 * Math.PI / N, x = cx + Math.cos(ang) * (R + 17), y = cy + Math.sin(ang) * (R + 13); return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="var(--muted)" font-family="var(--f-label)" letter-spacing=".04em">${esc(n.toUpperCase())}</text>`; }).join('');
    return `<svg class="cmp-radar" viewBox="-14 0 248 210" role="img" aria-label="Desempenho na temporada">${rings}${spokes}
      ${b.ok ? `<polygon points="${poly(b.ax)}" fill="color-mix(in srgb, var(--info) 22%, transparent)" stroke="var(--info)" stroke-width="2"/>` : ''}
      ${a.ok ? `<polygon points="${poly(a.ax)}" fill="color-mix(in srgb, var(--accent) 22%, transparent)" stroke="var(--accent)" stroke-width="2"/>` : ''}${labels}</svg>
      ${!a.ok || !b.ok ? `<p class="muted cmp-none">${esc((!a.ok ? p1 : p2).name)} ainda não tem 3 jogos na temporada.</p>` : ''}`;
  }

  A.compareView = function (pid, mid) {
    const g = A.g, p = pl(pid), m = pl(mid); if (!p || !m) return;
    const c = P.club(g, p.clubId);
    const groups = {};
    P.ATTRS.forEach((at) => { if (P.GK_ATTRS.includes(at.k) && p.pos !== 'GOL' && m.pos !== 'GOL') return; (groups[at.g] = groups[at.g] || []).push(at); });
    const cell = (a, b) => `<b class="${a > b ? 'cmp-win' : ''}">${a}</b>`;
    const row = (lbl, a, b, fmt) => `<div class="cmp-row"><span class="cmp-l ${a > b ? 'win-a' : ''}">${fmt ? fmt(a) : a}</span><span class="cmp-n">${lbl}</span><span class="cmp-r ${b > a ? 'win-b' : ''}">${fmt ? fmt(b) : b}</span></div>`;
    const pot = (x) => (P.potBest ? P.potBest(x).v : P.ovr(x));
    A.openSheet(`<div class="bar-top"><h2>Comparação</h2><button class="btn sm" data-a="cmpOpen" data-id="${pid}">‹ Trocar</button></div>
      <div class="cmp-head">
        <div class="cmp-who a"><span class="cmp-dot"></span><b>${esc(p.name)}</b><small>${p.pos} · ${p.age} anos · ${c ? esc(c.short) : 'Livre'}</small></div>
        <div class="cmp-vs">vs.</div>
        <div class="cmp-who b"><span class="cmp-dot"></span><b>${esc(m.name)}</b><small>${m.pos} · ${m.age} anos · seu elenco</small></div>
      </div>
      <div class="cmp-radars">
        <figure><figcaption class="label">Atributos</figcaption>${radar(p, m)}</figure>
        <figure><figcaption class="label">Temporada <small>por jogo, comparado à liga · Passes = passes decisivos</small></figcaption>${radarPerf(p, m)}</figure>
      </div>
      <div class="cmp-table">
        ${row('Força', P.ovr(p), P.ovr(m))}
        ${row(`Força como ${p.pos}`, P.ovrAt(p, p.pos), P.ovrAt(m, p.pos))}
        ${p.age <= 24 || m.age <= 24 ? row('Potencial', pot(p), pot(m)) : ''}
        ${P.xp ? row('Experiência', Math.round(P.xp(p)), Math.round(P.xp(m))) : ''}
        ${row('Valor', P.value(p), P.value(m), P.money)}
        ${row('Salário', p.wage || 0, m.wage || 0, (v) => P.money(v))}
      </div>
      ${P.seasonRec ? (() => { const a = P.seasonRec(p), b = P.seasonRec(m), nt = (r) => (r.j ? Math.round(r.nt / r.j * 10) / 10 : 0);
        return `<div class="label" style="margin:10px 0 2px">Temporada ${A.g.season}</div><div class="cmp-table">${row('Jogos', a.j, b.j)}${row('Gols', a.g, b.g)}${row('Assistências', a.as, b.as)}${row('Passes decisivos', a.kp, b.kp)}${p.pos === 'GOL' || m.pos === 'GOL' ? row('Defesas', a.sv, b.sv) : row('Finalizações', a.sh, b.sh)}${row('Desarmes', a.tk, b.tk)}${row('Nota média', nt(a), nt(b), (v) => (v ? String(v).replace('.', ',') : '–'))}</div>`; })() : ''}
      ${Object.entries(groups).map(([gn, list]) => `<div class="label" style="margin:10px 0 2px">${gn}</div><div class="cmp-table">${list.map((at) => row(at.n, p.a[at.k], m.a[at.k])).join('')}</div>`).join('')}
      <div class="row" style="margin-top:8px"><button class="btn" data-a="player" data-id="${pid}">Ficha de ${esc(p.name.split(' ')[0])}</button><button class="btn" data-a="player" data-id="${mid}">Ficha de ${esc(m.name.split(' ')[0])}</button></div>`);
  };

  Object.assign(A.ACT, {
    cmpOpen(d) { A.compareSheet(d.id); },
    cmpPick(d) { A.compareView(d.id, d.m); }
  });
})(window.PFC);
