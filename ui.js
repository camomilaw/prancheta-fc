/* Prancheta FC — interface
 * Cada tela é uma função que devolve HTML. Botões usam data-a="nomeDaAcao" e
 * campos usam data-c="nomeDaAcao"; as ações ficam nos objetos ACT e CHG.
 */
(function (P) {
  const SAVE_KEY = 'prancheta-fc:save:v1';
  const esc = P.esc;

  const A = P.app = {
    g: null,
    setup: { db: null, club: null, manager: '', editing: false, importing: false },
    view: 'inicio',
    st: { sort: 'pos', filter: 'ALL', tab: 'class', rd: null, ed: { v: 'clubs' }, confirm: null },
    md: null
  };
  const ACT = A.ACT = {};
  const CHG = A.CHG = {};

  A.db = () => (A.g ? A.g.db : A.setup.db);
  A.save = () => { if (A.g) P.store.set(SAVE_KEY, JSON.stringify(A.g)); };
  A.loadSave = () => {
    const raw = P.store.get(SAVE_KEY);
    if (!raw) return null;
    try { const g = JSON.parse(raw); return g && g.db && g.fixtures ? g : null; } catch (e) { return null; }
  };
  A.clearSave = () => P.store.del(SAVE_KEY);

  // ---------- Ícones ----------
  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    squad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3c-1 2-2.5 3-4 3S9 5 8 3z"/></svg>',
    tactic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 12h16"/><circle cx="12" cy="12" r="2.5"/><path d="M8 7l2 2m0-2l-2 2M14 16l2 2m0-2l-2 2"/></svg>',
    table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v4a5 5 0 01-10 0V4z"/><path d="M7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4"/><path d="M12 13v4M8 21h8M9 17h6"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
    ball: '<svg class="ev-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="currentColor"/></svg>',
    cross: '<svg class="ev-ico" viewBox="0 0 24 24" fill="none" stroke="var(--bad)" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    save: '<svg class="ev-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12a7 7 0 0114 0"/><path d="M9 12v5h6v-5"/></svg>'
  };

  // ---------- Escudo ----------
  P.badge = function (club, size) {
    size = size || 32;
    if (!club) return '';
    const c1 = club.colors && club.colors[0] || '#888', c2 = club.colors && club.colors[1] || '#fff';
    const path = 'M20 2 L37 7 V22 C37 33 29 40 20 44 C11 40 3 33 3 22 V7 Z';
    return `<svg class="badge" width="${size}" height="${Math.round(size * 1.15)}" viewBox="0 0 40 46" aria-hidden="true">
      <path d="${path}" fill="${esc(c1)}" stroke="rgba(0,0,0,.35)" stroke-width="3.5"/>
      <path d="${path}" fill="${esc(c1)}" stroke="${esc(c2)}" stroke-width="2"/>
      <path d="M8 12h24" stroke="${esc(c2)}" stroke-width="2.5" opacity=".9"/>
      <text x="20" y="30" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="11" fill="${esc(c2)}">${esc(club.short || '')}</text>
    </svg>`;
  };

  // ---------- Helpers de exibição ----------
  const club = (cid) => A.db().clubs.find((c) => c.id === cid);
  const pl = (id) => A.db().players[id];
  const vcls = (v) => (v <= 6 ? 'v1' : v <= 10 ? 'v2' : v <= 15 ? 'v3' : 'v4');
  const condCls = (c) => (c >= 80 ? '' : c >= 60 ? 'mid' : 'low');
  const condBar = (p) => `<span class="cond ${condCls(p.cond)}" title="Condição ${Math.round(p.cond)}%"><i style="width:${Math.round(p.cond)}%"></i></span>`;
  const status = (p) => (p.inj ? `<span class="chip inj">Lesão ${p.inj}r</span>` : '') + (p.susp ? '<span class="chip sus">Suspenso</span>' : '');
  const avgNote = (p) => (p.s.j ? (p.s.nt / p.s.j).toFixed(1).replace('.', ',') : '–');
  const ord = (n) => n + 'º';
  A.toast = function (msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(A._tt); A._tt = setTimeout(() => { t.hidden = true; }, 2400);
  };

  // ---------- Render principal ----------
  A.render = function () {
    const root = document.getElementById('root');
    if (!A.g) { root.innerHTML = A.setup.editing ? P.editor.page(true) : renderSetup(); return; }
    const g = A.g, me = club(g.user);
    const views = { inicio: vInicio, elenco: vElenco, tatica: vTatica, tabela: vTabela, mais: vMais, editor: () => P.editor.page(false) };
    const nav = [['inicio', 'Início', I.home], ['elenco', 'Elenco', I.squad], ['tatica', 'Tática', I.tactic], ['tabela', 'Tabela', I.table], ['mais', 'Mais', I.more]];
    const active = A.view === 'editor' ? 'mais' : A.view;
    const meta = g.over ? `Temporada ${g.season} encerrada` : `Rodada ${g.round + 1} de ${g.fixtures.length} · ${g.season}`;
    root.innerHTML = `<div class="app">
      <header class="top">
        ${P.badge(me, 34)}
        <div class="who"><h1>${esc(me.name)}</h1><div class="meta">${esc(g.manager)} · ${meta}</div></div>
        ${g.over ? `<button class="btn primary" data-a="newSeason">Nova temporada</button>` : `<button class="btn primary" data-a="play">Jogar</button>`}
      </header>
      <nav class="nav" aria-label="Seções">${nav.map(([k, n, ic]) => `<button data-a="go" data-v="${k}" class="${active === k ? 'on' : ''}" aria-current="${active === k ? 'page' : 'false'}">${ic}<span>${n}</span></button>`).join('')}</nav>
      <main class="main" id="view">${(views[A.view] || vInicio)()}</main>
    </div>`;
  };

  // ---------- Tela inicial / novo jogo ----------
  function renderSetup() {
    const s = A.setup, db = s.db;
    const saved = A.loadSave();
    const savedClub = saved && saved.db.clubs.find((c) => c.id === saved.user);
    const clubs = db.clubs.slice().sort((a, b) => P.clubOvr(db, b.id) - P.clubOvr(db, a.id));
    return `<div class="setup">
      <div class="brand">
        <svg width="64" height="88" viewBox="0 0 64 88" aria-hidden="true"><rect x="2" y="2" width="60" height="84" rx="6" fill="var(--pitch)"/><rect x="2" y="2" width="60" height="84" rx="6" fill="none" stroke="var(--pitch-line)" stroke-width="2"/><path d="M2 44h60" stroke="var(--pitch-line)" stroke-width="2"/><circle cx="32" cy="44" r="9" fill="none" stroke="var(--pitch-line)" stroke-width="2"/><circle cx="20" cy="66" r="4" fill="#fff"/><circle cx="44" cy="66" r="4" fill="#fff"/><circle cx="32" cy="26" r="4" fill="var(--accent)"/><path d="M22 62 L30 30" stroke="var(--accent)" stroke-width="2" stroke-dasharray="3 3"/></svg>
        <div><h1>Prancheta <span>FC</span></h1><p>Escolha um clube, monte o time e dispute o campeonato rodada a rodada. Tudo é editável: clubes, jogadores e atributos.</p></div>
      </div>
      ${saved && savedClub ? `<div class="card row"><div>${P.badge(savedClub, 36)}</div><div style="flex:1;min-width:0"><div class="label">Carreira salva</div><b>${esc(saved.manager)} · ${esc(savedClub.name)}</b><div class="muted">Temporada ${saved.season}, rodada ${Math.min(saved.round + 1, saved.fixtures.length)}</div></div><button class="btn primary" data-a="continue">Continuar</button></div>` : ''}
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <div class="row"><h2 style="flex:1">Nova carreira</h2>
          <button class="btn sm" data-a="setupEdit">Editar clubes e jogadores</button>
          <button class="btn sm" data-a="setupImport">Importar</button></div>
        ${s.importing ? importBox() : ''}
        <div class="field" style="max-width:360px"><label class="label" for="mgr">Nome do técnico</label><input id="mgr" data-c="mgr" value="${esc(s.manager)}" placeholder="Seu nome" maxlength="30"></div>
        <div class="label">Escolha o clube</div>
        <div class="clubs">${clubs.map((c) => `<button class="clubpick ${s.club === c.id ? 'on' : ''}" data-a="pickClub" data-id="${c.id}">
          <div class="row" style="gap:8px">${P.badge(c, 30)}<span class="ovr" style="font-size:1.2rem">${P.clubOvr(db, c.id)}</span></div>
          <b>${esc(c.name)}</b><small>${esc(c.city)} · ${esc(P.expectation({ db }, c.id))}</small></button>`).join('')}</div>
        <div class="row"><span class="spacer"></span><button class="btn primary" data-a="start" ${s.club ? '' : 'disabled'}>Começar carreira</button></div>
      </div>
    </div>`;
  }
  function importBox() {
    return `<div class="card" style="background:var(--surface-2);display:flex;flex-direction:column;gap:10px">
      <b>Importar banco de dados ou carreira</b>
      <p class="muted" style="margin:0">Escolha um arquivo .json exportado pelo jogo, ou cole o texto abaixo.</p>
      <input type="file" id="impfile" accept=".json,.txt,application/json" data-c="impFile">
      <div class="field"><textarea id="imptext" placeholder="Cole aqui o JSON"></textarea></div>
      <div class="row"><button class="btn" data-a="setupImport">Cancelar</button><span class="spacer"></span><button class="btn primary" data-a="applyImport">Importar</button></div>
    </div>`;
  }

  // ---------- Início ----------
  function nextFixture(g) {
    if (g.over) return null;
    return g.fixtures[g.round].find((f) => f.h === g.user || f.a === g.user) || null;
  }
  function vInicio() {
    const g = A.g;
    const tb = P.table(g);
    const posOf = (cid) => tb.findIndex((r) => r.cid === cid) + 1;
    const row = tb.find((r) => r.cid === g.user);
    const fx = nextFixture(g);
    const squad = P.squad(g, g.user);
    const injured = squad.filter((p) => p.inj).length, susp = squad.filter((p) => p.susp).length, tired = squad.filter((p) => p.cond < 70).length;
    const form = (cid) => `<span class="form">${tb.find((r) => r.cid === cid).form.slice(-5).map((f) => `<i class="${f}">${f}</i>`).join('')}</span>`;

    let top = '';
    if (g.over) {
      const champ = club(tb[0].cid);
      top = `<div class="card"><div class="label">Fim da temporada ${g.season}</div>
        <div class="row" style="margin:10px 0">${P.badge(champ, 48)}<div><h2>${esc(champ.name)} campeão</h2><div class="muted">${tb[0].pts} pontos · seu time terminou em ${ord(posOf(g.user))}</div></div></div>
        <p class="muted" style="margin:0 0 12px">Na virada de temporada os jogadores envelhecem, os jovens evoluem, os veteranos caem de rendimento e alguns se aposentam.</p>
        <button class="btn primary" data-a="newSeason">Começar temporada ${g.season + 1}</button></div>`;
    } else if (fx) {
      const h = club(fx.h), a = club(fx.a);
      top = `<div class="card"><div class="head"><span class="label">Próximo jogo · Rodada ${g.round + 1}</span><span class="label">${esc(h.stadium)}</span></div>
        <div class="fixture">
          <div class="side">${P.badge(h, 52)}<b>${esc(h.name)}</b><span class="sub">${ord(posOf(h.id))} · ${form(h.id)}</span></div>
          <div class="vs">×</div>
          <div class="side">${P.badge(a, 52)}<b>${esc(a.name)}</b><span class="sub">${ord(posOf(a.id))} · ${form(a.id)}</span></div>
        </div>
        <div class="row" style="margin-top:14px"><button class="btn" data-a="go" data-v="tatica">Ajustar tática</button><span class="spacer"></span><button class="btn primary" data-a="play">Jogar rodada</button></div></div>`;
    }

    // mini tabela: top 4 + vizinhos do meu time
    const myIdx = tb.findIndex((r) => r.cid === g.user);
    const idxs = new Set([0, 1, 2, 3, myIdx - 1, myIdx, myIdx + 1].filter((i) => i >= 0 && i < tb.length));
    let last = -1, mini = '';
    [...idxs].sort((a, b) => a - b).forEach((i) => {
      if (last >= 0 && i > last + 1) mini += '<tr><td colspan="5" class="muted" style="text-align:center">···</td></tr>';
      const r = tb[i], c = club(r.cid);
      mini += `<tr class="${r.cid === g.user ? 'me' : ''}"><td class="n">${i + 1}</td><td><span class="club">${P.badge(c, 20)}${esc(c.name)}</span></td><td class="n">${r.j}</td><td class="n">${r.gp - r.gc}</td><td class="n"><b>${r.pts}</b></td></tr>`;
      last = i;
    });

    const myGames = [];
    g.fixtures.forEach((rd, ri) => rd.forEach((f) => { if (f.done && (f.h === g.user || f.a === g.user)) myGames.push({ f, ri }); }));
    const lastGames = myGames.slice(-5).reverse();

    return `${top}
      <div class="grid2">
        <div class="card"><div class="head"><span class="label">Situação</span><span class="label">Meta: ${esc(P.expectation(g, g.user))}</span></div>
          <div class="kv">
            <div><span class="label">Posição</span><b>${ord(myIdx + 1)}</b></div>
            <div><span class="label">Pontos</span><b>${row.pts}</b></div>
            <div><span class="label">Campanha</span><b>${row.v}-${row.e}-${row.d}</b></div>
            <div><span class="label">Lesionados</span><b class="${injured ? 'v1' : ''}">${injured}</b></div>
            <div><span class="label">Suspensos</span><b class="${susp ? 'v2' : ''}">${susp}</b></div>
            <div><span class="label">Cansados</span><b class="${tired ? 'v2' : ''}">${tired}</b></div>
          </div></div>
        <div class="card"><div class="head"><span class="label">Classificação</span><button class="btn sm ghost" data-a="go" data-v="tabela">Ver completa</button></div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="n">#</th><th>Clube</th><th class="n">J</th><th class="n">SG</th><th class="n">P</th></tr></thead><tbody>${mini}</tbody></table></div></div>
      </div>
      <div class="grid2">
        <div class="card"><div class="head"><span class="label">Últimos jogos</span></div>
          ${lastGames.length ? `<div class="others" style="grid-template-columns:1fr">${lastGames.map(({ f }) => ogRow(f, f.hg, f.ag, true)).join('')}</div>` : '<p class="empty">Nenhum jogo disputado ainda.</p>'}</div>
        <div class="card"><div class="head"><span class="label">Notícias</span></div>
          <ul class="news">${g.news.slice(0, 10).map((n) => `<li class="${n.type}"><div>${esc(n.txt)}<small>Temporada ${n.s} · rodada ${n.r}</small></div></li>`).join('')}</ul></div>
      </div>`;
  }
  function ogRow(f, hg, ag, clickable, flash) {
    const h = club(f.h), a = club(f.a);
    return `<div class="og ${flash ? 'flash' : ''}" ${clickable ? `data-a="report" data-h="${f.h}" data-aw="${f.a}" role="button" tabindex="0" style="cursor:pointer"` : ''}>
      <span class="hm">${esc(h.short)} ${P.badge(h, 18)}</span><span class="s num">${hg} × ${ag}</span><span class="aw">${P.badge(a, 18)} ${esc(a.short)}</span></div>`;
  }

  // ---------- Elenco ----------
  const LINE_ORDER = { GOL: 0, LD: 1, ZAG: 2, LE: 3, VOL: 4, MC: 5, MEI: 6, PD: 7, PE: 8, ATA: 9 };
  function sortPlayers(list, by) {
    const f = {
      pos: (a, b) => LINE_ORDER[a.pos] - LINE_ORDER[b.pos] || P.ovr(b) - P.ovr(a),
      ovr: (a, b) => P.ovr(b) - P.ovr(a),
      age: (a, b) => a.age - b.age,
      cond: (a, b) => a.cond - b.cond,
      gols: (a, b) => b.s.g - a.s.g || b.s.as - a.s.as,
      nota: (a, b) => (b.s.j ? b.s.nt / b.s.j : 0) - (a.s.j ? a.s.nt / a.s.j : 0)
    }[by] || ((a, b) => 0);
    return list.sort(f);
  }
  function vElenco() {
    const g = A.g, st = A.st;
    const xi = new Set(g.tac[g.user].xi);
    let list = P.squad(g, g.user);
    if (st.filter !== 'ALL') list = list.filter((p) => P.LINE[p.pos] === st.filter);
    sortPlayers(list, st.sort);
    const total = P.squad(g, g.user);
    const avgAge = (total.reduce((s, p) => s + p.age, 0) / total.length).toFixed(1).replace('.', ',');
    const val = total.reduce((s, p) => s + P.value(p), 0);
    return `<div class="card"><div class="head"><h2>Elenco</h2><span class="muted">${total.length} jogadores · média ${avgAge} anos · ${P.money(val)}</span></div>
      <div class="filters" style="margin-bottom:8px">
        <div class="seg">${[['ALL', 'Todos'], ['GOL', 'GOL'], ['DEF', 'DEF'], ['MEI', 'MEI'], ['ATA', 'ATA']].map(([k, n]) => `<button class="${st.filter === k ? 'on' : ''}" data-a="filter" data-k="${k}">${n}</button>`).join('')}</div>
        <span class="spacer"></span>
        <label class="label" for="sortsel">Ordenar</label>
        <select id="sortsel" class="sel" data-c="sort">${[['pos', 'Posição'], ['ovr', 'Força'], ['age', 'Idade'], ['cond', 'Condição'], ['gols', 'Gols'], ['nota', 'Nota média']].map(([k, n]) => `<option value="${k}" ${st.sort === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
      </div>
      <div class="plist">${list.map((p) => `<button class="prow" data-a="player" data-id="${p.id}">
        <span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span>
        <span class="nm"><b>${esc(p.name)}${xi.has(p.id) ? '<span class="chip xi">Titular</span>' : ''}${status(p)}</b>
          <small>${p.age} anos · ${p.s.j} J · ${p.s.g} G · ${p.s.as} A · nota ${avgNote(p)}</small></span>
        ${condBar(p)}<span class="ovr">${P.ovr(p)}</span></button>`).join('')}</div></div>`;
  }

  // ---------- Ficha do jogador ----------
  A.playerSheet = function (id) {
    const p = pl(id); if (!p) return;
    const c = club(p.clubId);
    const groups = {};
    P.ATTRS.forEach((at) => { if (P.GK_ATTRS.includes(at.k) && p.pos !== 'GOL') return; (groups[at.g] = groups[at.g] || []).push(at); });
    const best = P.POS.map((pos) => ({ pos, v: P.ovrAt(p, pos) })).sort((a, b) => b.v - a.v).slice(0, 4);
    A.openSheet(`<div class="bar-top"><span class="pos-tag ${P.LINE[p.pos]}" style="padding:4px 8px">${p.pos}</span>
        <h2>${esc(p.name)}</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
      <div class="row">${P.badge(c, 30)}<div style="flex:1;min-width:0"><div>${esc(P.POS_NAME[p.pos])} · ${p.age} anos</div><div class="muted">${c ? esc(c.name) : 'Sem clube'} ${status(p)}</div></div>
        <div style="text-align:right"><div class="label">Força</div><div class="big-ovr">${P.ovr(p)}</div></div></div>
      <div class="kv">
        <div><span class="label">Valor</span><b>${P.money(P.value(p))}</b></div>
        <div><span class="label">Condição</span><b class="${p.cond < 60 ? 'v1' : p.cond < 80 ? 'v2' : ''}">${Math.round(p.cond)}%</b></div>
        <div><span class="label">Moral</span><b>${moraleWord(p.mor)}</b></div>
        <div><span class="label">Jogos</span><b>${p.s.j}</b></div>
        <div><span class="label">Gols</span><b>${p.s.g}</b></div>
        <div><span class="label">Assist.</span><b>${p.s.as}</b></div>
        <div><span class="label">Nota</span><b>${avgNote(p)}</b></div>
        <div><span class="label">Cartões</span><b>${p.s.ca}/${p.s.cv}</b></div>
      </div>
      <div class="attrs">${Object.entries(groups).map(([gname, list]) => `<div class="grp"><h4 class="label">${gname}</h4>${list.map((at) => `<div class="attr"><span>${at.n}</span><b class="${vcls(p.a[at.k])}">${p.a[at.k]}</b></div>`).join('')}</div>`).join('')}</div>
      <div><div class="label" style="margin-bottom:6px">Rende em</div><div class="row">${best.map((b) => `<span class="pos-tag ${P.LINE[b.pos]}" style="padding:4px 10px">${b.pos} ${b.v}</span>`).join('')}</div></div>
      <div class="row"><span class="spacer"></span><button class="btn" data-a="editPlayer" data-id="${p.id}">Editar no editor</button></div>`);
  };
  function moraleWord(m) { return m >= 85 ? 'Ótima' : m >= 68 ? 'Boa' : m >= 50 ? 'Normal' : m >= 35 ? 'Baixa' : 'Péssima'; }

  // ---------- Tática ----------
  function vTatica() {
    const g = A.g, t = g.tac[g.user];
    P.fixXI(g, g.user);
    const slots = P.slots(t.f);
    const sel = A.st.slot;
    const s = P.teamPreview(g, g.user);
    const toScore = (v) => Math.round(v * 5);
    const bars = [['Ataque', s.att], ['Meio', s.mid], ['Defesa', s.def], ['Goleiro', s.gk]];
    const opt = (key, map, cur) => `<div class="seg">${Object.entries(map).map(([k, n]) => `<button class="${cur === k ? 'on' : ''}" data-a="tac" data-k="${key}" data-v="${k}">${n}</button>`).join('')}</div>`;
    const xi = new Set(t.xi);
    const bench = P.squad(g, g.user).filter((p) => !xi.has(p.id));
    sortPlayers(bench, 'pos');
    return `<div class="tac">
      <div class="card">
        <div class="head"><h2>Escalação</h2><select class="sel" data-c="formation" aria-label="Formação">${Object.keys(P.FORMATIONS).map((f) => `<option ${t.f === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
        <div class="pitch"><div class="ln mid"></div><div class="ln circ"></div><div class="ln box1"></div><div class="ln box2"></div>
          ${slots.map((sl, i) => {
            const p = pl(t.xi[i]);
            if (!p) return `<button class="slot" style="left:${sl.x}%;top:${100 - sl.y}%" data-a="slot" data-i="${i}"><span class="dot off">?</span><span class="nm">vazio</span><span class="ps">${sl.pos}</span></button>`;
            const f = P.fit(p.pos, sl.pos);
            const cc = p.cond >= 80 ? '#4cc27f' : p.cond >= 60 ? '#e5b23a' : '#f0695e';
            const short = p.name.split(' ')[0].length > 9 ? p.name.split(' ')[0].slice(0, 9) : (p.name.length > 11 ? p.name.split(' ')[0] : p.name);
            return `<button class="slot ${sel === i ? 'sel' : ''}" style="left:${sl.x}%;top:${100 - sl.y}%" data-a="slot" data-i="${i}" aria-label="${esc(p.name)}, ${sl.pos}">
              <span class="dot ${!P.available(p) ? 'off' : f < 1 ? 'fit' : ''}" style="--c:${cc}">${P.ovrAt(p, sl.pos)}</span>
              <span class="nm">${esc(short)}</span><span class="ps">${sl.pos}</span></button>`;
          }).join('')}
        </div>
        <p class="muted" style="margin:10px 0 0;font-size:.85rem">Toque num jogador para trocar. Amarelo = fora da posição de origem. A barrinha mostra a condição física.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div class="card"><div class="head"><span class="label">Força do time</span></div>
          <div class="bars">${bars.map(([n, v]) => `<div class="bar"><span>${n}</span><span class="tr"><i style="width:${P.clamp(toScore(v), 0, 100)}%"></i></span><b class="num">${toScore(v)}</b></div>`).join('')}</div></div>
        <div class="card" style="display:flex;flex-direction:column;gap:14px">
          <div class="opt"><span class="label">Mentalidade</span>${opt('men', P.MENTALITY, t.men)}</div>
          <div class="opt"><span class="label">Pressão</span>${opt('pre', P.PRESSING, t.pre)}</div>
          <div class="opt"><span class="label">Estilo de jogo</span>${opt('est', P.STYLE, t.est)}</div>
          <p class="muted" style="margin:0;font-size:.85rem">${tacticHint(t)}</p>
          <label class="switch"><input type="checkbox" id="autoxi" data-c="auto" ${t.auto ? 'checked' : ''}> Escalar os melhores automaticamente antes de cada jogo</label>
          <div class="row"><button class="btn" data-a="bestXI">Escalar os melhores agora</button></div>
        </div>
        <div class="card"><div class="head"><span class="label">Reservas (${bench.length})</span></div>
          <div class="plist">${bench.map((p) => `<button class="prow" data-a="player" data-id="${p.id}"><span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span>
            <span class="nm"><b>${esc(p.name)}${status(p)}</b><small>${p.age} anos · nota ${avgNote(p)}</small></span>${condBar(p)}<span class="ovr">${P.ovr(p)}</span></button>`).join('')}</div></div>
      </div></div>`;
  }
  function tacticHint(t) {
    const h = [];
    if (t.men === 'ofe') h.push('Ofensiva cria mais chances, mas abre a defesa.');
    if (t.men === 'def') h.push('Defensiva fecha espaços e sacrifica o ataque.');
    if (t.pre === 'alt') h.push('Pressão alta ganha o meio-campo, cansa mais e gera mais cartões.');
    if (t.pre === 'bai') h.push('Pressão baixa poupa o físico do elenco.');
    if (t.est === 'pos') h.push('Posse de bola domina o meio e finaliza com mais qualidade.');
    if (t.est === 'con') h.push('Contra-ataque rende muito contra times ofensivos.');
    if (t.est === 'dir') h.push('Jogo direto finaliza mais vezes, com menos precisão.');
    return h.join(' ') || 'Ajuste equilibrado: sem bônus nem penalidades.';
  }
  A.slotSheet = function (i) {
    const g = A.g, t = g.tac[g.user], sl = P.slots(t.f)[i];
    const list = P.squad(g, g.user).sort((a, b) => P.ovrAt(b, sl.pos) * P.condF(b) - P.ovrAt(a, sl.pos) * P.condF(a));
    A.openSheet(`<div class="bar-top"><h2>Escolher ${esc(P.POS_NAME[sl.pos].toLowerCase())}</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
      <p class="muted" style="margin:0">Força mostrada já considera jogar como ${sl.pos}.</p>
      <div class="plist">${list.map((p) => {
        const j = t.xi.indexOf(p.id);
        const where = j === i ? '<span class="chip xi">Aqui</span>' : j >= 0 ? `<span class="chip xi">${P.slots(t.f)[j].pos}</span>` : '';
        return `<button class="prow" data-a="assign" data-i="${i}" data-id="${p.id}" ${P.available(p) ? '' : 'disabled style="opacity:.5"'}>
          <span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span>
          <span class="nm"><b>${esc(p.name)}${where}${status(p)}</b><small>${p.age} anos · força natural ${P.ovr(p)}</small></span>
          ${condBar(p)}<span class="ovr">${P.ovrAt(p, sl.pos)}</span></button>`;
      }).join('')}</div>`);
  };

  // ---------- Tabela ----------
  function vTabela() {
    const g = A.g, st = A.st;
    const tabs = `<div class="seg">${[['class', 'Classificação'], ['art', 'Artilharia'], ['rod', 'Rodadas']].map(([k, n]) => `<button class="${st.tab === k ? 'on' : ''}" data-a="tab" data-k="${k}">${n}</button>`).join('')}</div>`;
    let body = '';
    if (st.tab === 'class') {
      const tb = P.table(g), n = tb.length;
      body = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="n">#</th><th>Clube</th><th class="n">P</th><th class="n">J</th><th class="n">V</th><th class="n">E</th><th class="n">D</th><th class="n hide-sm">GP</th><th class="n hide-sm">GC</th><th class="n">SG</th><th class="hide-sm">Últimos</th></tr></thead><tbody>
        ${tb.map((r, i) => {
          const c = club(r.cid), z = i < 4 ? 'z1' : i < 6 ? 'z2' : i >= n - 4 ? 'z3' : '';
          return `<tr class="${r.cid === g.user ? 'me' : ''}"><td class="n"><span class="zone ${z}">${i + 1}</span></td>
            <td><span class="club">${P.badge(c, 20)}<span class="show-sm">${esc(c.short)}</span><span class="nm-long">${esc(c.name)}</span></span></td>
            <td class="n"><b>${r.pts}</b></td><td class="n">${r.j}</td><td class="n">${r.v}</td><td class="n">${r.e}</td><td class="n">${r.d}</td>
            <td class="n hide-sm">${r.gp}</td><td class="n hide-sm">${r.gc}</td><td class="n">${r.gp - r.gc}</td>
            <td class="hide-sm"><span class="form">${r.form.slice(-5).map((f) => `<i class="${f}">${f}</i>`).join('')}</span></td></tr>`;
        }).join('')}</tbody></table></div>
        <div class="row" style="margin-top:10px;font-size:.82rem"><span><span class="zone z1">&nbsp;</span> Copa Continental</span><span><span class="zone z2">&nbsp;</span> Pré-Continental</span><span><span class="zone z3">&nbsp;</span> Rebaixamento</span></div>`;
    } else if (st.tab === 'art') {
      const sc = P.scorers(g, 25);
      body = sc.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="n">#</th><th>Jogador</th><th>Clube</th><th class="n">G</th><th class="n">A</th><th class="n">J</th></tr></thead><tbody>
        ${sc.map((p, i) => { const c = club(p.clubId); return `<tr class="click ${p.clubId === g.user ? 'me' : ''}" data-a="player" data-id="${p.id}"><td class="n">${i + 1}</td><td>${esc(p.name)}</td><td><span class="club">${P.badge(c, 18)}${c ? esc(c.short) : '-'}</span></td><td class="n"><b>${p.s.g}</b></td><td class="n">${p.s.as}</td><td class="n">${p.s.j}</td></tr>`; }).join('')}
        </tbody></table></div>` : '<p class="empty">Ninguém marcou ainda.</p>';
    } else {
      const total = g.fixtures.length;
      if (st.rd == null) st.rd = Math.max(0, Math.min(total - 1, g.round - 1));
      const rd = g.fixtures[st.rd];
      body = `<div class="row" style="justify-content:center;margin-bottom:12px"><button class="btn sm" data-a="rd" data-d="-1" ${st.rd <= 0 ? 'disabled' : ''} aria-label="Rodada anterior">‹</button>
        <b style="font-family:var(--f-display);font-size:1.2rem;min-width:110px;text-align:center">Rodada ${st.rd + 1}</b>
        <button class="btn sm" data-a="rd" data-d="1" ${st.rd >= total - 1 ? 'disabled' : ''} aria-label="Próxima rodada">›</button></div>
        <div class="others">${rd.map((f) => f.done ? ogRow(f, f.hg, f.ag, true) : ogRow(f, '', '', false)).join('')}</div>
        <p class="muted" style="font-size:.85rem">Toque num jogo disputado para ver o relatório.</p>`;
    }
    return `<div class="card"><div class="head"><h2>Campeonato ${g.season}</h2>${tabs}</div>${body}</div>`;
  }

  // ---------- Relatório de partida ----------
  function evLine(e, fx) {
    const p = pl(e.p), name = p ? esc(p.name) : '?';
    const min = e.t === 'int' ? '45\'' : (e.x ? `90+${e.x}'` : `${e.m}'`);
    const c = e.s != null ? club(e.s === 0 ? fx.h : fx.a) : null;
    let ico = '', txt = '';
    if (e.t === 'gol') { ico = I.ball; txt = `<b>GOL do ${esc(c.short)}!</b> ${name}${e.as && pl(e.as) ? ` <span class="muted">(assist. ${esc(pl(e.as).name)})</span>` : ''}`; }
    else if (e.t === 'amarelo') { ico = '<span class="yc"></span>'; txt = `${name} <span class="muted">(${esc(c.short)})</span> recebe amarelo`; }
    else if (e.t === 'vermelho') { ico = '<span class="rc"></span>'; txt = `${name} <span class="muted">(${esc(c.short)})</span> expulso${e.two ? ' (2º amarelo)' : ''}`; }
    else if (e.t === 'lesao') { ico = I.cross; txt = `${name} <span class="muted">(${esc(c.short)})</span> se machuca${e.sub && pl(e.sub) ? `, entra ${esc(pl(e.sub).name)}` : ''}`; }
    else if (e.t === 'chance') { ico = I.save; txt = `<span class="muted">Defesa do goleiro em chute de</span> ${name}`; }
    else if (e.t === 'int') { ico = ''; txt = '<span class="muted">Fim do primeiro tempo</span>'; }
    return `<li><span class="m">${min}</span><span>${ico}</span><span>${txt}</span></li>`;
  }
  A.reportSheet = function (h, a) {
    const g = A.g;
    let fx = null;
    g.fixtures.forEach((rd) => rd.forEach((f) => { if (f.h === h && f.a === a) fx = f; }));
    if (!fx || !fx.done) return;
    const H = club(fx.h), Aw = club(fx.a);
    const evs = (fx.ev || []).filter((e) => e.t !== 'chance' || true);
    const bestId = Object.entries(fx.notes || {}).sort((x, y) => y[1] - x[1])[0];
    const best = bestId && pl(bestId[0]);
    A.openSheet(`<div class="bar-top"><h2>Relatório</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
      ${boardHTML(fx, fx.hg, fx.ag, 'Fim de jogo', fx.st)}
      <div class="kv"><div><span class="label">Finalizações</span><b class="num">${fx.st.sh[0]} × ${fx.st.sh[1]}</b></div>
        <div><span class="label">Posse</span><b class="num">${fx.st.pos}% × ${100 - fx.st.pos}%</b></div>
        ${best ? `<div><span class="label">Destaque</span><b>${esc(best.name)} ${String(bestId[1]).replace('.', ',')}</b></div>` : ''}</div>
      <ul class="feed">${evs.map((e) => evLine(e, fx)).join('') || '<li><span></span><span></span><span class="muted">Jogo sem lances marcantes.</span></li>'}</ul>
      <p class="muted" style="margin:0;font-size:.85rem">${esc(H.stadium)} · ${esc(H.city)} · ${esc(H.name)} × ${esc(Aw.name)}</p>`);
  };
  function boardHTML(fx, hg, ag, clock, st) {
    const H = club(fx.h), Aw = club(fx.a);
    return `<div class="board"><div class="sc">
        <div class="t">${P.badge(H, 46)}<b>${esc(H.name)}</b></div>
        <div class="score num" id="md-score">${hg}<span style="opacity:.5"> : </span>${ag}</div>
        <div class="t">${P.badge(Aw, 46)}<b>${esc(Aw.name)}</b></div></div>
      <div class="clock" id="md-clock">${clock}</div>
      ${st ? `<div class="possess"><span>${st.pos}%</span><span class="tr"><i style="width:${st.pos}%"></i></span><span style="text-align:right">${100 - st.pos}%</span></div>` : ''}
    </div>`;
  }

  // ---------- Dia de jogo (animação da rodada) ----------
  const key = (e) => (e.x ? 90 + e.x : e.m);
  A.startMatchday = function (results) {
    const g = A.g;
    const mine = results.find(({ fx }) => fx.h === g.user || fx.a === g.user);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    A.md = { results, mine: mine ? mine.fx : null, T: reduce ? 96 : 0, speed: 1, round: g.round };
    let el = document.getElementById('md');
    if (!el) { el = document.createElement('div'); el.id = 'md'; el.className = 'md'; document.body.appendChild(el); }
    el.hidden = false;
    A.drawMatchday();
    A.tickMatchday();
  };
  A.tickMatchday = function () {
    clearTimeout(A._mdt);
    const md = A.md; if (!md) return;
    if (md.T >= 96) { A.drawMatchday(); return; }
    A._mdt = setTimeout(() => { md.T++; A.drawMatchday(); A.tickMatchday(); }, md.speed === 1 ? 140 : 35);
  };
  A.drawMatchday = function () {
    const md = A.md, el = document.getElementById('md');
    if (!md || !el) return;
    const T = md.T, done = T >= 96;
    const score = (fx) => {
      let h = 0, a = 0;
      for (const e of fx.ev) if (e.t === 'gol' && key(e) <= T) { if (e.s === 0) h++; else a++; }
      return [h, a];
    };
    const clock = done ? 'Fim de jogo' : T === 0 ? 'Bola rolando' : T <= 90 ? `${T}'` : `90+${T - 90}'`;
    const fx = md.mine;
    let main = '';
    if (fx) {
      const [h, a] = score(fx);
      const evs = fx.ev.filter((e) => key(e) <= T && (e.t !== 'int' || T > 45)).slice().reverse();
      main = `${boardHTML(fx, h, a, clock, fx.st)}
        ${done ? `<div class="kv"><div><span class="label">Finalizações</span><b class="num">${fx.st.sh[0]} × ${fx.st.sh[1]}</b></div><div><span class="label">Posse</span><b class="num">${fx.st.pos}% × ${100 - fx.st.pos}%</b></div></div>` : ''}
        <ul class="feed" aria-live="polite">${evs.map((e) => evLine(e, fx)).join('')}</ul>`;
    }
    const others = md.results.filter((r) => r.fx !== fx).map(({ fx: f }) => {
      const [h, a] = score(f);
      const flash = f.ev.some((e) => e.t === 'gol' && key(e) <= T && key(e) > T - 3);
      return ogRow(f, h, a, false, flash && !done);
    }).join('');
    el.innerHTML = `<div class="md-in">
      <div class="row"><h2 style="flex:1">Rodada ${md.round}</h2>
        ${done ? '' : `<div class="seg"><button class="${md.speed === 1 ? 'on' : ''}" data-a="mdSpeed" data-s="1">Normal</button><button class="${md.speed === 3 ? 'on' : ''}" data-a="mdSpeed" data-s="3">Rápido</button></div><button class="btn sm" data-a="mdSkip">Pular</button>`}
      </div>
      ${main}
      <div class="label">Outros jogos</div>
      <div class="others">${others}</div>
      ${done ? '<div class="row"><button class="btn" data-a="mdClose" data-v="tabela">Ver tabela</button><span class="spacer"></span><button class="btn primary" data-a="mdClose" data-v="inicio">Continuar</button></div>' : ''}
    </div>`;
  };

  // ---------- Mais ----------
  function vMais() {
    const g = A.g, st = A.st;
    return `<div class="grid2">
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="head" style="margin:0"><h2>Editor</h2></div>
        <p class="muted" style="margin:0">Mude nomes, cores, atributos, idade e posição. Adicione, remova ou transfira jogadores. As mudanças valem na hora.</p>
        <div><button class="btn primary" data-a="go" data-v="editor">Abrir editor</button></div></div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="head" style="margin:0"><h2>Carreira</h2></div>
        <div class="muted">${esc(g.manager)} · ${esc(club(g.user).name)} · temporada ${g.season}</div>
        ${g.hist.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ano</th><th>Campeão</th><th class="n">Seu time</th><th class="hide-sm">Artilheiro</th></tr></thead><tbody>${g.hist.slice().reverse().map((h) => `<tr><td>${h.season}</td><td>${esc(h.champ)}</td><td class="n">${ord(h.myPos)}</td><td class="hide-sm">${esc(h.top)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty" style="padding:0">O histórico aparece ao fim da primeira temporada.</p>'}
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="head" style="margin:0"><h2>Salvar e transferir</h2></div>
        <p class="muted" style="margin:0">O jogo salva sozinho neste navegador depois de cada rodada. Para continuar em outro aparelho, exporte a carreira e importe lá.</p>
        <div class="row"><button class="btn" data-a="exportGame">Exportar carreira</button><button class="btn" data-a="importGame">Importar carreira</button></div>
        <div id="io-box">${st.io || ''}</div>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="head" style="margin:0"><h2>Novo jogo</h2></div>
        <p class="muted" style="margin:0">Volta para a escolha de clube. A carreira atual é apagada deste navegador.</p>
        ${st.confirm === 'newgame' ? `<div class="confirm"><b>Apagar a carreira atual?</b><div class="row"><button class="btn" data-a="confirm" data-k="">Cancelar</button><button class="btn danger" data-a="newGameYes">Apagar e recomeçar</button></div></div>` : '<div><button class="btn danger" data-a="confirm" data-k="newgame">Começar novo jogo</button></div>'}
      </div>
      <div class="card" style="grid-column:1/-1"><div class="head"><h2>Como funciona</h2></div>
        <ul class="muted" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">
          <li><b>Força</b> (1 a 99) vem dos atributos de 1 a 20, com peso diferente para cada posição. Fora da posição o jogador rende menos.</li>
          <li><b>Condição</b> cai a cada jogo e volta com descanso. Jogador cansado rende menos e se machuca mais: faça rodízio.</li>
          <li><b>Moral</b> sobe com vitórias e boas atuações e cai com derrotas ou falta de jogos.</li>
          <li>Três amarelos ou uma expulsão geram <b>suspensão</b>. Lesões duram de 1 a 5 rodadas.</li>
          <li>Os 4 primeiros vão à Copa Continental. Os 4 últimos seriam rebaixados (a segunda divisão é o próximo passo do projeto).</li>
        </ul></div>
    </div>`;
  }

  // ---------- Folha (modal) ----------
  A.openSheet = function (html) {
    let el = document.getElementById('sheet');
    if (!el) { el = document.createElement('div'); el.id = 'sheet'; document.body.appendChild(el); }
    el.innerHTML = `<div class="sheet-bg" data-a="bgClose"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
    el.hidden = false;
    const f = el.querySelector('button'); if (f) f.focus({ preventScroll: true });
  };
  A.closeSheet = function () { const el = document.getElementById('sheet'); if (el) { el.innerHTML = ''; el.hidden = true; } };

  // ---------- Importar/exportar ----------
  P.normalizeDb = function (db) {
    if (!db || !Array.isArray(db.clubs) || db.clubs.length < 2) throw new Error('O banco precisa ter pelo menos 2 clubes.');
    const ids = new Set();
    db.clubs.forEach((c, i) => {
      if (!c.id) c.id = 'c' + (i + 1) + '_' + Math.floor(Math.random() * 1e4);
      ids.add(c.id);
      c.name = String(c.name || 'Clube ' + (i + 1));
      c.short = String(c.short || c.name.slice(0, 3)).toUpperCase().slice(0, 3);
      c.city = String(c.city || ''); c.stadium = String(c.stadium || 'Estádio Municipal');
      c.colors = Array.isArray(c.colors) && c.colors.length >= 2 ? c.colors : ['#2f7d46', '#ffffff'];
      c.rep = P.clamp(Number(c.rep) || 65, 1, 100);
    });
    const players = Array.isArray(db.players) ? Object.fromEntries(db.players.map((p) => [p.id, p])) : (db.players || {});
    const out = {};
    Object.values(players).forEach((p) => {
      if (!p || typeof p !== 'object') return;
      p.id = p.id || P.uid('p');
      p.name = String(p.name || 'Jogador');
      p.pos = P.POS.includes(p.pos) ? p.pos : 'MC';
      p.age = P.clamp(Number(p.age) || 25, 15, 45);
      p.clubId = ids.has(p.clubId) ? p.clubId : null;
      p.a = p.a || {};
      P.ATTRS.forEach((at) => { p.a[at.k] = P.clamp(Math.round(Number(p.a[at.k]) || 10), 1, 20); });
      p.pot = Number(p.pot) || P.ovr(p) / 5;
      p.cond = p.cond == null ? 100 : P.clamp(Number(p.cond), 30, 100);
      p.mor = p.mor == null ? 70 : P.clamp(Number(p.mor), 20, 100);
      p.inj = Number(p.inj) || 0; p.susp = Number(p.susp) || 0; p.ylw = Number(p.ylw) || 0;
      p.s = Object.assign(P.blankStats(), p.s || {});
      out[p.id] = p;
    });
    for (const c of db.clubs) {
      const n = Object.values(out).filter((p) => p.clubId === c.id).length;
      if (n < 11) throw new Error(`${c.name} tem só ${n} jogadores. Cada clube precisa de pelo menos 11.`);
    }
    return { version: P.VERSION, clubs: db.clubs, players: out };
  };
  A.copyText = function (id) {
    const ta = document.getElementById(id); if (!ta) return;
    const done = () => A.toast('Copiado');
    try {
      navigator.clipboard.writeText(ta.value).then(done, () => { ta.focus(); ta.select(); A.toast('Texto selecionado: copie manualmente'); });
    } catch (e) { ta.focus(); ta.select(); A.toast('Texto selecionado: copie manualmente'); }
  };
  A.readFileInto = function (input, taId) {
    const f = input.files && input.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { const ta = document.getElementById(taId); if (ta) ta.value = String(rd.result || ''); A.toast('Arquivo carregado'); };
    rd.readAsText(f);
  };

  // ---------- Ações ----------
  Object.assign(ACT, {
    go(d) { A.view = d.v; A.st.slot = null; if (d.v === 'editor') A.st.ed = { v: 'clubs' }; A.render(); window.scrollTo(0, 0); },
    play() {
      const g = A.g; if (!g || g.over) return;
      const results = P.playRound(g);
      A.save();
      A.st.rd = null;
      A.startMatchday(results);
    },
    mdSpeed(d) { A.md.speed = Number(d.s); A.drawMatchday(); A.tickMatchday(); },
    mdSkip() { A.md.T = 96; clearTimeout(A._mdt); A.drawMatchday(); },
    mdClose(d) { clearTimeout(A._mdt); A.md = null; const el = document.getElementById('md'); if (el) { el.hidden = true; el.innerHTML = ''; } A.view = d.v || 'inicio'; A.render(); window.scrollTo(0, 0); },
    newSeason() { P.newSeason(A.g); A.save(); A.view = 'inicio'; A.st.rd = null; A.render(); A.toast(`Temporada ${A.g.season} começou`); },
    player(d) { A.playerSheet(d.id); },
    closeSheet() { A.closeSheet(); },
    bgClose(d, el, e) { if (e.target === el) A.closeSheet(); },
    filter(d) { A.st.filter = d.k; A.render(); },
    tab(d) { A.st.tab = d.k; A.render(); },
    rd(d) { A.st.rd = P.clamp(A.st.rd + Number(d.d), 0, A.g.fixtures.length - 1); A.render(); },
    report(d) { A.reportSheet(d.h, d.aw); },
    slot(d) { A.slotSheet(Number(d.i)); },
    assign(d) {
      const g = A.g, t = g.tac[g.user], i = Number(d.i);
      const j = t.xi.indexOf(d.id);
      if (j >= 0) { t.xi[j] = t.xi[i]; }
      t.xi[i] = d.id;
      if (t.auto) { t.auto = false; A.toast('Escalação manual: escalação automática desligada'); }
      A.save(); A.closeSheet(); A.render();
    },
    tac(d) { const t = A.g.tac[A.g.user]; t[d.k] = d.v; A.save(); A.render(); },
    bestXI() { const g = A.g, t = g.tac[g.user]; t.xi = P.autoXI(g, g.user, t.f); A.save(); A.render(); A.toast('Melhores escalados'); },
    editPlayer(d) { const p = pl(d.id); A.closeSheet(); A.st.ed = { v: 'player', cid: p.clubId, pid: p.id }; if (A.g) A.view = 'editor'; else A.setup.editing = true; A.render(); window.scrollTo(0, 0); },
    confirm(d) { A.st.confirm = d.k || null; A.render(); },
    newGameYes() { A.clearSave(); A.g = null; A.st.confirm = null; A.setup = { db: P.generateDatabase(Date.now() & 0xffff), club: null, manager: '', editing: false, importing: false }; A.render(); window.scrollTo(0, 0); },
    exportGame() {
      A.st.io = `<div class="field"><label class="label" for="io-text">Copie e guarde este texto (ou cole num arquivo .json)</label><textarea id="io-text" readonly>${esc(JSON.stringify(A.g))}</textarea></div><div class="row" style="margin-top:8px"><button class="btn" data-a="copy" data-t="io-text">Copiar</button></div>`;
      A.render();
    },
    importGame() {
      A.st.io = `<div class="field"><input type="file" accept=".json,.txt,application/json" data-c="ioFile"><textarea id="io-text" placeholder="Cole aqui a carreira exportada"></textarea></div>
        <div class="row" style="margin-top:8px"><span class="muted" style="flex:1;font-size:.85rem">Substitui a carreira atual.</span><button class="btn primary" data-a="applyGame">Carregar</button></div>`;
      A.render();
    },
    applyGame() {
      const ta = document.getElementById('io-text');
      try {
        const g = JSON.parse(ta.value);
        if (!g || !g.db || !g.fixtures || !g.tac || !g.user) throw new Error('Isto não parece uma carreira exportada.');
        g.db = P.normalizeDb(g.db);
        A.g = g; A.st.io = ''; A.save(); A.view = 'inicio'; A.render(); A.toast('Carreira carregada');
      } catch (e) { A.toast('Não deu para carregar: ' + e.message); }
    },
    copy(d) { A.copyText(d.t); },

    // tela inicial
    continue() { const s = A.loadSave(); if (s) { s.db = P.normalizeDb(s.db); A.g = s; A.view = 'inicio'; A.render(); } },
    pickClub(d) { A.setup.club = d.id; A.render(); },
    start() {
      const s = A.setup; if (!s.club) return;
      const mgr = (document.getElementById('mgr') || {}).value || s.manager || 'Técnico';
      A.g = P.newGame(s.db, s.club, mgr.trim() || 'Técnico');
      A.save(); A.view = 'inicio'; A.render(); window.scrollTo(0, 0);
    },
    setupEdit() { A.setup.editing = true; A.st.ed = { v: 'clubs' }; A.render(); window.scrollTo(0, 0); },
    setupImport() { A.setup.importing = !A.setup.importing; A.render(); },
    applyImport() {
      const ta = document.getElementById('imptext');
      try {
        const obj = JSON.parse(ta.value);
        if (obj && obj.fixtures && obj.db) { obj.db = P.normalizeDb(obj.db); A.g = obj; A.save(); A.view = 'inicio'; A.render(); A.toast('Carreira carregada'); return; }
        A.setup.db = P.normalizeDb(obj); A.setup.club = null; A.setup.importing = false; A.render(); A.toast('Banco de dados importado');
      } catch (e) { A.toast('Não deu para importar: ' + e.message); }
    }
  });

  Object.assign(CHG, {
    mgr(el) { A.setup.manager = el.value; },
    sort(el) { A.st.sort = el.value; A.render(); },
    formation(el) { const g = A.g, t = g.tac[g.user]; t.f = el.value; t.xi = P.autoXI(g, g.user, t.f); A.save(); A.render(); A.toast('Formação ' + t.f); },
    auto(el) { const g = A.g; g.tac[g.user].auto = el.checked; A.save(); },
    impFile(el) { A.readFileInto(el, 'imptext'); },
    ioFile(el) { A.readFileInto(el, 'io-text'); }
  });

  // ---------- Delegação de eventos ----------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const fn = ACT[el.dataset.a];
    if (fn) fn(el.dataset, el, e);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') A.closeSheet();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role=button][data-a]')) { e.preventDefault(); e.target.click(); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-c]');
    if (el && CHG[el.dataset.c]) CHG[el.dataset.c](el, e);
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-c="mgr"]');
    if (el) A.setup.manager = el.value;
  });
})(window.PFC);
