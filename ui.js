/* Prancheta FC — interface
 * Cada tela é uma função que devolve HTML. Botões usam data-a="nomeDaAcao" e
 * campos usam data-c="nomeDaAcao" (change) ou data-i="nomeDaAcao" (enquanto digita).
 * As ações ficam nos objetos ACT, CHG e INP.
 */
(function (P) {
  const SAVE_KEY = 'prancheta-fc:save:v2';
  const esc = P.esc;

  const A = P.app = {
    g: null,
    setup: { db: null, club: null, manager: '', editing: false, importing: false, creating: false, divF: 1, q: '', form: null },
    view: 'inicio',
    st: { sort: 'pos', filter: 'ALL', tab: 'class', div: null, rd: null, cupR: null, ed: { v: 'clubs' }, confirm: null, io: '' },
    md: null,
    reg: []
  };
  const ACT = A.ACT = {};
  const CHG = A.CHG = {};
  const INP = A.INP = {};

  A.db = () => (A.g ? A.g.db : A.setup.db);
  A.save = () => {
    if (!A.g) return;
    if (!P.store.set(SAVE_KEY, JSON.stringify(A.g))) A.toast('Não deu para salvar neste navegador. Use Mais › Exportar carreira.');
  };
  A.loadSave = () => {
    const raw = P.store.get(SAVE_KEY);
    if (!raw) return null;
    try { const g = JSON.parse(raw); return g && g.db && g.cal && g.lg ? g : null; } catch (e) { return null; }
  };
  A.clearSave = () => P.store.del(SAVE_KEY);

  // ---------- Ícones ----------
  const I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
    squad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3c-1 2-2.5 3-4 3S9 5 8 3z"/></svg>',
    tactic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 12h16"/><circle cx="12" cy="12" r="2.5"/><path d="M8 7l2 2m0-2l-2 2M14 16l2 2m0-2l-2 2"/></svg>',
    table: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v4a5 5 0 01-10 0V4z"/><path d="M7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4"/><path d="M12 13v4M8 21h8M9 17h6"/></svg>',
    market: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>',
    ball: '<svg class="ev-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10z" fill="currentColor"/></svg>',
    cross: '<svg class="ev-ico" viewBox="0 0 24 24" fill="none" stroke="var(--bad)" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    save: '<svg class="ev-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12a7 7 0 0114 0"/><path d="M9 12v5h6v-5"/></svg>',
    up: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2l4 6H2z" fill="var(--good)"/></svg>',
    down: '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10L2 4h8z" fill="var(--bad)"/></svg>'
  };

  // ---------- Escudo ----------
  // Escudo enviado pelo usuário: imagem pequena guardada no próprio clube (data URL)
  P.isLogo = (s) => typeof s === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(s) && s.length < 400000;
  P.badge = function (club, size) {
    size = size || 32;
    if (!club) return '';
    if (P.isLogo(club.logo)) return `<img class="badge badge-img" src="${club.logo}" width="${size}" height="${Math.round(size * 1.15)}" alt="" aria-hidden="true">`;
    const c1 = club.colors && club.colors[0] || '#888', c2 = club.colors && club.colors[1] || '#fff';
    const path = 'M20 2 L37 7 V22 C37 33 29 40 20 44 C11 40 3 33 3 22 V7 Z';
    return `<svg class="badge" width="${size}" height="${Math.round(size * 1.15)}" viewBox="0 0 40 46" aria-hidden="true">
      <path d="${path}" fill="${esc(c1)}" stroke="rgba(0,0,0,.35)" stroke-width="3.5"/>
      <path d="${path}" fill="${esc(c1)}" stroke="${esc(c2)}" stroke-width="2"/>
      <path d="M8 12h24" stroke="${esc(c2)}" stroke-width="2.5" opacity=".9"/>
      <text x="20" y="30" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="11" fill="${esc(c2)}">${esc(club.short || '')}</text>
    </svg>`;
  };

  // ---------- Helpers ----------
  const club = (cid) => A.db().clubs.find((c) => c.id === cid);
  const pl = (id) => A.db().players[id];
  const vcls = (v) => (v <= 6 ? 'v1' : v <= 10 ? 'v2' : v <= 15 ? 'v3' : 'v4');
  const condCls = (c) => (c >= 80 ? '' : c >= 60 ? 'mid' : 'low');
  const condBar = (p) => `<span class="cond ${condCls(p.cond)}" title="Condição ${Math.round(p.cond)}%"><i style="width:${Math.round(p.cond)}%"></i></span>`;
  const status = (p) => (p.inj ? `<span class="chip inj">${p.injN ? esc(p.injN) + ' · ' : 'Lesão '}${p.inj}s</span>` : '') + (p.susp ? '<span class="chip sus">Suspenso</span>' : '') + (p.unh ? '<span class="chip sus">Insatisfeito</span>' : '') + (P.adaptChip && p.ad ? P.adaptChip(p) : '');
  const avgNote = (p) => (p.s.j ? (p.s.nt / p.s.j).toFixed(1).replace('.', ',') : '–');
  const ord = (n) => n + 'º';
  const divName = (d) => `${d}ª divisão`;
  const divSel = (cur, act, label) => `<select class="sel" data-c="${act}" aria-label="${label || 'Divisão'}">${Array.from({ length: P.DIVS }, (_, i) => i + 1).map((d) => `<option value="${d}" ${cur === d ? 'selected' : ''}>${divName(d)}</option>`).join('')}</select>`;
  const countryOpts = (cur) => Object.entries(P.COUNTRIES).sort((a, b) => a[1].n.localeCompare(b[1].n)).map(([k, v]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${esc(v.n)}</option>`).join('');
  A.countryOpts = countryOpts;
  A.divSel = divSel;

  A.toast = function (msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(A._tt); A._tt = setTimeout(() => { t.hidden = true; }, 2600);
  };

  // Linha de partida (clicável quando há relatório)
  function ogRow(m, hg, ag, opts) {
    opts = opts || {};
    const h = club(m.h), a = club(m.a);
    const can = opts.click && m.done && m.ev;
    let ri = -1;
    if (can) { ri = A.reg.length; A.reg.push({ m, label: opts.label || '' }); }
    const pen = opts.pen ? `<small class="pen">${opts.pen[0]}-${opts.pen[1]} pên.</small>` : '';
    const mine = m.h === (A.g && A.g.user) || m.a === (A.g && A.g.user);
    return `<div class="og ${opts.flash ? 'flash' : ''} ${mine ? 'mine' : ''}" ${can ? `data-a="report" data-ri="${ri}" role="button" tabindex="0" style="cursor:pointer"` : ''}>
      <span class="hm"><span class="tn">${esc(opts.long ? h.name : h.short)}</span> ${P.badge(h, 18)}</span>
      <span class="s num">${hg === '' ? '×' : `${hg} × ${ag}`}${pen}</span>
      <span class="aw">${P.badge(a, 18)} <span class="tn">${esc(opts.long ? a.name : a.short)}</span></span></div>`;
  }

  // ---------- Render principal ----------
  A.render = function () {
    // um campo que perde o foco durante o redesenho pode pedir outro redesenho: deixa para logo depois
    if (A._rendering) { clearTimeout(A._rerender); A._rerender = setTimeout(() => A.render(), 0); return; }
    A._rendering = true;
    try { renderNow(); } finally { A._rendering = false; }
  };
  function renderNow() {
    A.reg = [];
    const root = document.getElementById('root');
    if (!A.g) {
      root.innerHTML = A.setup.editing ? P.editor.page(true) : A.setup.creating ? renderCreate() : A.setup.touring && P.tourView ? P.tourView() : renderSetup();
      return;
    }
    const g = A.g, me = club(g.user);
    const views = { inicio: vInicio, elenco: vElenco, tatica: () => (P.tacticsView ? P.tacticsView() : vTatica()), tabela: vTabela, mercado: () => P.marketView(), calendario: () => P.calendarView(), clube: () => P.clubView(), stats: () => P.statsView(), base: () => P.baseView(), mais: vMais, financas: vFinancas, editor: () => P.editor.page(false), tecnico: () => P.managerView(), treino: () => P.trainingView() };
    const nav = [['inicio', 'Início', I.home], ['elenco', 'Elenco', I.squad], ['tatica', 'Tática', I.tactic], ['tabela', 'Tabela', I.table], ['mercado', 'Mercado', I.market], ['mais', 'Mais', I.more]];
    const active = (A.view === 'editor' || A.view === 'financas' || A.view === 'clube' || A.view === 'stats' || A.view === 'tecnico') ? 'mais' : (A.view === 'base' || A.view === 'treino') ? 'elenco' : A.view === 'calendario' ? 'inicio' : A.view;
    const step = g.cal[g.week];
    const meta = g.over ? `Temporada ${g.season} encerrada` : `${divName(me.div)} · ${P.stepLabel(step)} · ${g.season}`;
    const hasGame = !g.over && P.userMatch(g);
    // Se uma tela quebrar, mostra o erro no lugar dela (o menu continua funcionando)
    let viewHTML;
    try { viewHTML = (views[A.view] || vInicio)(); }
    catch (e) {
      console.error(e);
      A.lastError = `${A.view}: ${e && e.message}\n${(e && e.stack || '').split('\n').slice(1, 4).join('\n')}`;
      viewHTML = `<div class="card"><div class="head"><span class="label">Esta página não abriu</span></div>
        <p style="margin:0 0 10px">Algo deu errado ao montar esta tela. O resto do jogo continua funcionando. Se puder, mande um print desta mensagem para corrigirmos:</p>
        <pre class="err-box">${esc(A.lastError)}</pre>
        <div class="row"><button class="btn" data-a="go" data-v="inicio">Voltar ao início</button></div></div>`;
    }
    root.innerHTML = `<div class="app">
      <header class="top">
        ${P.badge(me, 34)}
        <div class="who"><h1>${esc(me.name)}</h1><div class="meta"><button class="mgr-link" data-a="go" data-v="tecnico">${esc(g.manager)}</button> · ${esc(meta)}</div></div>
        ${P.calendarView ? `<button class="btn icon-btn" data-a="go" data-v="calendario" aria-label="Calendário" title="Calendário"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg></button>` : ''}
        ${g.over ? '<button class="btn primary" data-a="newSeason">Nova temporada</button>' : `<button class="btn primary" data-a="play">${hasGame ? 'Jogar' : 'Avançar'}</button>`}
      </header>
      <nav class="nav" aria-label="Seções">${nav.map(([k, n, ic]) => `<button data-a="go" data-v="${k}" class="${active === k ? 'on' : ''}" aria-current="${active === k ? 'page' : 'false'}">${ic}<span>${n}</span>${k === 'inicio' && P.unread && P.unread(g) ? `<i class="nav-dot" aria-label="${P.unread(g)} e-mails não lidos">${P.unread(g)}</i>` : ''}</button>`).join('')}</nav>
      <main class="main" id="view">${viewHTML}</main>
    </div>`;
    // faixas de abas com rolagem: mostra a aba ativa
    root.querySelectorAll('.tabs-x').forEach((bar) => { const on = bar.querySelector('.on'); if (on) bar.scrollLeft = on.offsetLeft - bar.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2; });
    if (P.firedModal) P.firedModal(g);
    if (P.showCelebration) P.showCelebration(g);
  }

  // ---------- Tela inicial ----------
  function renderSetup() {
    const s = A.setup, db = s.db;
    const ovrs = P.clubOvrs(db);
    const q = s.q.trim().toLowerCase();
    let list = q ? db.clubs.filter((c) => (c.name + ' ' + c.city + ' ' + P.countryName(c.country)).toLowerCase().includes(q)) : P.divClubs(db, s.divF);
    list = list.slice().sort((a, b) => a.div - b.div || ovrs[b.id] - ovrs[a.id]);
    const picked = s.club && db.clubs.find((c) => c.id === s.club);
    const now = new Date(), edition = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    return `<div class="setup jr">
      <header class="jr-mast">
        <div class="jr-mast-top"><span>Edição esportiva</span><span>Ano I · Nº ${edition}</span><span>R$ 0,50</span></div>
        <h1>Prancheta FC</h1>
        <div class="jr-tag">Monte o time. Suba a pirâmide. Escreva a sua história.</div>
      </header>
      ${P.slotsCard ? P.slotsCard() : ''}
      ${P.teamImportPanel ? P.teamImportPanel() : ''}
      ${P.tourEntry ? P.tourEntry() : ''}
      <section class="jr-classif" aria-labelledby="h-new">
        <div class="jr-classif-h"><h2 id="h-new">Procura-se técnico</h2><span>Classificados</span></div>
        <p>Clube da Ultraliga contrata. 160 clubes, 17 países, 8 divisões. Paga-se em glória. Interessados preencher abaixo.</p>
        <div class="field"><label class="jr-step" for="mgr">1 · Seu nome</label><input id="mgr" class="jr-sign" data-i="mgr" value="${esc(s.manager)}" placeholder="assine aqui" maxlength="30"></div>
        ${P.setupExtra ? P.setupExtra() : ''}
        ${P.slotPick ? P.slotPick() : ''}
        <button class="jr-found" data-a="createOpen"><span>…ou funde o seu próprio clube</span><b>Criar →</b></button>
        <div class="jr-small"><button class="jr-link" data-a="setupEdit">editar o banco de dados</button> · <button class="jr-link" data-a="setupImport">importar arquivo</button></div>
        ${s.importing ? importBox() : ''}
      </section>
      <section class="jr-sec" aria-labelledby="h-tab">
        <div class="jr-h jr-h-row"><h2 id="h-tab">5 · Escolha o clube</h2>${divSel(s.divF, 'setupDiv')}</div>
        <input class="jr-search" id="clubq" data-i="clubQ" value="${esc(s.q)}" placeholder="Buscar clube, cidade ou país…" aria-label="Buscar clube">
        <div class="jr-clubs" id="clublist" role="list">${clubCards(list, ovrs, db)}</div>
        <p class="jr-note">Força média do elenco à direita. Toque num clube para escolher.</p>
      </section>
      <div class="jr-sign-bar">
        <div class="jr-sigline ${s.manager.trim() ? '' : 'empty'}"><span id="jr-sig">${esc(s.manager.trim())}</span></div>
        <button class="jr-stamp" data-a="start" ${s.club ? '' : 'disabled'}>Assinar o contrato</button>
        <span class="jr-note">${picked ? `com o <b>${esc(picked.name)}</b> · ${divName(picked.div)}` : 'escolha um clube para começar'}</span>
      </div>
    </div>`;
  }
  function clubCards(list, ovrs, db) {
    if (!list.length) return '<p class="empty">Nenhum clube encontrado.</p>';
    return list.map((c, i) => `<button class="jr-club ${A.setup.club === c.id ? 'on' : ''}" role="listitem" data-a="pickClub" data-id="${c.id}" aria-pressed="${A.setup.club === c.id}">
      <span class="jr-strip" style="background:${esc(c.colors[0])};border-right-color:${esc(c.colors[1])}"></span>
      <span class="jr-rank">${String(i + 1).padStart(2, '0')}</span>
      <span class="jr-club-n"><b>${esc(c.name)}${c.custom ? ' <span class="chip xi">Seu</span>' : ''}</b><small>${esc(P.countryName(c.country))} · ${c.div}ª div · ${esc(P.expectation(db, c.id, ovrs))}</small></span>
      <span class="jr-ovr">${ovrs[c.id]}</span></button>`).join('');
  }
  function importBox() {
    return `<div class="card" style="background:var(--surface-2);display:flex;flex-direction:column;gap:10px">
      <b>Importar time, patch, banco de dados ou carreira</b>
      <p class="muted" style="margin:0">Escolha um arquivo .json (como o patch de clubes reais) ou cole o texto abaixo.</p>
      <input type="file" id="impfile" accept=".json,.txt,application/json" data-c="impFile" aria-label="Arquivo para importar">
      <div class="field"><textarea id="imptext" placeholder="Cole aqui o JSON"></textarea></div>
      <div class="row"><button class="btn" data-a="setupImport">Cancelar</button><span class="spacer"></span><button class="btn primary" data-a="applyImport">Importar</button></div>
    </div>`;
  }

  // ---------- Criar clube ----------
  function renderCreate() {
    const s = A.setup, db = s.db;
    const f = s.form || (s.form = { name: '', short: '', city: '', stadium: '', country: 'BRA', c1: '#1d6b3a', c2: '#ffffff', div: 8, replaceId: null, squad: 'auto' });
    const ovrs = P.clubOvrs(db);
    const divClubs = P.divClubs(db, f.div).sort((a, b) => ovrs[a.id] - ovrs[b.id]);
    if (!f.replaceId || !divClubs.find((c) => c.id === f.replaceId)) f.replaceId = divClubs[0].id;
    const preview = { name: f.name || 'Meu Clube', short: (f.short || 'MEU').toUpperCase(), colors: [f.c1, f.c2], logo: f.logo };
    const inp = (k, label, extra) => `<div class="field"><label class="label" for="cc-${k}">${label}</label><input id="cc-${k}" data-i="cc" data-k="${k}" value="${esc(f[k])}" ${extra || ''}></div>`;
    return `<div class="setup">
      <div class="row"><button class="btn" data-a="createClose">‹ Voltar</button></div>
      <div class="card" style="display:flex;flex-direction:column;gap:16px">
        <div class="row"><span id="cc-badge">${P.badge(preview, 56)}</span><div style="flex:1;min-width:0"><h2>Criar meu clube</h2><div class="muted">Ele entra na Ultraliga no lugar de um clube da divisão escolhida.</div></div></div>
        <div class="form-grid">
          ${inp('name', 'Nome do clube', 'maxlength="40" placeholder="Ex.: Esporte Clube Bairro Alto"')}
          ${inp('short', 'Sigla (3 letras)', 'maxlength="3" placeholder="EBA" style="text-transform:uppercase"')}
          ${inp('city', 'Cidade', 'maxlength="40"')}
          ${inp('stadium', 'Estádio', 'maxlength="50"')}
          <div class="field"><label class="label" for="cc-country">País</label><select id="cc-country" data-c="ccSel" data-k="country">${countryOpts(f.country)}</select></div>
          <div class="field logo-field"><span class="label">Escudo (opcional)</span><label class="btn sm logo-btn"><input type="file" accept="image/*" data-c="ccLogo" hidden>${f.logo ? 'Trocar imagem' : 'Enviar imagem'}</label>${f.logo ? '<button class="btn sm ghost" data-a="ccLogoDel">Usar o escudo padrão</button>' : '<small class="muted">Sem imagem, o escudo é desenhado com as cores e a sigla.</small>'}</div>
          <div class="field"><label class="label" for="cc-c1">Cor principal</label><input id="cc-c1" type="color" data-i="cc" data-k="c1" value="${esc(f.c1)}"></div>
          <div class="field"><label class="label" for="cc-c2">Cor secundária</label><input id="cc-c2" type="color" data-i="cc" data-k="c2" value="${esc(f.c2)}"></div>
        </div>
        <div class="form-grid">
          <div class="field"><label class="label" for="cc-div">Divisão inicial</label>${divSel(f.div, 'ccDiv', 'Divisão inicial').replace('<select', '<select id="cc-div"')}</div>
          <div class="field"><label class="label" for="cc-rep">Entra no lugar de</label><select id="cc-rep" data-c="ccSel" data-k="replaceId">${divClubs.map((c) => `<option value="${c.id}" ${f.replaceId === c.id ? 'selected' : ''}>${esc(c.name)} (força ${ovrs[c.id]})</option>`).join('')}</select></div>
        </div>
        ${P.createExtra ? P.createExtra(f) : ''}
        <fieldset class="radio"><legend class="label">Elenco inicial</legend>
          <label><input type="radio" name="squad" value="auto" data-c="ccSel" data-k="squad" ${f.squad === 'auto' ? 'checked' : ''}> <span><b>Gerado automaticamente</b><br><span class="muted">26 jogadores com nomes do país do clube, no nível da divisão.</span></span></label>
          <label><input type="radio" name="squad" value="generic" data-c="ccSel" data-k="squad" ${f.squad === 'generic' ? 'checked' : ''}> <span><b>Jogadores genéricos</b><br><span class="muted">"Jogador 01" a "Jogador 26", para você renomear e ajustar um por um.</span></span></label>
        </fieldset>
        <p class="muted" style="margin:0;font-size:.88rem">Depois de criar, você pode editar cada jogador e trazer atletas de outros clubes pelo editor.</p>
        <div class="row"><span class="spacer"></span><button class="btn primary" data-a="createDo">Criar clube</button></div>
      </div></div>`;
  }

  // ---------- Início ----------
  function userHistory(g) {
    const out = [];
    for (let w = 0; w < g.week && w < g.cal.length; w++) {
      const step = g.cal[w];
      const um = P.userMatch(g, step);
      if (um && um.m.done) out.push({ m: um.m, label: P.stepLabel(step), ko: um.ko });
    }
    return out;
  }
  P.cupStatus = function (g) {
    if (g.cup.winner === g.user) return 'Campeão';
    for (let r = g.cup.rounds.length - 1; r >= 0; r--) {
      const t = g.cup.rounds[r].ties.find((m) => m.h === g.user || m.a === g.user);
      if (t) return t.done ? (t.w === g.user ? 'Classificado' : 'Eliminado') : P.CUP_NAMES[r];
    }
    return g.cup.byes.includes(g.user) ? 'Na 1ª fase' : g.cup.rounds.length ? 'Eliminado' : 'Aguardando';
  };
  function zoneOf(d, i, n) {
    if (d === 1) return i === 0 ? 'z1' : i >= n - P.RULES.down ? 'z3' : '';
    if (i < P.RULES.autoUp) return 'z1';
    if (i >= P.RULES.playoff[0] - 1 && i < P.RULES.playoff[1]) return 'z2';
    if (d < P.DIVS && i >= n - P.RULES.down) return 'z3';
    return '';
  }
  function vInicio() {
    const g = A.g, me = club(g.user);
    const tb = P.table(g, me.div);
    const myIdx = tb.findIndex((r) => r.cid === g.user);
    const row = tb[myIdx];
    const squad = P.squad(g, g.user);
    const injured = squad.filter((p) => p.inj).length, susp = squad.filter((p) => p.susp).length, tired = squad.filter((p) => p.cond < 70).length;
    const posOf = (cid) => { const c = club(cid); const t = P.table(g, c.div); return t.findIndex((r) => r.cid === cid) + 1; };
    const form = (cid) => { const c = club(cid); const r = P.table(g, c.div).find((x) => x.cid === cid); return `<span class="form">${r.form.slice(-5).map((f) => `<i class="${f}">${f}</i>`).join('')}</span>`; };

    const hl = P.headline(g);
    const sg = hl.sg > 0 ? '+' + hl.sg : String(hl.sg);
    let top = `<article class="jr-lead">
        <span class="jr-kick">${esc(hl.kicker)}</span>
        <h2 class="jr-head">${esc(hl.head)}</h2>
        <p class="jr-dek">${esc(hl.dek)}</p>
        <div class="jr-3"><div><b>${hl.j ? hl.pos + 'º' : '–'}</b><span>posição</span></div><div><b>${hl.pts}</b><span>pontos</span></div><div><b>${sg}</b><span>saldo</span></div></div>
      </article>`;
    if (g.over) top += seasonSummary(g);
    else {
      const step = g.cal[g.week];
      const um = P.userMatch(g, step);
      if (um) {
        const h = club(um.m.h), a = club(um.m.a);
        const adj = P.adjName ? P.adjName(g) : 'Auxiliar';
        top += `<section class="jr-next"><div class="jr-next-h"><span>Próximo jogo</span><span>${esc(P.stepLabel(step))}</span></div>
          <div class="fixture">
            <div class="side"><button class="badge-btn" data-a="clubInfo" data-id="${h.id}" aria-label="Resumo do ${esc(h.name)}">${P.badge(h, 52)}</button><b>${esc(h.name)}</b><span class="sub">${h.div}ª div · ${ord(posOf(h.id))} · ${form(h.id)}</span></div>
            <div class="vs">vs.</div>
            <div class="side"><button class="badge-btn" data-a="clubInfo" data-id="${a.id}" aria-label="Resumo do ${esc(a.name)}">${P.badge(a, 52)}</button><b>${esc(a.name)}</b><span class="sub">${a.div}ª div · ${ord(posOf(a.id))} · ${form(a.id)}</span></div>
          </div>
          <p class="jr-venue">${um.m.neutral ? 'Campo neutro' : esc(h.stadium)}${um.ko ? ' · jogo único, empate vai para os pênaltis' : ''}</p>
          ${P.adjQuote ? `<blockquote class="jr-quote">“${esc(P.adjQuote(g, um))}”<cite>— ${esc(adj)}, auxiliar técnico</cite></blockquote>` : ''}
          ${P.scoutLine ? P.scoutLine(g, um) : ''}
          <div class="row jr-next-act"><button class="btn primary" data-a="play">Ir para o jogo</button><button class="btn" data-a="go" data-v="tatica">Tática</button><button class="btn ghost" data-a="go" data-v="calendario">Calendário</button></div></section>`;
      } else {
        top += `<section class="jr-next"><div class="jr-next-h"><span>Semana sem jogo</span><span>${esc(P.stepLabel(step))}</span></div>
          <p style="margin:0 0 12px">Seu time não joga nesta semana. Os jogadores descansam e recuperam o físico.</p>
          <div class="row"><button class="btn primary" data-a="play">Avançar semana</button></div></section>`;
      }
    }

    const idxs = new Set([0, 1, 2, 3, 4, 5, myIdx - 1, myIdx, myIdx + 1, tb.length - 3, tb.length - 2, tb.length - 1].filter((i) => i >= 0 && i < tb.length));
    let last = -1, mini = '';
    [...idxs].sort((a, b) => a - b).forEach((i) => {
      if (last >= 0 && i > last + 1) mini += '<tr><td colspan="5" class="muted" style="text-align:center">···</td></tr>';
      const r = tb[i], c = club(r.cid);
      mini += `<tr class="${r.cid === g.user ? 'me' : ''}"><td class="n"><span class="zone ${zoneOf(me.div, i, tb.length)}">${i + 1}</span></td><td><button class="club club-btn" data-a="clubInfo" data-id="${c.id}">${P.badge(c, 20)}${esc(c.name)}</button></td><td class="n">${r.j}</td><td class="n">${r.gp - r.gc}</td><td class="n"><b>${r.pts}</b></td></tr>`;
      last = i;
    });
    const hist = userHistory(g).slice(-5).reverse();

    return `${top}
      ${P.inboxCard ? P.inboxCard(g) : ''}
      ${P.boardCard ? P.boardCard(g) : ''}
      <div class="grid2">
        <div class="card"><div class="head"><span class="label">Situação</span><span class="label">Meta: ${esc(P.expectation(g, g.user))}</span></div>
          <div class="kv">
            <div><span class="label">Saldo</span><b class="${me.bal < 0 ? 'v1' : ''}" style="font-size:1.05rem">${P.money(me.bal)}</b></div>
            <div><span class="label">Divisão</span><b>${me.div}ª</b></div>
            <div><span class="label">Posição</span><b>${ord(myIdx + 1)}</b></div>
            <div><span class="label">Pontos</span><b>${row.pts}</b></div>
            <div><span class="label">Campanha</span><b>${row.v}-${row.e}-${row.d}</b></div>
            <div><span class="label">Copa Ultra</span><b style="font-size:1rem">${esc(P.cupStatus(g))}</b></div>
            ${P.rzStatus && P.rzStatus(g) ? `<div><span class="label">${esc(P.rzStatusName(g))}</span><b style="font-size:1rem">${esc(P.rzStatus(g))}</b></div>` : ''}
            ${P.scSeason && P.scSeason(g) ? `<div><span class="label">Supercopa</span><b style="font-size:1rem">${esc(P.scStatus(g))}</b></div>` : ''}
            <div><span class="label">Lesionados</span><b class="${injured ? 'v1' : ''}">${injured}</b></div>
            <div><span class="label">Suspensos</span><b class="${susp ? 'v2' : ''}">${susp}</b></div>
            <div><span class="label">Cansados</span><b class="${tired ? 'v2' : ''}">${tired}</b></div>
          </div></div>
        <div class="card"><div class="head"><span class="label">${divName(me.div)}</span><button class="btn sm ghost" data-a="go" data-v="tabela">Ver completa</button></div>
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="n">#</th><th>Clube</th><th class="n">J</th><th class="n">SG</th><th class="n">P</th></tr></thead><tbody>${mini}</tbody></table></div>
          ${zoneLegend(me.div)}</div>
      </div>
      <div class="grid2">
        <div class="card"><div class="head"><span class="label">Resultados</span></div>
          ${hist.length ? `<div class="others" style="grid-template-columns:1fr">${hist.map((x) => `<div class="hist-row"><span class="label">${esc(x.label)}</span>${ogRow(x.m, x.m.hg, x.m.ag, { click: true, pen: x.m.pen, label: x.label })}</div>`).join('')}</div>` : '<p class="empty">Nenhum jogo disputado ainda.</p>'}</div>
        <div class="card"><div class="head"><span class="label">Giro da rodada</span></div>
          <ul class="news">${g.news.slice(0, 10).map((n) => `<li class="${n.type}"><div>${esc(n.txt)}<small>Temporada ${n.s} · semana ${n.w}</small></div></li>`).join('')}</ul></div>
      </div>`;
  }
  function zoneLegend(d) {
    const items = d === 1 ? [['z1', 'Campeão'], ['z3', 'Rebaixamento']] : [['z1', 'Acesso direto'], ['z2', 'Playoff de acesso']].concat(d < P.DIVS ? [['z3', 'Rebaixamento']] : []);
    return `<div class="row legend">${items.map(([z, n]) => `<span><span class="zone ${z}">&nbsp;</span> ${n}</span>`).join('')}</div>`;
  }
  function seasonSummary(g) {
    const s = g.summary, me = club(g.user);
    const h = g.hist[g.hist.length - 1];
    const champ = club(s.divs[0].champ);
    const cup = s.cup && club(s.cup);
    const mv = (ids, icon) => ids.map((cid) => `<span class="mv">${icon}${esc(club(cid).short)}</span>`).join(' ');
    const note = (lbl, c, txt) => `<div class="rt-note">${c ? P.badge(c, 30) : ''}<div><span class="rt-lbl">${esc(lbl)}</span><b>${esc(txt || (c ? c.name : '-'))}</b></div></div>`;
    const mine = [h.cupMine ? 'campeão da Copa Ultra' : '', h.scMine ? 'campeão da Supercopa' : '', h.tzMine && P.tierByKey ? 'campeão da ' + P.tierByKey(h.tzMine).n : ''].filter(Boolean);
    const sq = P.squad(g, g.user).filter((p) => p.s && p.s.g > 0).sort((a, b) => b.s.g - a.s.g);
    const myTop = sq[0];
    return `<section class="rt">
      <div class="rt-band"><span>Retrospectiva</span><b>${g.season}</b></div>
      <div class="rt-me">${P.badge(me, 48)}<div><span class="rt-lbl">O ano do ${esc(me.short || me.name)}</span><b>${esc(h.result)}</b><small>${h.pos}º lugar na ${h.div}ª divisão${mine.length ? ' · ' + esc(mine.join(' · ')) : ''}${myTop ? ` · artilheiro do time: ${esc(myTop.name)} (${myTop.s.g})` : ''}</small></div></div>
      <h3 class="rt-h">Os campeões</h3>
      <div class="rt-notes">
        ${note('Ultraliga', champ)}
        ${note('Copa Ultra', cup)}
        ${s.sc ? note('Supercopa Ultra', club(s.sc)) : ''}
        ${h.tz && P.TIERS ? P.TIERS.filter((t) => h.tz[t.k]).map((t) => note(t.n, null, h.tz[t.k])).join('') : ''}
      </div>
      <div class="rt-star"><span class="rt-lbl">Craque do ano · artilheiro da Ultraliga</span><b>${esc(h.top)}</b></div>
      <h3 class="rt-h">Sobe e desce</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Div</th><th>Campeão</th><th>Sobem</th><th>Descem</th></tr></thead><tbody>
        ${s.divs.map((d) => `<tr class="${club(g.user) && d.d === me.div ? 'me' : ''}"><td>${d.d}ª</td><td>${esc(club(d.champ).short)}</td><td>${mv(d.up, I.up) || '–'}</td><td>${mv(d.down, I.down) || '–'}</td></tr>`).join('')}
      </tbody></table></div>
      ${P.seasonExtra ? P.seasonExtra(g) : ''}
      <p class="rt-foot">Na virada os jogadores envelhecem, jovens evoluem, veteranos caem de rendimento e alguns se aposentam.</p>
      <button class="btn primary" data-a="newSeason">Começar temporada ${g.season + 1}</button></section>`;
  }

  // ---------- Elenco ----------
  const LINE_ORDER = { GOL: 0, LD: 1, ZAG: 2, LE: 3, VOL: 4, MC: 5, MEI: 6, PD: 7, PE: 8, ATA: 9 };
  function sortPlayers(list, by) {
    const f = {
      pos: (a, b) => LINE_ORDER[a.pos] - LINE_ORDER[b.pos] || P.ovr(b) - P.ovr(a),
      ovr: (a, b) => P.ovr(b) - P.ovr(a),
      age: (a, b) => a.age - b.age,
      cond: (a, b) => a.cond - b.cond,
      gols: (a, b) => (b.s.g + b.s.cg) - (a.s.g + a.s.cg) || b.s.as - a.s.as,
      nota: (a, b) => (b.s.j ? b.s.nt / b.s.j : 0) - (a.s.j ? a.s.nt / a.s.j : 0)
    }[by] || (() => 0);
    return list.sort(f);
  }
  A.sortPlayers = sortPlayers;
  function vElenco() {
    const g = A.g, st = A.st;
    const xi = new Set(g.tac[g.user].xi);
    let list = P.squad(g, g.user);
    const total = list.slice();
    if (st.filter !== 'ALL') list = list.filter((p) => P.LINE[p.pos] === st.filter);
    sortPlayers(list, st.sort);
    const avgAge = (total.reduce((s, p) => s + p.age, 0) / total.length).toFixed(1).replace('.', ',');
    const val = total.reduce((s, p) => s + P.value(p), 0);
    return `<div class="card"><div class="head"><h2>Elenco</h2><button class="btn sm" data-a="go" data-v="treino">Treinamento</button><button class="btn sm" data-a="go" data-v="base">Sub-20 e olheiros</button><span class="muted">${total.length} jogadores · média ${avgAge} anos · ${P.money(val)}</span></div>
      <div class="filters" style="margin-bottom:8px">
        <div class="seg">${[['ALL', 'Todos'], ['GOL', 'GOL'], ['DEF', 'DEF'], ['MEI', 'MEI'], ['ATA', 'ATA']].map(([k, n]) => `<button class="${st.filter === k ? 'on' : ''}" data-a="filter" data-k="${k}">${n}</button>`).join('')}</div>
        <span class="spacer"></span>
        <label class="label" for="sortsel">Ordenar</label>
        <select id="sortsel" class="sel" data-c="sort">${[['pos', 'Posição'], ['ovr', 'Força'], ['age', 'Idade'], ['cond', 'Condição'], ['gols', 'Gols'], ['nota', 'Nota média']].map(([k, n]) => `<option value="${k}" ${st.sort === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
      </div>
      <div class="plist">${list.map((p) => `<button class="prow" data-a="player" data-id="${p.id}">
        <span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span>
        <span class="nm"><b>${esc(p.name)}${xi.has(p.id) ? '<span class="chip xi">Titular</span>' : ''}${status(p)}${p.ctr <= g.season ? '<span class="chip sus">Contrato acaba</span>' : ''}</b>
          <small>${esc(p.nat || '')} · ${p.age} anos · ${P.money(p.wage)}/mês · ${p.s.j} J · ${p.s.g + p.s.cg} G · nota ${avgNote(p)}</small></span>
        ${condBar(p)}<span class="ovr">${P.ovr(p)}</span></button>`).join('')}</div></div>`;
  }

  // ---------- Ficha do jogador ----------
  // ---------- Resumo de um clube ----------
  A.clubSheet = function (cid) {
    const g = A.g, c = club(cid); if (!g || !c) return;
    const tb = P.table(g, c.div), idx = tb.findIndex((r) => r.cid === cid), row = tb[idx];
    const sq = P.squad(g, cid).slice().sort((a, b) => LINE_ORDER[a.pos] - LINE_ORDER[b.pos] || P.ovr(b) - P.ovr(a));
    const ovrs = P.clubOvrs(g.db), t = g.tac[cid] || {};
    const val = sq.reduce((s, p) => s + P.value(p), 0);
    const avgAge = sq.length ? (sq.reduce((s, p) => s + p.age, 0) / sq.length).toFixed(1).replace('.', ',') : '–';
    const top = sq.filter((p) => p.s.g > 0).sort((a, b) => b.s.g - a.s.g)[0];
    const best = sq.slice().sort((a, b) => P.ovr(b) - P.ovr(a)).slice(0, 3);
    const xi = new Set(t.xi || []);
    // últimos jogos do clube na liga
    const recent = [];
    (g.lg[c.div] || []).forEach((rd) => rd.forEach((m) => { if (m.done && (m.h === cid || m.a === cid)) recent.push(m); }));
    const last = recent.slice(-5).reverse();
    const lines = { GOL: 'Goleiros', DEF: 'Defensores', MEI: 'Meio-campistas', ATA: 'Atacantes' };
    const groups = {}; sq.forEach((p) => (groups[P.LINE[p.pos]] = groups[P.LINE[p.pos]] || []).push(p));
    const mine = cid === g.user;
    A.openSheet(`<div class="bar-top"><h2>${esc(c.name)}</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
      <div class="cs-head">${P.badge(c, 72)}<div style="flex:1;min-width:0">
        <div class="jr-kick">${c.div}ª divisão · ${esc(P.countryName(c.country))}</div>
        <div class="cs-sub">${esc(c.city || '')}${c.stadium ? ' · ' + esc(c.stadium) : ''}${c.cap ? ` (${c.cap.toLocaleString('pt-BR')} lugares)` : ''}</div>
        <div class="cs-sub">${mine ? 'Seu clube' : 'Meta: ' + esc(P.expectation(g, cid))}</div></div></div>
      <div class="kv">
        <div><span class="label">Posição</span><b>${row && row.j ? idx + 1 + 'º' : '–'}</b></div>
        <div><span class="label">Pontos</span><b>${row ? row.pts : 0}</b></div>
        <div><span class="label">Campanha</span><b>${row ? `${row.v}-${row.e}-${row.d}` : '–'}</b></div>
        <div><span class="label">Saldo de gols</span><b>${row ? (row.gp - row.gc > 0 ? '+' : '') + (row.gp - row.gc) : 0}</b></div>
        <div><span class="label">Força</span><b>${ovrs[cid]}</b></div>
        <div><span class="label">Elenco</span><b>${sq.length} · ${avgAge} anos</b></div>
        <div><span class="label">Valor do elenco</span><b>${P.money(val)}</b></div>
        <div><span class="label">Esquema</span><b>${esc(t.xy ? 'Personalizado' : t.f || '–')}</b></div>
        ${top ? `<div><span class="label">Artilheiro</span><b>${esc(top.name)} <small class="muted">${top.s.g}</small></b></div>` : ''}
      </div>
      ${row && row.form.length ? `<div class="row" style="gap:8px"><span class="label">Forma</span><span class="form">${row.form.slice(-5).map((f) => `<i class="${f}">${f}</i>`).join('')}</span></div>` : ''}
      ${best.length ? `<div><div class="label" style="margin-bottom:6px">Destaques</div><div class="row">${best.map((p) => `<button class="pos-tag ${P.LINE[p.pos]} cs-star" data-a="player" data-id="${p.id}">${esc(p.name)} · ${P.ovr(p)}</button>`).join('')}</div></div>` : ''}
      ${last.length ? `<div><div class="label" style="margin-bottom:6px">Últimos jogos na liga</div><div class="others" style="grid-template-columns:1fr">${last.map((m) => ogRow(m, m.hg, m.ag)).join('')}</div></div>` : ''}
      ${Object.keys(lines).filter((k) => groups[k]).map((k) => `<div><div class="label" style="margin:4px 0 2px">${lines[k]} (${groups[k].length})</div><div class="plist">${groups[k].map((p) => `<button class="prow" data-a="player" data-id="${p.id}"><span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span><span class="nm"><b>${esc(p.name)}${xi.has(p.id) ? '<span class="chip xi">Titular</span>' : ''}</b><small>${p.age} anos · ${esc(P.countryName(p.nat))} · ${p.s.j} J · ${p.s.g} G</small></span><span></span><span class="ovr">${P.ovr(p)}</span></button>`).join('')}</div></div>`).join('')}`);
  };
  A.ACT.clubInfo = (d) => A.clubSheet(d.id);

  A.playerSheet = function (id, mode, years) {
    const p = pl(id); if (!p) return;
    const g = A.g, mine = g && p.clubId === g.user;
    let action = '';
    if (mine && mode === 'renew') {
      const o = P.renewOffer(g, p);
      years = years || 3;
      action = o.willing
        ? `<div class="card" style="display:flex;flex-direction:column;gap:10px"><b>Renovar contrato</b>
            <div class="muted">${esc(p.name)} pede <b>${P.money(o.wage)}/mês</b> (hoje ganha ${P.money(p.wage)}).</div>
            <div class="seg">${[1, 2, 3, 4, 5].map((y) => `<button class="${y === years ? 'on' : ''}" data-a="renewYears" data-id="${p.id}" data-y="${y}">${y} ${y === 1 ? 'ano' : 'anos'}</button>`).join('')}</div>
            <div class="muted" style="font-size:.88rem">Contrato até ${g.season + years}. Custo total: ${P.money(o.wage * 12 * years)}.</div>
            <div class="row"><button class="btn" data-a="player" data-id="${p.id}">Cancelar</button><span class="spacer"></span><button class="btn primary" data-a="renewDo" data-id="${p.id}" data-y="${years}">Renovar</button></div></div>`
        : `<div class="confirm"><b>${esc(p.name)} não quer renovar agora.</b><div class="muted">A moral dele está baixa. Coloque-o para jogar e vencer que ele muda de ideia.</div><div><button class="btn" data-a="player" data-id="${p.id}">Ok</button></div></div>`;
    }
    if (!mine && g && (mode === 'offer' || mode === 'loan')) action = P.marketPanel(p, mode);
    if (mine && mode === 'talk' && P.talkPanel) action = P.talkPanel(p);
    if (mine && mode === 'release') {
      const cost = P.releaseCost(g, p);
      action = `<div class="confirm"><b>Dispensar ${esc(p.name)}?</b><div>A rescisão custa <b>${P.money(cost)}</b> (metade dos salários restantes). Ele vira jogador livre.</div>
        <div class="row"><button class="btn" data-a="player" data-id="${p.id}">Cancelar</button><button class="btn danger" data-a="releaseDo" data-id="${p.id}">Dispensar</button></div></div>`;
    }
    const c = club(p.clubId);
    const groups = {};
    P.ATTRS.forEach((at) => { if (P.GK_ATTRS.includes(at.k) && p.pos !== 'GOL') return; (groups[at.g] = groups[at.g] || []).push(at); });
    const best = P.POS.map((pos) => ({ pos, v: P.ovrAt(p, pos) })).sort((a, b) => b.v - a.v).slice(0, 4);
    A.openSheet(`<div class="bar-top"><span class="pos-tag ${P.LINE[p.pos]}" style="padding:4px 8px">${p.pos}</span>
        <h2>${esc(p.name)}</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
      <div class="row">${P.badge(c, 30)}<div style="flex:1;min-width:0"><div>${esc(P.POS_NAME[p.pos])} · ${p.age} anos · ${esc(P.countryName(p.nat))}</div><div class="muted">${c ? esc(c.name) + ' · ' + c.div + 'ª div' : 'Sem clube'} ${status(p)}</div></div>
        <div style="text-align:right"><div class="label">Força</div><div class="big-ovr">${P.ovr(p)}</div></div></div>
      <div class="kv">
        <div><span class="label">Valor</span><b>${P.money(P.value(p))}</b></div>
        ${P.potOvr ? `<div><span class="label">Potencial</span><b>${p.age <= 24 ? (P.potBest ? (() => { const b = P.potBest(p); return b.v + (b.pos !== p.pos ? ` <small class="muted" style="font-size:.7rem">como ${b.pos}</small>` : ''); })() : P.potOvr(p)) : '—'}${p.potT ? `<span class="pot-t ${p.potT > 0 ? 'up' : 'dn'}">${p.potT > 0 ? '▲' : '▼'}${Math.abs(p.potT)}</span>` : ''}</b></div>` : ''}
        <div><span class="label">Salário</span><b>${P.money(p.wage || 0)}<span class="muted" style="font-size:.75rem">/mês</span></b></div>
        <div><span class="label">Contrato até</span><b class="${g && p.ctr <= g.season ? 'v2' : ''}">${p.ctr || '—'}</b></div>
        <div><span class="label">Condição</span><b class="${p.cond < 60 ? 'v1' : p.cond < 80 ? 'v2' : ''}">${Math.round(p.cond)}%</b></div>
        <div><span class="label">Moral</span><b>${moraleWord(p.mor)}</b></div>
        ${P.xp ? `<div><span class="label">Experiência</span><b>${Math.round(P.xp(p))} <small class="muted" style="font-size:.7rem">${P.xpWord(P.xp(p))}</small></b></div>` : ''}
        <div><span class="label">Jogos</span><b>${p.s.j}</b></div>
        <div><span class="label">Gols liga</span><b>${p.s.g}</b></div>
        <div><span class="label">Gols copa</span><b>${p.s.cg}</b></div>
        <div><span class="label">Assist.</span><b>${p.s.as}</b></div>
        <div><span class="label">Nota</span><b>${avgNote(p)}</b></div>
      </div>
      <div class="attrs">${Object.entries(groups).map(([gname, list]) => `<div class="grp"><h4 class="label">${gname}</h4>${list.map((at) => `<div class="attr"><span>${at.n}</span><b class="${vcls(p.a[at.k])}">${p.a[at.k]}</b></div>`).join('')}</div>`).join('')}</div>
      ${P.traitsBlock ? P.traitsBlock(p) : ''}
      ${P.adaptBlock ? P.adaptBlock(g, p) : ''}
      <div><div class="label" style="margin-bottom:6px">Rende em</div><div class="row">${best.map((b) => `<span class="pos-tag ${P.LINE[b.pos]}" style="padding:4px 10px">${b.pos} ${b.v}</span>`).join('')}</div></div>
      ${action}
      <div class="row">${mine && !mode && P.talkButton ? P.talkButton(p) : ''}${!mode && g ? P.marketButtons(p) : ''}${mine && !mode && P.canDemote && P.canDemote(g, p) ? `<button class="btn" data-a="yDemote" data-id="${p.id}">Devolver ao Sub-20</button>` : ''}${mine && !mode && !p.loan ? `<button class="btn" data-a="renewOpen" data-id="${p.id}">Renovar contrato</button><button class="btn danger" data-a="releaseOpen" data-id="${p.id}">Dispensar</button>` : ''}<span class="spacer"></span><button class="btn" data-a="editPlayer" data-id="${p.id}">Editar no editor</button></div>`);
    if (mode) { const sh = document.querySelector('.sheet'); if (sh) sh.scrollTop = sh.scrollHeight; }
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
    const bench = sortPlayers(P.squad(g, g.user).filter((p) => !xi.has(p.id)), 'pos');
    return `<div class="tac">
      <div class="card">
        <div class="head"><h2>Escalação</h2><select class="sel" data-c="formation" aria-label="Formação">${Object.keys(P.FORMATIONS).map((f) => `<option ${t.f === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
        <div class="pitch"><div class="ln mid"></div><div class="ln circ"></div><div class="ln box1"></div><div class="ln box2"></div>
          ${slots.map((sl, i) => {
            const p = pl(t.xi[i]);
            if (!p) return `<button class="slot" style="left:${sl.x}%;top:${100 - sl.y}%" data-a="slot" data-i="${i}"><span class="dot off">?</span><span class="nm">vazio</span><span class="ps">${sl.pos}</span></button>`;
            const f = P.fitP(p, sl.pos);
            const cc = p.cond >= 80 ? '#f3ead2' : p.cond >= 60 ? '#e2b04a' : '#e0645a';
            const first = p.name.split(' ')[0];
            const short = p.name.length <= 11 ? p.name : first.slice(0, 10);
            return `<button class="slot ${sel === i ? 'sel' : ''}" style="left:${sl.x}%;top:${100 - sl.y}%" data-a="slot" data-i="${i}" aria-label="${esc(p.name)}, ${sl.pos}">
              <span class="dot ${!P.available(p) ? 'off' : f < 1 ? 'fit' : ''}" style="--c:${cc}">${P.ovrAt(p, sl.pos)}</span>
              <span class="nm">${esc(short)}</span><span class="ps">${sl.pos}</span></button>`;
          }).join('')}
        </div>
        <p class="muted" style="margin:10px 0 0;font-size:.85rem">Toque num jogador para trocar. Amarelo = fora da posição de origem. A barrinha mostra a condição física.</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div class="card"><div class="head"><span class="label">Força do time</span></div>
          <div class="bars">${bars.map(([n, v]) => `<div class="bar"><span>${n}</span><span class="tr str"><i style="width:${P.clamp(toScore(v) / 1.3, 0, 100)}%"></i></span><b class="num">${toScore(v)}</b></div>`).join('')}</div>
          <p class="str-note">A marca vermelha é o 100: o nível de um setor de elite. Entrosamento, moral, funções e instruções táticas podem levar um setor além disso.</p></div>
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
    const g = A.g, t = g.tac[g.user], sl = P.slots(t)[i];
    const list = P.squad(g, g.user).sort((a, b) => P.ovrAt(b, sl.pos) * P.condF(b) - P.ovrAt(a, sl.pos) * P.condF(a));
    A.openSheet(`<div class="bar-top"><h2>Escolher ${esc(P.POS_NAME[sl.pos].toLowerCase())}</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
      <p class="muted" style="margin:0">Força mostrada já considera jogar como ${sl.pos}.</p>
      <div class="plist">${list.map((p) => {
        const j = t.xi.indexOf(p.id);
        const where = j === i ? '<span class="chip xi">Aqui</span>' : j >= 0 ? `<span class="chip xi">${P.slots(t)[j].pos}</span>` : '';
        return `<button class="prow" data-a="assign" data-i="${i}" data-id="${p.id}" ${P.available(p) ? '' : 'disabled style="opacity:.5"'}>
          <span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span>
          <span class="nm"><b>${esc(p.name)}${where}${status(p)}</b><small>${p.age} anos · força natural ${P.ovr(p)}</small></span>
          ${condBar(p)}<span class="ovr">${P.ovrAt(p, sl.pos)}</span></button>`;
      }).join('')}</div>`);
  };

  // ---------- Tabela ----------
  function vTabela() {
    const g = A.g, st = A.st, me = club(g.user);
    if (st.div == null) st.div = me.div;
    const d = st.div;
    const tabs = `<div class="seg tabs-x">${[['class', 'Classificação'], ['art', 'Estatísticas'], ['rod', 'Rodadas'], ['cup', 'Copa Ultra'], ['rz', (P.rzStatusName && P.rzStatusName(g)) || 'Copas regionais'], ['sc', 'Supercopa']].map(([k, n]) => `<button class="${st.tab === k ? 'on' : ''}" data-a="tab" data-k="${k}">${n}</button>`).join('')}</div>`;
    let body = '';
    if (st.tab === 'cup') return `<div class="card"><div class="head"><h2>Copa Ultra ${g.season}</h2>${tabs}</div>${cupView(g)}</div>`;
    if (st.tab === 'rz') return `<div class="card"><div class="head"><h2>Copas por divisão ${g.season}</h2>${tabs}</div>${P.raizesView(g)}</div>`;
    if (st.tab === 'sc') return `<div class="card"><div class="head"><h2>Supercopa Ultra</h2>${tabs}</div>${P.superView(g)}</div>`;
    if (st.tab === 'class') {
      const tb = P.table(g, d), n = tb.length;
      body = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="n">#</th><th>Clube</th><th class="n">P</th><th class="n">J</th><th class="n">V</th><th class="n">E</th><th class="n">D</th><th class="n hide-sm">GP</th><th class="n hide-sm">GC</th><th class="n">SG</th><th class="hide-sm">Últimos</th></tr></thead><tbody>
        ${tb.map((r, i) => {
          const c = club(r.cid);
          return `<tr class="${r.cid === g.user ? 'me' : ''}"><td class="n"><span class="zone ${zoneOf(d, i, n)}">${i + 1}</span></td>
            <td><button class="club club-btn" data-a="clubInfo" data-id="${c.id}">${P.badge(c, 20)}<span class="show-sm">${esc(c.short)}</span><span class="nm-long">${esc(c.name)}</span></button></td>
            <td class="n"><b>${r.pts}</b></td><td class="n">${r.j}</td><td class="n">${r.v}</td><td class="n">${r.e}</td><td class="n">${r.d}</td>
            <td class="n hide-sm">${r.gp}</td><td class="n hide-sm">${r.gc}</td><td class="n">${r.gp - r.gc}</td>
            <td class="hide-sm"><span class="form">${r.form.slice(-5).map((f) => `<i class="${f}">${f}</i>`).join('')}</span></td></tr>`;
        }).join('')}</tbody></table></div>${zoneLegend(d)}${playoffView(g, d)}`;
    } else if (st.tab === 'art') {
      const po = d > 1 && g.po && st.cstPo;
      body = (d > 1 && g.po ? `<div class="seg" style="margin-bottom:10px">${[[0, 'Liga'], [1, 'Playoffs']].map(([k, n]) => `<button class="${!!po === !!k ? 'on' : ''}" data-a="cstPo" data-k="${k}">${n}</button>`).join('')}</div>` : '')
        + P.compStatsView(g, po ? 'po' : 'lg', (p) => { const c = club(p.clubId); return c && c.div === d; }, { minNote: po ? 1 : 5, empty: 'Ninguém jogou ainda nesta divisão.' });
    } else {
      const fx = g.lg[d], total = fx.length;
      if (st.rd == null) { const played = fx.filter((rd) => rd[0] && rd[0].done).length; st.rd = Math.max(0, Math.min(total - 1, played - 1)); }
      const rd = fx[st.rd];
      body = `<div class="row" style="justify-content:center;margin-bottom:12px"><button class="btn sm" data-a="rd" data-d="-1" ${st.rd <= 0 ? 'disabled' : ''} aria-label="Rodada anterior">‹</button>
        <b style="font-family:var(--f-display);font-size:1.2rem;min-width:110px;text-align:center">Rodada ${st.rd + 1}</b>
        <button class="btn sm" data-a="rd" data-d="1" ${st.rd >= total - 1 ? 'disabled' : ''} aria-label="Próxima rodada">›</button></div>
        <div class="others">${rd.map((m) => m.done ? ogRow(m, m.hg, m.ag, { click: true, label: 'Rodada ' + (st.rd + 1) }) : ogRow(m, '', '')).join('')}</div>
        <p class="muted" style="font-size:.85rem">${d === me.div ? 'Toque num jogo disputado para ver o relatório.' : 'Relatórios completos ficam guardados só para a sua divisão.'}</p>`;
    }
    return `<div class="card"><div class="head"><h2>Ultraliga ${g.season}</h2>${tabs}</div>
      <div class="filters" style="margin-bottom:12px">${divSel(d, 'tblDiv')}${d !== me.div ? `<button class="btn sm ghost" data-a="myDiv">Minha divisão</button>` : ''}</div>${body}</div>`;
  }
  function playoffView(g, d) {
    if (d === 1) return '';
    if (!g.po || !g.po[d]) return `<p class="muted" style="font-size:.85rem;margin:12px 0 0">Playoff de acesso no fim da temporada: 3º × 6º e 4º × 5º em jogo único, final na casa do mais bem colocado.</p>`;
    const po = g.po[d];
    const row = (m, label) => (m ? `<div class="hist-row"><span class="label">${label}</span>${m.done ? ogRow(m, m.hg, m.ag, { click: true, pen: m.pen, long: true, label: 'Playoff · ' + label }) : ogRow(m, '', '', { long: true })}</div>` : '');
    return `<div style="margin-top:16px"><div class="label" style="margin-bottom:8px">Playoff de acesso</div>
      <div class="others" style="grid-template-columns:1fr">${row(po.semi[0], 'Semifinal')}${row(po.semi[1], 'Semifinal')}${row(po.final, 'Final')}</div>
      ${po.w ? `<p style="margin:8px 0 0"><b>${esc(club(po.w).name)}</b> conquistou o acesso pelo playoff.</p>` : ''}</div>`;
  }
  function cupView(g) {
    const st = A.st;
    const rounds = g.cup.rounds;
    if (!rounds.length) {
      const next = g.cal.findIndex((s) => s.t === 'cup');
      return `<p class="empty">A Copa Ultra começa depois da rodada ${P.CUP_AFTER[0]} da liga. 160 clubes, jogo único e pênaltis em caso de empate. Os 96 mais fortes entram direto na 1ª fase.</p>${next < 0 ? '' : ''}`;
    }
    if (st.cupR == null || st.cupR >= rounds.length) st.cupR = rounds.length - 1;
    const r = rounds[st.cupR];
    const mineFirst = r.ties.slice().sort((a, b) => ((b.h === g.user || b.a === g.user) ? 1 : 0) - ((a.h === g.user || a.a === g.user) ? 1 : 0));
    return `${g.cup.winner ? `<div class="winner">${P.badge(club(g.cup.winner), 40)}<div><span class="label">Campeão</span><h3>${esc(club(g.cup.winner).name)}</h3></div></div>` : ''}
      <div class="filters" style="margin-bottom:12px"><select class="sel" data-c="cupR" aria-label="Fase da copa">${rounds.map((x, i) => `<option value="${i}" ${i === st.cupR ? 'selected' : ''}>${x.name} (${x.ties.length} ${x.ties.length === 1 ? 'jogo' : 'jogos'})</option>`).join('')}</select>
        <span class="muted">Status do seu time: <b>${esc(P.cupStatus(g))}</b></span></div>
      <div class="others">${mineFirst.map((m) => m.done ? ogRow(m, m.hg, m.ag, { click: true, pen: m.pen, label: 'Copa Ultra · ' + r.name }) : ogRow(m, '', '')).join('')}</div>
      ${P.compStatsView(g, 'cup', null, { title: 'Estatísticas da copa', minNote: 2 })}`;
  }

  // ---------- Relatório de partida ----------
  function evLine(e, m) {
    const p = pl(e.p), name = p ? esc(p.name) : '?';
    const min = e.t === 'int' ? '45\'' : (e.x ? `90+${e.x}'` : `${e.m}'`);
    const c = e.s != null ? club(e.s === 0 ? m.h : m.a) : null;
    let ico = '', txt = '';
    if (e.t === 'gol') { const how = { pen: 'de pênalti', fal: 'de falta', esc: 'de cabeça, no escanteio' }[e.sp]; ico = I.ball; txt = `<b>GOL do ${esc(c.short)}!</b> ${name}${how ? ` <span class="sp-tag">${how}</span>` : ''}${e.as && pl(e.as) ? ` <span class="muted">(${e.sp === 'esc' ? 'cobrança de' : 'assist.'} ${esc(pl(e.as).name)})</span>` : ''}`; }
    else if (e.t === 'amarelo') { ico = '<span class="yc"></span>'; txt = `${name} <span class="muted">(${esc(c.short)})</span> recebe amarelo`; }
    else if (e.t === 'vermelho') { ico = '<span class="rc"></span>'; txt = `${name} <span class="muted">(${esc(c.short)})</span> expulso${e.two ? ' (2º amarelo)' : ''}`; }
    else if (e.t === 'lesao') { ico = I.cross; txt = `${name} <span class="muted">(${esc(c.short)})</span> se machuca${e.sub && pl(e.sub) ? `, entra ${esc(pl(e.sub).name)}` : ''}`; }
    else if (e.t === 'penmiss') { ico = I.save; txt = `<b>Pênalti perdido!</b> ${name} <span class="muted">(${esc(c.short)})</span> não converte`; }
    else if (e.t === 'chance') { ico = I.save; txt = `<span class="muted">Defesa do goleiro em chute de</span> ${name}`; }
    else if (e.t === 'int') { txt = '<span class="muted">Fim do primeiro tempo</span>'; }
    else if (e.t === 'sub') { ico = '<span class="sub-ico">⇄</span>'; const o = pl(e.o); txt = `<span class="muted">(${esc(c.short)})</span> Entra ${name}${o ? `, sai ${esc(o.name)}` : ''}`; }
    return `<li class="ev-${e.t}"><span class="m">${min}</span><span>${ico}</span><span>${txt}</span></li>`;
  }
  A.reportSheet = function (ri) {
    const it = A.reg[ri]; if (!it) return;
    A._rtSheet = ri;
    const m = it.m;
    const H = club(m.h), Aw = club(m.a);
    const bestId = Object.entries(m.notes || {}).sort((x, y) => y[1] - x[1])[0];
    const best = bestId && pl(bestId[0]);
    const clock = m.pen ? `Fim de jogo · pênaltis ${m.pen[0]} × ${m.pen[1]}` : 'Fim de jogo';
    A.openSheet(`<div class="bar-top"><h2>${esc(it.label || 'Relatório')}</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
      ${boardHTML(m, m.hg, m.ag, clock, m.st)}
      ${m.st ? A.matchStatsHTML(A.statsFrom(m.st, m.ev)) : ''}
      ${A.ratingsHTML(m)}
      <div class="kv">${best ? `<div><span class="label">Destaque</span><b>${esc(best.name)} ${String(bestId[1]).replace('.', ',')}</b><span class="muted" style="font-size:.8rem">${esc((club(best.clubId) || {}).short || '')}</span></div>` : ''}</div>
      <ul class="feed">${(m.ev || []).map((e) => evLine(e, m)).join('') || '<li><span></span><span></span><span class="muted">Jogo sem lances marcantes.</span></li>'}</ul>
      <p class="muted" style="margin:0;font-size:.85rem">${m.neutral ? 'Campo neutro' : esc(H.stadium) + ' · ' + esc(H.city)} · ${esc(H.name)} × ${esc(Aw.name)}</p>`);
  };
  function boardHTML(m, hg, ag, clock, st) {
    const H = club(m.h), Aw = club(m.a);
    return `<div class="board"><div class="sc">
        <div class="t">${P.badge(H, 46)}<b>${esc(H.name)}</b></div>
        <div class="score num">${hg}<span style="opacity:.5"> : </span>${ag}</div>
        <div class="t">${P.badge(Aw, 46)}<b>${esc(Aw.name)}</b></div></div>
      <div class="clock">${clock}</div>
      ${st ? `<div class="possess"><span>${st.pos}%</span><span class="tr"><i style="width:${st.pos}%"></i></span><span style="text-align:right">${100 - st.pos}%</span></div>` : ''}
    </div>`;
  }

  // ---------- Estatísticas da partida (ao vivo e no relatório) ----------
  // d: { pos, sh, sot, xg, fo, co } em pares [mandante, visitante]; os cartões vêm dos eventos
  // ---------- Campinho de notas (fim de jogo) ----------
  const noteCls = (n) => (n >= 7.5 ? 'n-top' : n >= 6.8 ? 'n-good' : n >= 6 ? 'n-mid' : 'n-low');
  const fmtN = (n) => (n == null ? '–' : String(n.toFixed ? n.toFixed(1) : n).replace('.', ','));
  function minutesOf(m, side, id) {
    const lu = m.lu[side], idx = lu.on.findIndex((e) => e[0] === id);
    const end = 90;
    const evIn = (m.ev || []).find((e) => e.t === 'sub' && e.p === id);
    const evOut = (m.ev || []).find((e) => (e.t === 'sub' && e.o === id) || ((e.t === 'vermelho' || e.t === 'lesao') && e.p === id));
    const a = idx < 11 ? 0 : evIn ? evIn.m : 0;
    const b = evOut ? evOut.m : end;
    return { from: a, to: b, mins: Math.max(1, b - a), start: idx < 11, inM: evIn ? evIn.m : null, outM: evOut ? evOut.m : null };
  }
  A.ratingsHTML = function (m) {
    if (!m || !m.lu || !m.notes) return '';
    const g = A.g;
    A._rtm = m;
    const mineSide = m.a === g.user ? 1 : 0;
    const side = A.st.rtSide != null && A.st.rtSide !== undefined && A.st.rtFor === (m.h + m.a) ? A.st.rtSide : mineSide;
    const lu = m.lu[side], cid = side === 0 ? m.h : m.a, c = club(cid);
    const cur = {}; lu.on.forEach((e) => { if (!e[3]) cur[e[2]] = e; });
    const goalsOf = (id) => (m.ev || []).filter((e) => e.t === 'gol' && e.p === id).length;
    const dots = Object.values(cur).map((e) => {
      const [id, pos, i, , red, inj] = e; const p = pl(id); if (!p) return '';
      const [x, y] = lu.xy[i] || [50, 50]; const n = m.notes[id];
      const gl = goalsOf(id), sub = minutesOf(m, side, id).inM != null;
      return `<button class="slot" style="left:${x}%;top:${96 - y}%" data-a="rtPl" data-id="${id}" data-s="${side}">
        <span class="dot rt-dot ${noteCls(n)}">${fmtN(n)}${gl ? `<i class="rt-g">${gl > 1 ? gl : ''}⚽</i>` : ''}${red ? '<i class="rt-r"></i>' : ''}${inj ? '<i class="rt-i">+</i>' : ''}${sub ? '<i class="rt-in">▲</i>' : ''}</span>
        <span class="nm">${esc(p.name.split(' ').slice(-1)[0])}</span><span class="ps">${pos}</span></button>`;
    }).join('');
    const outs = lu.on.filter((e) => e[3]).map((e) => { const p = pl(e[0]); const mi = minutesOf(m, side, e[0]); return p ? `<button class="rt-out" data-a="rtPl" data-id="${e[0]}" data-s="${side}"><span class="rt-n ${noteCls(m.notes[e[0]])}">${fmtN(m.notes[e[0]])}</span>${esc(p.name)} <small>${e[1]} · saiu aos ${mi.outM || '?'}'</small></button>` : ''; }).join('');
    return `<div class="card rt-card"><div class="head"><span class="label">Notas da partida</span>
        <div class="seg">${[0, 1].map((sd) => `<button class="${sd === side ? 'on' : ''}" data-a="rtSide" data-s="${sd}" data-k="${m.h + m.a}">${esc(club(sd === 0 ? m.h : m.a).short)}</button>`).join('')}</div></div>
      <div class="pitch rt"><div class="ln mid"></div><div class="ln circ"></div><div class="ln box1"></div><div class="ln box2"></div>${dots}</div>
      ${outs ? `<div class="rt-outs"><span class="label">Substituídos</span>${outs}</div>` : ''}
      <p class="muted" style="margin:8px 0 0;font-size:.8rem">${esc(c.name)} · toque num jogador para ver os números dele no jogo.</p></div>`;
  };
  A.ratingSheet = function (m, side, id) {
    const p = pl(id); if (!p || !m) return;
    const c = club(side === 0 ? m.h : m.a), mi = minutesOf(m, side, id);
    const q = (m.ps && m.ps[id]) || { sh: 0, sot: 0, xg: 0, tk: 0, sv: 0 };
    const ev = m.ev || [];
    const g = ev.filter((e) => e.t === 'gol' && e.p === id).length, as = ev.filter((e) => e.t === 'gol' && e.as === id).length;
    const y = ev.filter((e) => e.t === 'amarelo' && e.p === id).length, r = ev.some((e) => e.t === 'vermelho' && e.p === id);
    const inj = ev.find((e) => e.t === 'lesao' && e.p === id);
    const entry = m.lu[side].on.find((e) => e[0] === id);
    const kv = (l, v) => `<div><span class="label">${l}</span><b>${v}</b></div>`;
    A.openSheet(`<div class="bar-top"><span class="pos-tag ${P.LINE[entry ? entry[1] : p.pos]}" style="padding:4px 8px">${entry ? entry[1] : p.pos}</span><h2>${esc(p.name)}</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
      <div class="row">${P.badge(c, 28)}<div style="flex:1;min-width:0"><b>${esc(c.name)}</b><div class="muted" style="font-size:.85rem">${mi.start ? 'Titular' : `Entrou aos ${mi.inM}'`}${mi.outM != null ? ` · saiu aos ${mi.outM}'` : ''} · ${mi.mins} min</div></div>
        <div style="text-align:right"><div class="label">Nota</div><div class="big-ovr rt-big ${noteCls(m.notes[id])}">${fmtN(m.notes[id])}</div></div></div>
      <div class="kv">
        ${kv('Gols', g)}${kv('Assistências', as)}
        ${kv('Finalizações', `${q.sh} <small class="muted">(${q.sot} no gol)</small>`)}${kv('xG', String((q.xg || 0).toFixed(2)).replace('.', ','))}
        ${kv('Desarmes', q.tk)}${entry && entry[1] === 'GOL' ? kv('Defesas', q.sv) : ''}
        ${kv('Cartões', r ? (y ? 'Amarelo + vermelho' : 'Vermelho') : y ? 'Amarelo' : '—')}
        ${inj ? kv('Lesão', `${esc(inj.n || 'Lesão')} (${inj.w} sem.)`) : ''}
      </div>
      <div class="row"><button class="btn" data-a="player" data-id="${id}">Ficha completa</button></div>`);
  };
  Object.assign(A.ACT, {
    rtSide(d) { A.st.rtSide = Number(d.s); A.st.rtFor = d.k; if (A.live && A.live.done && A.redrawLive) A.redrawLive(); else if (A._rtSheet != null) A.reportSheet(A._rtSheet); else A.render(); },
    rtPl(d) { A.ratingSheet(A._rtm, Number(d.s), d.id); }
  });

  A.statsFrom = function (d, ev) {
    if (!d) return null;
    const cnt = (t, s) => (ev || []).filter((e) => e.s === s && (t === 'y' ? e.t === 'amarelo' : e.t === 'vermelho')).length;
    return Object.assign({}, d, { yc: [cnt('y', 0), cnt('y', 1)], rc: [cnt('r', 0), cnt('r', 1)] });
  };
  A.matchStatsHTML = function (d) {
    if (!d) return '';
    const rows = [['Posse de bola', [d.pos, 100 - d.pos], (v) => v + '%']];
    if (d.sh) rows.push(['Finalizações', d.sh]);
    if (d.sot) rows.push(['No gol', d.sot]);
    if (d.xg) rows.push(['xG (gols esperados)', d.xg, (v) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',')]);
    if (d.co) rows.push(['Escanteios', d.co]);
    if (d.fo) rows.push(['Faltas', d.fo]);
    if (d.yc) rows.push(['Cartões amarelos', d.yc]);
    if (d.rc && (d.rc[0] || d.rc[1])) rows.push(['Cartões vermelhos', d.rc]);
    return `<div class="mstats">${rows.map(([n, v, f]) => {
      const a = Number(v[0]) || 0, b = Number(v[1]) || 0, t = a + b;
      const pa = t ? a / t * 100 : 50;
      const fmt = f || ((x) => x);
      return `<div class="ms-row"><b class="${a > b ? 'lead' : ''}">${fmt(v[0])}</b><span class="ms-n">${n}</span><b class="${b > a ? 'lead' : ''}">${fmt(v[1])}</b>
        <span class="ms-bar"><i style="width:${pa}%"></i><i style="width:${100 - pa}%"></i></span></div>`;
    }).join('')}</div>`;
  };

  A.evLine = (e, m) => evLine(e, m);
  A.boardHTML = (...a) => boardHTML(...a);
  A.ogRow = (...a) => ogRow(...a);

  // ---------- Dia de jogo (animação) ----------
  const key = (e) => (e.x ? 90 + e.x : e.m);
  A.startMatchday = function (res) {
    const g = A.g;
    const mine = res.anim.find((x) => x.h === g.user || x.a === g.user) || null;
    const userDiv = club(g.user).div;
    let others = res.anim.filter((x) => x !== mine);
    if (res.step.t === 'lg') others = others.filter((x) => x.div === (mine ? mine.div : userDiv));
    if (res.step.t === 'po' && mine) others = others.filter((x) => x.div === mine.div);
    if (res.step.t === 'rz' && mine) others = others.filter((x) => x.comp === mine.comp);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    A.md = { step: res.step, mine, others, T: reduce || !mine ? 96 : 0, speed: 1 };
    let el = document.getElementById('md');
    if (!el) { el = document.createElement('div'); el.id = 'md'; el.className = 'md'; document.body.appendChild(el); }
    el.hidden = false; el.scrollTop = 0;
    A.drawMatchday();
    A.tickMatchday();
  };
  A.tickMatchday = function () {
    clearTimeout(A._mdt);
    const md = A.md; if (!md) return;
    if (md.T >= 96) { A.drawMatchday(); return; }
    A._mdt = setTimeout(() => { md.T++; A.drawMatchday(); A.tickMatchday(); }, md.speed === 1 ? 175 : 35);
  };
  A.drawMatchday = function () {
    const md = A.md, el = document.getElementById('md');
    if (!md || !el) return;
    A.reg = [];
    const T = md.T, done = T >= 96;
    const score = (x) => { let h = 0, a = 0; for (const e of x.goals) if (key(e) <= T) { if (e.s === 0) h++; else a++; } return [h, a]; };
    const x = md.mine;
    let main = '';
    if (x) {
      const m = x.full;
      const [h, a] = score(x);
      const clock = done ? (x.pen ? `Fim de jogo · pênaltis ${x.pen[0]} × ${x.pen[1]}` : 'Fim de jogo') : T === 0 ? 'Bola rolando' : T <= 90 ? `${T}'` : `90+${T - 90}'`;
      const evs = (m.ev || []).filter((e) => key(e) <= T && (e.t !== 'int' || T > 45)).slice().reverse();
      let verdict = '';
      if (done && (md.step.t !== 'lg')) verdict = `<p class="verdict ${m.w === A.g.user ? 'good' : 'bad'}">${m.w === A.g.user ? 'Classificado!' : 'Eliminado.'}</p>`;
      main = `${boardHTML(m, h, a, clock, m.st)}${verdict}
        ${done && m.st ? A.matchStatsHTML(A.statsFrom(m.st, m.ev)) : ''}
        <ul class="feed" aria-live="polite">${evs.map((e) => evLine(e, m)).join('')}</ul>`;
    } else {
      main = `<div class="card"><b>Seu time não jogou nesta semana.</b><div class="muted">Veja os resultados abaixo.</div></div>`;
    }
    const othersHtml = md.others.map((o) => {
      const [h, a] = score(o);
      const flash = o.goals.some((e) => key(e) <= T && key(e) > T - 3);
      return ogRow({ h: o.h, a: o.a }, h, a, { flash: flash && !done, pen: done ? o.pen : null });
    }).join('');
    const othersLabel = md.step.t === 'lg' ? `Outros jogos da ${(x ? x.div : club(A.g.user).div)}ª divisão` : md.step.t === 'cup' || md.step.t === 'sc' ? 'Outros jogos da fase' : md.step.t === 'rz' ? `Outros jogos da ${P.rzStatusName(A.g) || 'rodada'}` : 'Playoffs';
    el.innerHTML = `<div class="md-in">
      <div class="row"><h2 style="flex:1;min-width:0">${esc(P.stepLabel(md.step))}</h2>
        ${done ? '' : `<div class="seg"><button class="${md.speed === 1 ? 'on' : ''}" data-a="mdSpeed" data-s="1">Normal</button><button class="${md.speed === 3 ? 'on' : ''}" data-a="mdSpeed" data-s="3">Rápido</button></div><button class="btn sm" data-a="mdSkip">Pular</button>`}
      </div>
      ${main}
      ${md.others.length ? `<div class="label">${othersLabel}</div><div class="others">${othersHtml}</div>` : ''}
      ${done ? '<div class="row"><button class="btn" data-a="mdClose" data-v="tabela">Ver tabela</button><span class="spacer"></span><button class="btn primary" data-a="mdClose" data-v="inicio">Continuar</button></div>' : ''}
    </div>`;
  };

  // ---------- Mais ----------
  function vMais() {
    const g = A.g, st = A.st;
    const me = club(g.user);
    return `<div class="grid2">
      ${P.maisExtra ? P.maisExtra() : ''}
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="head" style="margin:0"><h2>Finanças</h2><b class="${me.bal < 0 ? 'v1' : ''}">${P.money(me.bal)}</b></div>
        <p class="muted" style="margin:0">Saldo, receitas e despesas da temporada, folha salarial e contratos que vão terminar.</p>
        <div><button class="btn primary" data-a="go" data-v="financas">Ver finanças</button></div></div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="head" style="margin:0"><h2>Editor</h2></div>
        <p class="muted" style="margin:0">Mude nomes, cores, países, atributos, idade e posição. Adicione, remova ou traga jogadores de outros clubes. Importe patches como o de clubes reais.</p>
        <div><button class="btn primary" data-a="go" data-v="editor">Abrir editor</button></div></div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="head" style="margin:0"><h2>Carreira</h2></div>
        <div class="muted">${esc(g.manager)} · ${esc(club(g.user).name)} · temporada ${g.season}</div>
        <div class="row"><button class="btn" data-a="teamDownload">Baixar meu time (arquivo)</button></div>
        <p class="muted" style="margin:0;font-size:.82rem">Mande o arquivo para outras pessoas: elas podem começar uma carreira com ele, enfrentá-lo ou usá-lo no Modo Torneio (Importar, na tela inicial).</p>
        ${g.hist.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ano</th><th>Div</th><th class="n">Pos</th><th>Resultado</th><th class="hide-sm">Campeão</th><th class="hide-sm">Copa</th></tr></thead><tbody>${g.hist.slice().reverse().map((h) => `<tr><td>${h.season}</td><td>${h.div}ª</td><td class="n">${ord(h.pos)}</td><td>${esc(h.result)}${h.cupMine ? ' · copa' : ''}</td><td class="hide-sm">${esc(h.champ)}</td><td class="hide-sm">${esc(h.cup)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty" style="padding:0">O histórico aparece ao fim da primeira temporada.</p>'}
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="head" style="margin:0"><h2>Salvar e transferir</h2></div>
        <p class="muted" style="margin:0">O jogo salva sozinho neste aparelho depois de cada semana. Para continuar em outro aparelho ou site, exporte a carreira e importe lá.</p>
        <div class="row"><button class="btn" data-a="exportGame">Exportar carreira</button><button class="btn" data-a="importGame">Importar carreira</button></div>
        <div id="io-box">${st.io || ''}</div>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="head" style="margin:0"><h2>Trocar de carreira</h2></div>
        <p class="muted" style="margin:0">Volta para a tela inicial, onde ficam seus 3 espaços de carreira. Esta carreira continua salva${A.slot ? ` no espaço ${A.slot}` : ''}.</p>
        <div><button class="btn" data-a="newGameYes">Ir para a tela inicial</button></div>
      </div>
      <div class="card" style="grid-column:1/-1"><div class="head"><h2>Como funciona</h2></div>
        <ul class="muted" style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">
          <li><b>Ultraliga:</b> 8 divisões de 20 clubes, turno e returno. Sobem os 2 primeiros e o vencedor do playoff (3º × 6º e 4º × 5º, depois final). Descem os 3 últimos.</li>
          <li><b>Copa Ultra:</b> todos os 160 clubes em mata-mata de jogo único, com pênaltis no empate. Os 64 mais fracos fazem a fase preliminar.</li>
          <li><b>Força</b> (1 a 99) vem dos atributos de 1 a 20, com peso diferente por posição. Fora da posição o jogador rende menos.</li>
          <li><b>Condição</b> cai a cada jogo e volta com descanso. Semanas de copa apertam o calendário: faça rodízio.</li>
          <li><b>Moral</b> sobe com vitórias e boas atuações e cai com derrotas ou falta de jogos.</li>
          <li>Três amarelos ou uma expulsão geram <b>suspensão</b>. Lesões duram de 1 a 5 semanas.</li>
        </ul></div>
    </div>`;
  }

  // ---------- Finanças ----------
  function vFinancas() {
    const g = A.g, me = club(g.user);
    const squad = P.squad(g, g.user);
    const payroll = squad.reduce((s, p) => s + p.wage, 0);
    const cats = (obj) => {
      const e = Object.entries(obj || {});
      const inc = e.filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]), out = e.filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]);
      const tot = e.reduce((s, [, v]) => s + v, 0);
      const row = ([k, v]) => `<tr><td>${esc(k)}</td><td class="n ${v < 0 ? 'v1' : 'v4'}">${P.money(Math.abs(v))}</td></tr>`;
      return `<table class="tbl"><tbody>${inc.map(row).join('')}${out.map(row).join('')}<tr><td><b>Resultado</b></td><td class="n"><b class="${tot < 0 ? 'v1' : 'v4'}">${tot < 0 ? '−' : '+'}${P.money(Math.abs(tot))}</b></td></tr></tbody></table>`;
    };
    const exp = squad.filter((p) => p.ctr <= g.season).sort((a, b) => P.ovr(b) - P.ovr(a));
    const topWages = squad.slice().sort((a, b) => b.wage - a.wage).slice(0, 6);
    const tvSeason = P.ECON.tv[me.div - 1];
    return `<div class="card"><div class="head"><h2>Finanças</h2><button class="btn sm ghost" data-a="go" data-v="mais">‹ Mais</button></div>
        <div class="kv">
          <div><span class="label">Saldo</span><b class="${me.bal < 0 ? 'v1' : ''}">${P.money(me.bal)}</b></div>
          <div><span class="label">Folha mensal</span><b>${P.money(payroll)}</b></div>
          <div><span class="label">Cota de TV/ano</span><b>${P.money(tvSeason)}</b></div>
          <div><span class="label">Estádio</span><b>${me.cap.toLocaleString('pt-BR')}</b><span class="muted" style="font-size:.75rem">lugares · ingresso R$ ${Math.round(P.ECON.ticket(me.div))}</span></div>
        </div></div>
      <div class="grid2">
        <div class="card"><div class="head"><span class="label">Temporada ${g.season}</span></div>${Object.keys(g.fin.cat).length ? cats(g.fin.cat) : '<p class="empty">Nenhum movimento ainda.</p>'}</div>
        <div class="card"><div class="head"><span class="label">${g.fin.prev ? 'Temporada ' + g.fin.prev.s : 'Temporada anterior'}</span></div>${g.fin.prev ? cats(g.fin.prev.cat) : '<p class="empty">Aparece depois da primeira temporada.</p>'}</div>
      </div>
      <div class="grid2">
        <div class="card"><div class="head"><span class="label">Contratos que terminam em ${g.season}</span></div>
          ${exp.length ? `<div class="plist">${exp.map((p) => `<button class="prow" data-a="renewOpen" data-id="${p.id}"><span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span><span class="nm"><b>${esc(p.name)}</b><small>${p.age} anos · ${P.money(p.wage)}/mês</small></span><span class="chip sus">Renovar</span><span class="ovr">${P.ovr(p)}</span></button>`).join('')}</div>
          <p class="muted" style="font-size:.85rem;margin:8px 0 0">Sem renovação, eles saem de graça no fim da temporada.</p>` : '<p class="empty">Nenhum contrato termina nesta temporada.</p>'}</div>
        <div class="card"><div class="head"><span class="label">Maiores salários</span></div>
          <div class="plist">${topWages.map((p) => `<button class="prow" data-a="player" data-id="${p.id}"><span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span><span class="nm"><b>${esc(p.name)}</b><small>até ${p.ctr}</small></span><b class="num">${P.money(p.wage)}</b><span class="ovr">${P.ovr(p)}</span></button>`).join('')}</div></div>
      </div>
      <div class="card"><div class="head"><span class="label">Últimas semanas</span></div>
        ${g.fin.log.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Semana</th><th class="hide-sm">Evento</th><th class="n">Resultado</th><th class="n">Saldo</th></tr></thead><tbody>${g.fin.log.slice(0, 12).map((l) => `<tr><td>${l.s} · ${l.w}</td><td class="hide-sm">${esc(l.l || '')}</td><td class="n ${l.v < 0 ? 'v1' : 'v4'}">${l.v < 0 ? '−' : '+'}${P.money(Math.abs(l.v))}</td><td class="n">${P.money(l.bal)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="empty">Jogue uma semana para ver os movimentos.</p>'}
        <p class="muted" style="font-size:.85rem;margin:10px 0 0">Receitas: bilheteria dos jogos em casa (cresce com a posição na tabela), cota de TV a cada rodada, premiação da Copa Ultra por fase vencida e premiação pela posição final. Despesas: salários toda semana.</p></div>`;
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
    if (!db || !Array.isArray(db.clubs)) throw new Error('Isto não parece um banco de dados do jogo.');
    if (db.clubs.length !== P.DIVS * P.DIV_SIZE) throw new Error(`O banco precisa ter ${P.DIVS * P.DIV_SIZE} clubes (${P.DIVS} divisões de ${P.DIV_SIZE}). Este tem ${db.clubs.length}.`);
    const ids = new Set();
    db.clubs.forEach((c, i) => {
      if (!c.id || ids.has(c.id)) c.id = 'c' + (i + 1) + '_' + Math.floor(Math.random() * 1e4);
      ids.add(c.id);
      c.name = String(c.name || 'Clube ' + (i + 1));
      c.short = String(c.short || c.name.slice(0, 3)).toUpperCase().slice(0, 3);
      c.city = String(c.city || ''); c.stadium = String(c.stadium || 'Estádio Municipal');
      c.country = P.COUNTRIES[c.country] ? c.country : 'BRA';
      c.colors = Array.isArray(c.colors) && c.colors.length >= 2 ? c.colors : ['#2f7d46', '#ffffff'];
      c.rep = P.clamp(Number(c.rep) || P.slotRep(i), 1, 100);
      c.div = P.clamp(Math.round(Number(c.div)) || Math.floor(i / P.DIV_SIZE) + 1, 1, P.DIVS);
    });
    for (let d = 1; d <= P.DIVS; d++) {
      const n = db.clubs.filter((c) => c.div === d).length;
      if (n !== P.DIV_SIZE) throw new Error(`A ${d}ª divisão tem ${n} clubes; cada divisão precisa de ${P.DIV_SIZE}.`);
    }
    const players = Array.isArray(db.players) ? Object.fromEntries(db.players.map((p) => [p.id, p])) : (db.players || {});
    const out = {};
    Object.values(players).forEach((p) => {
      if (!p || typeof p !== 'object') return;
      p.id = p.id || P.uid('p');
      p.name = String(p.name || 'Jogador');
      p.pos = P.POS.includes(p.pos) ? p.pos : 'MC';
      p.age = P.clamp(Number(p.age) || 25, 15, 45);
      p.nat = P.COUNTRIES[p.nat] ? p.nat : 'BRA';
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
  // Reconhece patch, banco ou carreira e aplica
  A.importAny = function (text, inGame) {
    const obj = JSON.parse(text);
    if (obj && obj.type === 'team' && Array.isArray(obj.players)) {
      if (!obj.players.length) throw new Error('o arquivo não tem jogadores');
      P.teamLibAdd(obj);
      if (inGame) return `Time "${obj.name}" guardado. Use na tela inicial (nova carreira ou Modo Torneio).`;
      A.setup.teamImp = obj; A.setup.teamDiv = null; A.setup.teamRep = null;
      return `Time "${obj.name}" recebido`;
    }
    if (obj && obj.type === 'patch') {
      const db = A.db();
      const n = P.applyPatch(db, obj, A.g);
      if (A.g) A.save();
      return `Patch "${obj.name || 'sem nome'}" aplicado: ${typeof n === 'number' ? n + ' clubes' : n}`;
    }
    if (obj && obj.cal && obj.db) {
      obj.db = P.normalizeDb(obj.db);
      P.ensureEconomy(obj);
      A.g = obj; A.save(); A.view = 'inicio';
      return 'Carreira carregada';
    }
    const nd = P.normalizeDb(obj);
    A.setup.db = nd; A.setup.club = null; A.setup.importing = false; A.setup.editing = false;
    if (inGame) A.g = null;
    return inGame ? 'Banco importado. Escolha o clube para a nova carreira.' : 'Banco de dados importado';
  };
  A.copyText = function (id) {
    const ta = document.getElementById(id); if (!ta) return;
    const fallback = () => { ta.focus(); ta.select(); A.toast('Texto selecionado: copie manualmente'); };
    try { navigator.clipboard.writeText(ta.value).then(() => A.toast('Copiado'), fallback); } catch (e) { fallback(); }
  };
  // Lê uma imagem do aparelho e reduz para no máximo 128×128 (mantém transparência)
  A.readLogo = function (file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('Escolha um arquivo de imagem (PNG, JPG, WebP…).')); return; }
      if (file.size > 10 * 1024 * 1024) { reject(new Error('A imagem passa de 10 MB.')); return; }
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
      fr.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Este arquivo não é uma imagem válida.'));
        img.onload = () => {
          const k = Math.min(1, 128 / Math.max(img.width, img.height));
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
          const cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(img, 0, 0, cv.width, cv.height);
          resolve(cv.toDataURL('image/png'));
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  };
  A.readFileInto = function (input, taId) {
    const f = input.files && input.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => { const ta = document.getElementById(taId); if (ta) ta.value = String(rd.result || ''); A.toast('Arquivo carregado. Toque em Importar.'); };
    rd.readAsText(f);
  };

  // ---------- Ações ----------
  Object.assign(ACT, {
    go(d) { A.view = d.v; A.st.slot = null; if (d.v === 'editor') A.st.ed = { v: 'clubs' }; A.render(); window.scrollTo(0, 0); },
    play() {
      const g = A.g; if (!g || g.over) return;
      const res = P.playWeek(g);
      A.save();
      A.st.rd = null; A.st.cupR = null;
      A.startMatchday(res);
    },
    mdSpeed(d) { A.md.speed = Number(d.s); A.drawMatchday(); A.tickMatchday(); },
    mdSkip() { A.md.T = 96; clearTimeout(A._mdt); A.drawMatchday(); },
    mdClose(d) { clearTimeout(A._mdt); A.md = null; const el = document.getElementById('md'); if (el) { el.hidden = true; el.innerHTML = ''; } A.view = d.v || 'inicio'; if (d.v === 'tabela') A.st.div = null; A.render(); window.scrollTo(0, 0); },
    newSeason() { P.newSeason(A.g); A.save(); A.view = 'inicio'; A.st.rd = null; A.st.div = null; A.st.cupR = null; A.render(); window.scrollTo(0, 0); A.toast(`Temporada ${A.g.season} começou`); },
    player(d) { A.playerSheet(d.id); },
    renewOpen(d) { A.playerSheet(d.id, 'renew'); },
    renewYears(d) { A.playerSheet(d.id, 'renew', Number(d.y)); },
    renewDo(d) {
      const p = pl(d.id);
      if (P.renew(A.g, p, Number(d.y))) { A.save(); A.closeSheet(); A.render(); A.toast(`${p.name} renovou até ${p.ctr}`); }
      else A.playerSheet(d.id, 'renew');
    },
    releaseOpen(d) { A.playerSheet(d.id, 'release'); },
    releaseDo(d) {
      const p = pl(d.id);
      if (P.squad(A.g, A.g.user).length <= 16) { A.toast('O elenco precisa de pelo menos 16 jogadores'); return; }
      const cost = P.release(A.g, p);
      A.save(); A.closeSheet(); A.render(); A.toast(`${p.name} dispensado. Rescisão: ${P.money(cost)}`);
    },
    closeSheet() { A.closeSheet(); },
    bgClose(d, el, e) { if (e.target === el) A.closeSheet(); },
    filter(d) { A.st.filter = d.k; A.render(); },
    tab(d) { A.st.tab = d.k; A.render(); },
    cstPo(d) { A.st.cstPo = d.k === '1'; A.render(); },
    myDiv() { A.st.div = club(A.g.user).div; A.st.rd = null; A.render(); },
    rd(d) { A.st.rd = P.clamp(A.st.rd + Number(d.d), 0, A.g.lg[A.st.div].length - 1); A.render(); },
    report(d) { A.reportSheet(Number(d.ri)); },
    slot(d) { A.slotSheet(Number(d.i)); },
    assign(d) {
      const g = A.g, t = g.tac[g.user], i = Number(d.i);
      const j = t.xi.indexOf(d.id);
      if (j >= 0) t.xi[j] = t.xi[i];
      t.xi[i] = d.id;
      if (t.auto) A.toast('Escalação automática ligada: antes do jogo entram os melhores. Desmarque a opção para manter sua escolha.');
      A.save(); A.closeSheet(); A.render();
    },
    tac(d) { const t = A.g.tac[A.g.user]; t[d.k] = d.v; A.save(); A.render(); },
    bestXI() { const g = A.g, t = g.tac[g.user]; t.xi = P.autoXI(g, g.user, t.f); A.save(); A.render(); A.toast('Melhores escalados'); },
    editPlayer(d) { const p = pl(d.id); A.closeSheet(); A.st.ed = { v: 'player', cid: p.clubId, pid: p.id }; if (A.g) A.view = 'editor'; else A.setup.editing = true; A.render(); window.scrollTo(0, 0); },
    confirm(d) { A.st.confirm = d.k || null; A.render(); },
    newGameYes() { A.clearSave(); A.g = null; A.st.confirm = null; A.setup = { db: P.generateDatabase(2027), club: null, manager: '', editing: false, importing: false, creating: false, divF: 1, q: '', form: null }; A.render(); window.scrollTo(0, 0); },
    exportGame() {
      A.st.io = `<div class="field"><label class="label" for="io-text">Copie e guarde este texto (ou cole num arquivo .json)</label><textarea id="io-text" readonly>${esc(JSON.stringify(A.g))}</textarea></div><div class="row" style="margin-top:8px"><button class="btn" data-a="copy" data-t="io-text">Copiar</button></div>`;
      A.render();
    },
    importGame() {
      A.st.io = `<div class="field"><input type="file" accept=".json,.txt,application/json" data-c="ioFile" aria-label="Arquivo da carreira"><textarea id="io-text" placeholder="Cole aqui a carreira exportada"></textarea></div>
        <div class="row" style="margin-top:8px"><span class="muted" style="flex:1;font-size:.85rem">Substitui a carreira atual.</span><button class="btn primary" data-a="applyGame">Carregar</button></div>`;
      A.render();
    },
    applyGame() {
      const ta = document.getElementById('io-text');
      try {
        const g = JSON.parse(ta.value);
        if (!g || !g.db || !g.cal || !g.tac || !g.user) throw new Error('isto não parece uma carreira da Ultraliga.');
        g.db = P.normalizeDb(g.db);
        P.ensureEconomy(g);
        A.g = g; A.st.io = ''; A.save(); A.view = 'inicio'; A.render(); A.toast('Carreira carregada');
      } catch (e) { A.toast('Não deu para carregar: ' + e.message); }
    },
    copy(d) { A.copyText(d.t); },

    // tela inicial
    continue() { const s = A.loadSave(); if (s) { s.db = P.normalizeDb(s.db); P.ensureEconomy(s); A.g = s; A.save(); A.view = 'inicio'; A.render(); } },
    pickClub(d) { A.setup.club = d.id; A.render(); },
    ccLogoDel() { A.setup.form.logo = null; A.render(); },
    start() {
      const s = A.setup; if (!s.club) return;
      A.g = P.newGame(s.db, s.club, (s.manager || '').trim() || 'Técnico');
      A.save(); A.view = 'inicio'; A.st.div = null; A.render(); window.scrollTo(0, 0);
    },
    setupEdit() { A.setup.editing = true; A.st.ed = { v: 'clubs' }; A.render(); window.scrollTo(0, 0); },
    setupImport() { A.setup.importing = !A.setup.importing; A.render(); },
    applyImport() {
      const ta = document.getElementById('imptext');
      try { const msg = A.importAny(ta.value, false); A.setup.importing = false; A.render(); A.toast(msg); }
      catch (e) { A.toast('Não deu para importar: ' + e.message); }
    },
    createOpen() { A.setup.creating = true; A.render(); window.scrollTo(0, 0); },
    createClose() { A.setup.creating = false; A.render(); window.scrollTo(0, 0); },
    createDo() {
      const f = A.setup.form;
      if (!f.name.trim()) { A.toast('Dê um nome ao clube'); document.getElementById('cc-name').focus(); return; }
      const short = (f.short.trim() || f.name.trim().slice(0, 3)).toUpperCase().slice(0, 3);
      const c = P.createClub(A.setup.db, {
        replaceId: f.replaceId, name: f.name.trim(), short, city: f.city.trim() || f.name.trim(),
        stadium: f.stadium.trim() || 'Estádio ' + (f.city.trim() || f.name.trim()), country: f.country, c1: f.c1, c2: f.c2, squad: f.squad, logo: f.logo || null
      });
      if (P.applyCreateExtra) P.applyCreateExtra(c, f);
      A.setup.club = c.id; A.setup.divF = c.div; A.setup.q = ''; A.setup.creating = false; A.setup.form = null;
      A.st.ed = { v: 'club', cid: c.id }; A.setup.editing = true;
      A.render(); window.scrollTo(0, 0);
      A.toast(`${c.name} criado! Ajuste o elenco e depois volte para começar.`);
    }
  });

  Object.assign(CHG, {
    sort(el) { A.st.sort = el.value; A.render(); },
    formation(el) { const g = A.g, t = g.tac[g.user]; t.f = el.value; t.xi = P.autoXI(g, g.user, t.f); A.save(); A.render(); A.toast('Formação ' + t.f); },
    auto(el) { const g = A.g; g.tac[g.user].auto = el.checked; A.save(); },
    tblDiv(el) { A.st.div = Number(el.value); A.st.rd = null; A.render(); },
    cupR(el) { A.st.cupR = Number(el.value); A.render(); },
    setupDiv(el) { A.setup.divF = Number(el.value); A.setup.q = ''; A.render(); },
    ccDiv(el) { A.setup.form.div = Number(el.value); A.setup.form.replaceId = null; A.render(); },
    ccSel(el) { A.setup.form[el.dataset.k] = el.value; },
    ccLogo(el) {
      const file = el.files && el.files[0]; if (!file) return;
      A.readLogo(file).then((url) => { A.setup.form.logo = url; A.render(); A.toast('Escudo carregado'); }).catch((e) => A.toast(e.message));
    },
    impFile(el) { A.readFileInto(el, 'imptext'); },
    ioFile(el) { A.readFileInto(el, 'io-text'); }
  });

  Object.assign(INP, {
    mgr(el) { A.setup.manager = el.value; const sig = document.getElementById('jr-sig'); if (sig) { sig.textContent = el.value.trim(); sig.parentNode.classList.toggle('empty', !el.value.trim()); } },
    clubQ(el) {
      A.setup.q = el.value;
      const db = A.setup.db, ovrs = P.clubOvrs(db), q = el.value.trim().toLowerCase();
      let list = q ? db.clubs.filter((c) => (c.name + ' ' + c.city + ' ' + P.countryName(c.country)).toLowerCase().includes(q)) : P.divClubs(db, A.setup.divF);
      list = list.slice().sort((a, b) => a.div - b.div || ovrs[b.id] - ovrs[a.id]);
      document.getElementById('clublist').innerHTML = clubCards(list, ovrs, db);
    },
    cc(el) {
      const f = A.setup.form; f[el.dataset.k] = el.value;
      const b = document.getElementById('cc-badge');
      if (b) b.innerHTML = P.badge({ name: f.name, short: (f.short || 'MEU').toUpperCase(), colors: [f.c1, f.c2], logo: f.logo }, 56);
    }
  });

  // ---------- Delegação de eventos ----------
  // Telas que se redesenham sozinhas (partida ao vivo, rodada, simulação) trocam o botão
  // entre apertar e soltar o mouse, e o navegador descarta o clique. Aqui o toque é
  // reconhecido pelo botão equivalente (mesma ação e mesmos dados) que estiver sob o ponteiro.
  const keyOf = (el) => el.dataset.a + '|' + JSON.stringify(Object.assign({}, el.dataset));
  let press = null, rescued = null;
  const run = (el, e) => { const fn = ACT[el.dataset.a]; if (!fn) return; try { fn(el.dataset, el, e); } catch (err) { console.error(err); A.lastError = `${el.dataset.a}: ${err && err.message}`; A.toast('Erro: ' + A.lastError); } };
  document.addEventListener('pointerdown', (e) => {
    rescued = null; // cada novo toque começa do zero
    const el = e.button === 0 && e.target.closest ? e.target.closest('[data-a]') : null;
    press = el ? { el, key: keyOf(el), x: e.clientX, y: e.clientY } : null;
  }, true);
  document.addEventListener('pointerup', (e) => {
    const p = press; press = null;
    if (!p || p.el.isConnected) return; // o botão continua lá: o clique normal resolve
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 12) return;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const el = under && under.closest('[data-a]');
    if (!el || el.disabled || keyOf(el) !== p.key) return;
    rescued = { key: p.key, t: Date.now() };
    run(el, e);
  }, true);
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) return;
    // no toque, o navegador ainda pode mandar o clique do mesmo gesto depois do resgate: não repete
    if (rescued && Date.now() - rescued.t < 800 && rescued.key === keyOf(el)) { rescued = null; return; }
    run(el, e);
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
    const el = e.target.closest('[data-i]');
    if (el && INP[el.dataset.i]) INP[el.dataset.i](el, e);
  });
})(window.PFC);
