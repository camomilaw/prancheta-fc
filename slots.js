/* Prancheta FC — 3 espaços de carreira no mesmo aparelho
 * As carreiras ficam no IndexedDB do navegador (cabe bem mais que o localStorage).
 * Um resumo de cada espaço (clube, técnico, temporada) fica no localStorage para a tela inicial.
 * Se o IndexedDB não existir, usa o localStorage (pode faltar espaço para 3 carreiras grandes).
 * O save antigo (de antes dos espaços) vai sozinho para o espaço 1.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const N = 3;
  const OLD_KEY = 'prancheta-fc:save:v2';
  const META_KEY = 'prancheta-fc:slots';
  const LS_KEY = (n) => 'prancheta-fc:slot:' + n;

  // ---------- Resumo dos espaços ----------
  const readMeta = () => { try { return JSON.parse(P.store.get(META_KEY)) || { s: {} }; } catch (e) { return { s: {} }; } };
  let meta = readMeta();
  const writeMeta = () => P.store.set(META_KEY, JSON.stringify(meta));
  P.slotMeta = () => meta;
  const firstFree = () => { for (let i = 1; i <= N; i++) if (!meta.s[i]) return i; return null; };

  // ---------- IndexedDB ----------
  let dbp = null;
  function idb() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      try {
        const rq = indexedDB.open('prancheta-fc', 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore('slots');
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      } catch (e) { rej(e); }
    });
    dbp.catch(() => {});
    return dbp;
  }
  function tx(mode, fn) {
    return idb().then((db) => new Promise((res, rej) => {
      const t = db.transaction('slots', mode), st = t.objectStore('slots');
      const rq = fn(st);
      t.oncomplete = () => res(rq && rq.result);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    }));
  }
  const put = (n, text) => tx('readwrite', (st) => st.put(text, n)).catch(() => {
    if (!P.store.set(LS_KEY(n), text)) throw new Error('sem espaço');
  });
  const get = (n) => tx('readonly', (st) => st.get(n)).then((v) => v || P.store.get(LS_KEY(n))).catch(() => P.store.get(LS_KEY(n)));
  const del = (n) => { P.store.del(LS_KEY(n)); return tx('readwrite', (st) => st.delete(n)).catch(() => {}); };

  // ---------- Salvar ----------
  // Grava só a versão mais recente: se chegar outro save durante a gravação, ele espera a vez
  let busy = false, pending = null;
  function flush() {
    if (busy || !pending) return;
    const { n, text } = pending; pending = null; busy = true;
    put(n, text).catch(() => A.toast('Não deu para salvar neste navegador. Baixe um backup em Mais.'))
      .then(() => { busy = false; flush(); });
  }
  A.slot = null;
  A.save = () => {
    const g = A.g; if (!g) return;
    if (!A.slot) A.slot = A.setup.slot || firstFree() || 1;
    const c = P.club(g, g.user);
    let hl = null; try { hl = P.headline ? P.headline(g) : null; } catch (e) { hl = null; }
    meta.s[A.slot] = { mgr: g.manager, club: c.name, badge: P.badge(c, 48), div: c.div, season: g.season, week: g.week, over: !!g.over, at: Date.now(), head: hl && hl.head, dek: hl && hl.dek };
    meta.active = A.slot;
    writeMeta();
    pending = { n: A.slot, text: JSON.stringify(g) }; flush();
  };
  A.loadSave = () => null; // a tela inicial usa os resumos; carregar é assíncrono (A.loadSlot)
  A.clearSave = () => { if (A.slot) A.deleteSlot(A.slot); };

  A.loadSlot = function (n) {
    return get(n).then((raw) => {
      if (!raw) throw new Error('espaço vazio');
      const g = JSON.parse(raw);
      if (!g || !g.db || !g.cal || !g.lg) throw new Error('save inválido');
      g.db = P.normalizeDb(g.db); P.ensureEconomy(g);
      A.g = g; A.slot = n; A.view = 'inicio'; A.st.div = null;
      A.save(); A.render(); window.scrollTo(0, 0);
      (A.onLoad || []).forEach((f) => f(g));
    }).catch((e) => A.toast('Não deu para abrir a carreira: ' + e.message));
  };
  A.deleteSlot = function (n) {
    delete meta.s[n]; if (meta.active === n) meta.active = null;
    writeMeta(); return del(n);
  };

  // Primeira vez com espaços: leva o save antigo para o espaço 1
  P.slotsInit = function () {
    const old = P.store.get(OLD_KEY);
    if (!old || meta.s[1]) { if (old && meta.s[1]) P.store.del(OLD_KEY); return Promise.resolve(); }
    let g; try { g = JSON.parse(old); } catch (e) { return Promise.resolve(); }
    if (!g || !g.db || !g.cal) return Promise.resolve();
    const c = g.db.clubs.find((x) => x.id === g.user);
    return tx('readwrite', (st) => st.put(old, 1)).then(() => {
      meta.s[1] = { mgr: g.manager, club: c ? c.name : '?', badge: c ? P.badge(c, 36) : '', div: c ? c.div : 0, season: g.season, week: g.week, over: !!g.over, at: Date.now() };
      meta.active = 1; writeMeta(); P.store.del(OLD_KEY);
    }).catch(() => {
      // sem IndexedDB: o save antigo vira o espaço 1 no próprio localStorage
      if (P.store.set(LS_KEY(1), old)) { P.store.del(OLD_KEY); meta.s[1] = { mgr: g.manager, club: c ? c.name : '?', badge: c ? P.badge(c, 36) : '', div: c ? c.div : 0, season: g.season, week: g.week, over: !!g.over, at: Date.now() }; writeMeta(); }
    });
  };

  // ---------- Tela inicial ----------
  const when = (t) => { const d = Math.floor((Date.now() - t) / 864e5); return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`; };
  P.slotsCard = function () {
    const conf = A.setup.slotDel;
    const rows = [];
    for (let i = 1; i <= N; i++) {
      const m = meta.s[i];
      if (!m) { rows.push(`<p class="jr-free">— Espaço ${i} livre para uma nova história —</p>`); continue; }
      rows.push(`<article class="jr-story">
        <div class="jr-crest">${m.badge || ''}</div>
        <div class="jr-story-b">
          <span class="jr-kick">${m.div}ª divisão · Temporada ${m.season}${m.over ? ' · fim' : ''}</span>
          <h3>${esc(m.head || `${m.club}, de ${m.mgr}`)}</h3>
          ${m.dek ? `<p>${esc(m.dek)}</p>` : `<p>${esc(m.club)} sob o comando de ${esc(m.mgr)}.</p>`}
          <span class="jr-when">Espaço ${i} · última edição ${when(m.at)}</span>
          ${conf === i ? `<div class="jr-tear"><span>Rasgar não tem volta. Se quiser guardar, abra e baixe um backup em Mais.</span><div class="row"><button class="btn sm" data-a="slotDel" data-n="">Cancelar</button><button class="btn sm danger" data-a="slotDelYes" data-n="${i}">Sim, rasgar</button></div></div>`
            : `<div class="jr-story-act"><button class="btn primary" data-a="slotOpen" data-n="${i}">Continuar a leitura →</button><button class="jr-link" data-a="slotDel" data-n="${i}" aria-label="Apagar carreira do espaço ${i}">rasgar a página</button></div>`}
        </div></article>`);
    }
    if (!Object.keys(meta.s).length) return '';
    return `<section class="jr-sec"><h2 class="jr-h">Em andamento</h2>${rows.join('')}</section>`;
  };
  // Escolha do espaço para a nova carreira
  P.slotPick = function () {
    const cur = A.setup.slot || firstFree() || 1;
    const m = meta.s[cur];
    return `<div class="field"><span class="jr-step">4 · Arquivar no espaço</span><div class="seg">${[1, 2, 3].map((i) => `<button class="${cur === i ? 'on' : ''}" data-a="slotPick" data-n="${i}">${i}${meta.s[i] ? ' · ocupado' : ''}</button>`).join('')}</div>
      ${m ? `<p class="jr-warn">Vai substituir a carreira ${esc(m.mgr)} · ${esc(m.club)}.</p>` : ''}</div>`;
  };

  Object.assign(A.ACT, {
    slotOpen(d) { A.loadSlot(Number(d.n)); },
    slotDel(d) { A.setup.slotDel = d.n ? Number(d.n) : null; A.render(); },
    slotDelYes(d) { const n = Number(d.n); A.setup.slotDel = null; A.deleteSlot(n).then(() => { A.setup.slot = null; A.render(); A.toast(`Espaço ${n} liberado`); }); },
    slotPick(d) { A.setup.slot = Number(d.n); A.render(); },
    // compatibilidade: "Continuar" sem número abre a última carreira jogada
    continue(d) { const n = (d && Number(d.n)) || meta.active; if (n && meta.s[n]) A.loadSlot(n); },
    // Mais › Trocar de carreira: volta à tela inicial sem apagar nada
    newGameYes() {
      A.save(); A.g = null; A.slot = null; A.st.confirm = null; A.st.io = '';
      A.setup = { db: P.generateDatabase(2027), club: null, manager: '', editing: false, importing: false, creating: false, divF: 1, q: '', form: null, slot: null };
      A.render(); window.scrollTo(0, 0);
    }
  });
})(window.PFC);
