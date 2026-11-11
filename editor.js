/* Prancheta FC — editor de banco de dados (estilo editor do FM)
 * Funciona antes da carreira (tela inicial) e durante a carreira (menu Mais).
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const db = () => A.db();
  const club = (cid) => db().clubs.find((c) => c.id === cid);
  const players = (cid) => Object.values(db().players).filter((p) => p.clubId === cid);
  const LINE_ORDER = { GOL: 0, LD: 1, ZAG: 2, LE: 3, VOL: 4, MC: 5, MEI: 6, PD: 7, PE: 8, ATA: 9 };
  const changed = (cids) => {
    if (A.g) { (cids || []).forEach((cid) => { if (cid && A.g.tac[cid]) P.fixXI(A.g, cid); }); A.save(); }
  };

  P.editor = {};
  P.editor.page = function (setupMode) {
    const ed = A.st.ed || (A.st.ed = { v: 'clubs' });
    let body;
    if (ed.v === 'club' && club(ed.cid)) body = vClub(ed.cid);
    else if (ed.v === 'player' && db().players[ed.pid]) body = vPlayer(ed.pid);
    else if (ed.v === 'db') body = vDb(setupMode);
    else body = vClubs();
    const tabs = `<div class="seg"><button class="${ed.v !== 'db' ? 'on' : ''}" data-a="edGo" data-v="clubs">Clubes e jogadores</button><button class="${ed.v === 'db' ? 'on' : ''}" data-a="edGo" data-v="db">Banco de dados</button></div>`;
    const head = `<div class="row"><h2 style="flex:1">Editor</h2>${tabs}</div>`;
    if (setupMode) {
      return `<div class="setup"><div class="row"><button class="btn" data-a="edExit">‹ Voltar</button><span class="muted">As mudanças valem para a nova carreira.</span></div>${head}${body}</div>`;
    }
    return `${head}${body}`;
  };

  function crumbs(list) {
    return `<div class="crumbs">${list.map(([label, act, data], i) => i < list.length - 1
      ? `<button data-a="${act}" ${data || ''}>${esc(label)}</button><span class="muted">›</span>`
      : `<b>${esc(label)}</b>`).join('')}</div>`;
  }

  // ---------- Lista de clubes ----------
  function vClubs() {
    const list = db().clubs;
    return `<div class="card"><div class="head"><span class="label">${list.length} clubes</span></div>
      <div class="plist">${list.map((c) => `<button class="prow" data-a="edClub" data-id="${c.id}" style="grid-template-columns:36px 1fr auto">
        ${P.badge(c, 30)}<span class="nm"><b>${esc(c.name)}</b><small>${esc(c.city)} · ${players(c.id).length} jogadores · reputação ${c.rep}</small></span>
        <span class="ovr">${P.clubOvr(db(), c.id)}</span></button>`).join('')}</div></div>`;
  }

  // ---------- Clube ----------
  function vClub(cid) {
    const c = club(cid);
    const ps = players(cid).sort((a, b) => LINE_ORDER[a.pos] - LINE_ORDER[b.pos] || P.ovr(b) - P.ovr(a));
    const f = (k, label, extra) => `<div class="field"><label class="label" for="cf-${k}">${label}</label><input id="cf-${k}" data-c="cf" data-k="${k}" value="${esc(c[k])}" ${extra || ''}></div>`;
    return `${crumbs([['Clubes', 'edGo', 'data-v="clubs"'], [c.name]])}
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <div class="row"><span id="ed-badge">${P.badge(c, 48)}</span><h2 style="flex:1">${esc(c.name)}</h2><span class="ovr">${P.clubOvr(db(), cid)}</span></div>
        <div class="form-grid">
          ${f('name', 'Nome', 'maxlength="40"')}
          ${f('short', 'Sigla (3 letras)', 'maxlength="3"')}
          ${f('city', 'Cidade', 'maxlength="40"')}
          ${f('stadium', 'Estádio', 'maxlength="50"')}
          <div class="field"><label class="label" for="cf-rep">Reputação (1-100)</label><input id="cf-rep" type="number" min="1" max="100" data-c="cf" data-k="rep" value="${c.rep}"></div>
          <div class="field"><label class="label" for="cf-c0">Cor principal</label><input id="cf-c0" type="color" data-c="cfColor" data-i="0" value="${esc(c.colors[0])}"></div>
          <div class="field"><label class="label" for="cf-c1">Cor secundária</label><input id="cf-c1" type="color" data-c="cfColor" data-i="1" value="${esc(c.colors[1])}"></div>
        </div>
        <p class="muted" style="margin:0;font-size:.85rem">A reputação define o nível dos jogadores gerados para o clube (novos contratados e jovens da base).</p>
      </div>
      <div class="card"><div class="head"><span class="label">Elenco · ${ps.length} jogadores</span></div>
        <div class="row" style="margin-bottom:10px">
          <select id="newpos" class="sel" aria-label="Posição do novo jogador">${P.POS.map((p) => `<option value="${p}">${p} · ${P.POS_NAME[p]}</option>`).join('')}</select>
          <button class="btn" data-a="edAddPlayer" data-cid="${cid}">Adicionar jogador</button>
        </div>
        <div class="plist">${ps.map((p) => `<button class="prow" data-a="edPlayer" data-id="${p.id}">
          <span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span>
          <span class="nm"><b>${esc(p.name)}</b><small>${p.age} anos · ${P.money(P.value(p))}</small></span>
          <span></span><span class="ovr">${P.ovr(p)}</span></button>`).join('')}</div>
      </div>`;
  }

  // ---------- Jogador ----------
  function vPlayer(pid) {
    const p = db().players[pid];
    const c = club(p.clubId);
    const groups = {};
    P.ATTRS.forEach((at) => { (groups[at.g] = groups[at.g] || []).push(at); });
    const confirm = A.st.confirm === 'del:' + pid;
    return `${crumbs([['Clubes', 'edGo', 'data-v="clubs"'], [c ? c.name : 'Sem clube', 'edClub', c ? `data-id="${c.id}"` : 'data-v="clubs"'], [p.name]])}
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <div class="row"><span class="pos-tag ${P.LINE[p.pos]}" style="padding:4px 8px">${p.pos}</span><h2 style="flex:1;min-width:0">${esc(p.name)}</h2>
          <div style="text-align:right"><div class="label">Força</div><div class="big-ovr" id="ed-ovr">${P.ovr(p)}</div></div></div>
        <div class="form-grid">
          <div class="field"><label class="label" for="pf-name">Nome</label><input id="pf-name" data-c="pf" data-k="name" value="${esc(p.name)}" maxlength="40"></div>
          <div class="field"><label class="label" for="pf-age">Idade</label><input id="pf-age" type="number" min="15" max="45" data-c="pf" data-k="age" value="${p.age}"></div>
          <div class="field"><label class="label" for="pf-pos">Posição</label><select id="pf-pos" data-c="pf" data-k="pos">${P.POS.map((x) => `<option value="${x}" ${p.pos === x ? 'selected' : ''}>${x} · ${P.POS_NAME[x]}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="pf-club">Clube</label><select id="pf-club" data-c="pf" data-k="clubId">${db().clubs.map((x) => `<option value="${x.id}" ${p.clubId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="pf-pot">Potencial (1-20)</label><input id="pf-pot" type="number" min="1" max="20" step="0.5" data-c="pf" data-k="pot" value="${p.pot}"></div>
        </div>
        ${Object.entries(groups).map(([g, list]) => `<div><div class="label" style="margin-bottom:6px">${g}</div><div class="attr-edit">${list.map((at) => `<label for="pa-${at.k}"><span>${at.n}</span><input id="pa-${at.k}" type="number" min="1" max="20" inputmode="numeric" data-c="pa" data-k="${at.k}" value="${p.a[at.k]}"></label>`).join('')}</div></div>`).join('')}
        <p class="muted" style="margin:0;font-size:.85rem">Potencial é o teto que um jovem pode atingir em média de atributos. Atributos de goleiro só contam para goleiros.</p>
        <div class="row">
          <button class="btn" data-a="edHeal" data-id="${pid}">Curar e descansar</button>
          <span class="spacer"></span>
          ${confirm ? '' : `<button class="btn danger" data-a="confirm" data-k="del:${pid}">Remover jogador</button>`}
        </div>
        ${confirm ? `<div class="confirm"><b>Remover ${esc(p.name)} do banco de dados?</b><div class="row"><button class="btn" data-a="confirm" data-k="">Cancelar</button><button class="btn danger" data-a="edDelete" data-id="${pid}">Remover</button></div></div>` : ''}
      </div>`;
  }

  // ---------- Banco de dados ----------
  function vDb(setupMode) {
    const io = A.st.edio || '';
    return `<div class="grid2">
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><h3>Exportar</h3>
        <p class="muted" style="margin:0">Gera o banco (clubes e jogadores) em texto JSON. Guarde, edite num editor de texto ou compartilhe como um "patch".</p>
        <div><button class="btn" data-a="edExport">Gerar texto</button></div>
        ${io === 'export' ? `<div class="field"><textarea id="ed-io" readonly>${esc(JSON.stringify(db()))}</textarea></div><div><button class="btn" data-a="copy" data-t="ed-io">Copiar</button></div>` : ''}
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><h3>Importar</h3>
        <p class="muted" style="margin:0">${setupMode ? 'Substitui o banco usado na nova carreira.' : 'Importar um banco começa uma nova carreira. A atual continua salva até você iniciar outra.'}</p>
        <input type="file" accept=".json,.txt,application/json" data-c="edFile" aria-label="Arquivo do banco de dados">
        <div class="field"><textarea id="ed-imp" placeholder="Ou cole o JSON aqui"></textarea></div>
        <div><button class="btn primary" data-a="edImport">Importar banco</button></div>
      </div>
      ${setupMode ? `<div class="card" style="display:flex;flex-direction:column;gap:12px;grid-column:1/-1"><h3>Gerar de novo</h3>
        <p class="muted" style="margin:0">Cria jogadores novos para os mesmos clubes, com nomes e atributos sorteados.</p>
        <div class="row"><button class="btn" data-a="edRegen" data-k="default">Banco padrão</button><button class="btn" data-a="edRegen" data-k="random">Sortear novo banco</button></div></div>` : ''}
    </div>`;
  }

  // ---------- Ações ----------
  Object.assign(A.ACT, {
    edGo(d) { A.st.ed = { v: d.v || 'clubs' }; A.st.confirm = null; A.st.edio = ''; A.render(); window.scrollTo(0, 0); },
    edExit() { A.setup.editing = false; A.render(); window.scrollTo(0, 0); },
    edClub(d) { if (!d.id) return A.ACT.edGo({ v: 'clubs' }); A.st.ed = { v: 'club', cid: d.id }; A.st.confirm = null; A.render(); window.scrollTo(0, 0); },
    edPlayer(d) { const p = db().players[d.id]; A.st.ed = { v: 'player', pid: d.id, cid: p.clubId }; A.st.confirm = null; A.render(); window.scrollTo(0, 0); },
    edAddPlayer(d) {
      const pos = document.getElementById('newpos').value;
      const c = club(d.cid);
      const used = new Set(Object.values(db().players).map((p) => p.name));
      const p = P.makePlayer(Math.random, { pos, level: P.levelFromRep(c.rep), clubId: c.id, used });
      db().players[p.id] = p;
      changed([c.id]);
      A.st.ed = { v: 'player', pid: p.id, cid: c.id }; A.render(); window.scrollTo(0, 0);
      A.toast(`${p.name} adicionado ao ${c.name}`);
    },
    edDelete(d) {
      const p = db().players[d.id]; if (!p) return;
      const cid = p.clubId;
      if (cid && players(cid).length <= 11) { A.toast('O clube precisa de pelo menos 11 jogadores'); return; }
      delete db().players[d.id];
      changed([cid]);
      A.st.confirm = null; A.st.ed = { v: 'club', cid }; A.render(); A.toast('Jogador removido');
    },
    edHeal(d) { const p = db().players[d.id]; p.inj = 0; p.susp = 0; p.cond = 100; p.mor = Math.max(p.mor, 70); changed([]); A.toast(`${p.name} pronto para jogar`); },
    edExport() { A.st.edio = 'export'; A.render(); },
    edImport() {
      const ta = document.getElementById('ed-imp');
      try {
        const nd = P.normalizeDb(JSON.parse(ta.value));
        A.setup.db = nd; A.setup.club = null; A.setup.editing = false; A.setup.importing = false;
        A.g = null; A.st.ed = { v: 'clubs' };
        A.render(); window.scrollTo(0, 0); A.toast('Banco importado. Escolha o clube para começar.');
      } catch (e) { A.toast('Não deu para importar: ' + e.message); }
    },
    edRegen(d) {
      A.setup.db = P.generateDatabase(d.k === 'default' ? 2027 : (Date.now() & 0xffffff));
      A.setup.club = null; A.render(); A.toast(d.k === 'default' ? 'Banco padrão restaurado' : 'Novo banco sorteado');
    }
  });

  Object.assign(A.CHG, {
    cf(el) {
      const c = club(A.st.ed.cid), k = el.dataset.k;
      let v = el.value;
      if (k === 'rep') v = P.clamp(Math.round(Number(v) || 65), 1, 100);
      if (k === 'short') v = v.toUpperCase().slice(0, 3) || c.short;
      if (k === 'name' && !v.trim()) v = c.name;
      c[k] = v; el.value = v;
      const b = document.getElementById('ed-badge'); if (b) b.innerHTML = P.badge(c, 48);
      changed([]);
    },
    cfColor(el) {
      const c = club(A.st.ed.cid);
      c.colors[Number(el.dataset.i)] = el.value;
      const b = document.getElementById('ed-badge'); if (b) b.innerHTML = P.badge(c, 48);
      changed([]);
    },
    pf(el) {
      const p = db().players[A.st.ed.pid], k = el.dataset.k;
      if (k === 'name') { p.name = el.value.trim() || p.name; el.value = p.name; changed([]); return; }
      if (k === 'age') { p.age = P.clamp(Math.round(Number(el.value) || p.age), 15, 45); el.value = p.age; changed([]); return; }
      if (k === 'pot') { p.pot = P.clamp(Number(el.value) || p.pot, 1, 20); el.value = p.pot; changed([]); return; }
      if (k === 'pos') { p.pos = el.value; changed([p.clubId]); A.render(); return; }
      if (k === 'clubId') {
        const old = p.clubId;
        if (old && players(old).length <= 11) { el.value = old; A.toast('O clube de origem precisa manter pelo menos 11 jogadores'); return; }
        p.clubId = el.value; A.st.ed.cid = p.clubId;
        changed([old, p.clubId]); A.render(); A.toast(`${p.name} transferido para o ${club(p.clubId).name}`);
      }
    },
    pa(el) {
      const p = db().players[A.st.ed.pid];
      const v = P.clamp(Math.round(Number(el.value) || p.a[el.dataset.k]), 1, 20);
      p.a[el.dataset.k] = v; el.value = v;
      const o = document.getElementById('ed-ovr'); if (o) o.textContent = P.ovr(p);
      changed([]);
    },
    edFile(el) { A.readFileInto(el, 'ed-imp'); }
  });
})(window.PFC);
