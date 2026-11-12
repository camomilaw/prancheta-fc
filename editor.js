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
    if (A.g) {
      P.dirty(A.g);
      P.ensureEconomy(A.g);
      (cids || []).forEach((cid) => { if (cid && A.g.tac[cid]) P.fixXI(A.g, cid); });
      A.save();
    }
  };

  P.editor = {};
  P.editor.page = function (setupMode) {
    const ed = A.st.ed || (A.st.ed = { v: 'clubs' });
    let body;
    if (ed.v === 'club' && club(ed.cid)) body = vClub(ed.cid, setupMode);
    else if (ed.v === 'player' && db().players[ed.pid]) body = vPlayer(ed.pid);
    else if (ed.v === 'db') body = vDb(setupMode);
    else body = vClubs();
    const tabs = `<div class="seg"><button class="${ed.v !== 'db' ? 'on' : ''}" data-a="edGo" data-v="clubs">Clubes e jogadores</button><button class="${ed.v === 'db' ? 'on' : ''}" data-a="edGo" data-v="db">Banco e patches</button></div>`;
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
  function clubRows(list, ovrs) {
    return list.map((c) => `<button class="prow" data-a="edClub" data-id="${c.id}" style="grid-template-columns:36px 1fr auto">
      ${P.badge(c, 30)}<span class="nm"><b>${esc(c.name)}${c.custom ? '<span class="chip xi">Seu</span>' : ''}</b><small>${esc(P.countryName(c.country))} · ${c.div}ª div · ${players(c.id).length} jogadores</small></span>
      <span class="ovr">${ovrs[c.id]}</span></button>`).join('') || '<p class="empty">Nenhum clube encontrado.</p>';
  }
  function filteredClubs() {
    const ed = A.st.ed, q = (ed.q || '').trim().toLowerCase();
    const ovrs = P.clubOvrs(db());
    const list = (q ? db().clubs.filter((c) => (c.name + ' ' + c.city + ' ' + P.countryName(c.country)).toLowerCase().includes(q)) : P.divClubs(db(), ed.div || 1))
      .slice().sort((a, b) => a.div - b.div || ovrs[b.id] - ovrs[a.id]);
    return clubRows(list, ovrs);
  }
  function vClubs() {
    const ed = A.st.ed;
    return `<div class="card"><div class="filters" style="margin-bottom:10px">${A.divSel(ed.div || 1, 'edDiv')}
        <input class="sel search" data-i="edClubQ" value="${esc(ed.q || '')}" placeholder="Buscar clube" aria-label="Buscar clube"></div>
      <div class="plist" id="ed-clubs">${filteredClubs()}</div></div>`;
  }

  // ---------- Clube ----------
  function vClub(cid, setupMode) {
    const c = club(cid);
    const ps = players(cid).sort((a, b) => LINE_ORDER[a.pos] - LINE_ORDER[b.pos] || P.ovr(b) - P.ovr(a));
    const f = (k, label, extra) => `<div class="field"><label class="label" for="cf-${k}">${label}</label><input id="cf-${k}" data-c="cf" data-k="${k}" value="${esc(c[k])}" ${extra || ''}></div>`;
    return `${crumbs([['Clubes', 'edGo', 'data-v="clubs"'], [c.name]])}
      ${setupMode && c.custom && A.setup.club === c.id ? `<div class="create-cta"><div style="flex:1;min-width:0"><b>Seu clube está pronto.</b><div class="muted" style="font-size:.88rem">Edite os jogadores abaixo ou volte para começar a carreira.</div></div><button class="btn primary" data-a="edExit">Voltar e começar</button></div>` : ''}
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <div class="row"><span id="ed-badge">${P.badge(c, 48)}</span><div style="flex:1;min-width:0"><h2>${esc(c.name)}</h2><div class="muted">${c.div}ª divisão</div></div><span class="ovr">${P.clubOvr(db(), cid)}</span></div>
        <div class="form-grid">
          ${f('name', 'Nome', 'maxlength="40"')}
          ${f('short', 'Sigla (3 letras)', 'maxlength="3"')}
          ${f('city', 'Cidade', 'maxlength="40"')}
          ${f('stadium', 'Estádio', 'maxlength="50"')}
          <div class="field"><label class="label" for="cf-country">País</label><select id="cf-country" data-c="cf" data-k="country">${A.countryOpts(c.country)}</select></div>
          <div class="field"><label class="label" for="cf-rep">Reputação (1-100)</label><input id="cf-rep" type="number" min="1" max="100" data-c="cf" data-k="rep" value="${c.rep}"></div>
          ${A.g ? `<div class="field"><label class="label" for="cf-bal">Saldo (R$ milhões)</label><input id="cf-bal" type="text" inputmode="decimal" autocomplete="off" data-c="cf" data-k="bal" value="${String(Math.round((c.bal || 0) / 1e5) / 10).replace('.', ',')}"><small class="muted" style="font-size:.76rem">Hoje: ${P.money(c.bal || 0)}. Aceita valor negativo.</small></div>` : ''}
          <div class="field"><label class="label" for="cf-c0">Cor principal</label><input id="cf-c0" type="color" data-c="cfColor" data-i="cfColorLive" data-n="0" value="${esc(c.colors[0])}"></div>
          <div class="field"><label class="label" for="cf-c1">Cor secundária</label><input id="cf-c1" type="color" data-c="cfColor" data-i="cfColorLive" data-n="1" value="${esc(c.colors[1])}"></div>
        </div>
        <p class="muted" style="margin:0;font-size:.85rem">A reputação define o nível dos jogadores gerados para o clube (novos jogadores e jovens da base).</p>
      </div>
      <div class="card"><div class="head"><span class="label">Elenco · ${ps.length} jogadores</span></div>
        <div class="row" style="margin-bottom:10px">
          <select id="newpos" class="sel" aria-label="Posição do novo jogador">${P.POS.map((p) => `<option value="${p}">${p} · ${P.POS_NAME[p]}</option>`).join('')}</select>
          <button class="btn" data-a="edAddPlayer" data-cid="${cid}">Criar jogador</button>
        </div>
        <div class="field" style="margin-bottom:10px"><label class="label" for="ed-pq">Trazer jogador de outro clube</label>
          <input id="ed-pq" class="search" data-i="edPlayerQ" placeholder="Digite pelo menos 3 letras do nome" autocomplete="off"></div>
        <div class="plist" id="ed-presults"></div>
        <div class="plist">${ps.map((p) => `<button class="prow" data-a="edPlayer" data-id="${p.id}">
          <span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span>
          <span class="nm"><b>${esc(p.name)}</b><small>${esc(p.nat || '')} · ${p.age} anos · ${P.money(P.value(p))}</small></span>
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
    const clubOpts = db().clubs.slice().sort((a, b) => a.div - b.div || a.name.localeCompare(b.name));
    return `${crumbs([['Clubes', 'edGo', 'data-v="clubs"'], [c ? c.name : 'Sem clube', 'edClub', c ? `data-id="${c.id}"` : ''], [p.name]])}
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <div class="row"><span class="pos-tag ${P.LINE[p.pos]}" style="padding:4px 8px">${p.pos}</span><h2 style="flex:1;min-width:0">${esc(p.name)}</h2>
          <div style="text-align:right"><div class="label">Força</div><div class="big-ovr" id="ed-ovr">${P.ovr(p)}</div></div></div>
        <div class="form-grid">
          <div class="field"><label class="label" for="pf-name">Nome</label><input id="pf-name" data-c="pf" data-k="name" value="${esc(p.name)}" maxlength="40"></div>
          <div class="field"><label class="label" for="pf-age">Idade</label><input id="pf-age" type="number" min="15" max="45" data-c="pf" data-k="age" value="${p.age}"></div>
          <div class="field"><label class="label" for="pf-nat">Nacionalidade</label><select id="pf-nat" data-c="pf" data-k="nat">${A.countryOpts(p.nat)}</select></div>
          <div class="field"><label class="label" for="pf-pos">Posição</label><select id="pf-pos" data-c="pf" data-k="pos">${P.POS.map((x) => `<option value="${x}" ${p.pos === x ? 'selected' : ''}>${x} · ${P.POS_NAME[x]}</option>`).join('')}</select></div>
          <div class="field"><label class="label" for="pf-club">Clube</label><select id="pf-club" data-c="pf" data-k="clubId">${clubOpts.map((x) => `<option value="${x.id}" ${p.clubId === x.id ? 'selected' : ''}>${x.div}ª · ${esc(x.name)}</option>`).join('')}</select></div>
          ${A.g ? `<div class="field"><label class="label" for="pf-wage">Salário mensal (R$)</label><input id="pf-wage" type="number" min="0" step="500" data-c="pf" data-k="wage" value="${p.wage || 0}"></div>
          <div class="field"><label class="label" for="pf-ctr">Contrato até</label><input id="pf-ctr" type="number" min="${A.g.season}" max="${A.g.season + 6}" data-c="pf" data-k="ctr" value="${p.ctr || A.g.season}"></div>` : ''}
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

  // ---------- Banco de dados e patches ----------
  function vDb(setupMode) {
    const io = A.st.edio || '';
    return `<div class="grid2">
      <div class="card" style="display:flex;flex-direction:column;gap:12px;grid-column:1/-1"><h3>Importar patch ou banco</h3>
        <p class="muted" style="margin:0"><b>Patch</b> (como o de clubes reais) troca nomes, siglas, cores, cidades, estádios e países dos clubes e mantém jogadores e carreira. <b>Banco completo</b> substitui clubes e jogadores${setupMode ? '' : ' e começa uma nova carreira (a atual continua salva até você iniciar outra)'}.</p>
        <input type="file" accept=".json,.txt,application/json" data-c="edFile" aria-label="Arquivo para importar">
        <div class="field"><textarea id="ed-imp" placeholder="Ou cole o JSON aqui"></textarea></div>
        <div><button class="btn primary" data-a="edImport">Importar</button></div>
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><h3>Exportar banco</h3>
        <p class="muted" style="margin:0">Gera clubes e jogadores em texto JSON. Guarde, edite num editor de texto ou compartilhe com quem joga.</p>
        <div><button class="btn" data-a="edExport">Gerar texto</button></div>
        ${io === 'export' ? `<div class="field"><textarea id="ed-io" readonly>${esc(JSON.stringify(db()))}</textarea></div><div><button class="btn" data-a="copy" data-t="ed-io">Copiar</button></div>` : ''}
      </div>
      <div class="card" style="display:flex;flex-direction:column;gap:12px"><h3>Exportar como patch</h3>
        <p class="muted" style="margin:0">Só os dados dos clubes (nomes, cores, países). Leve e fácil de compartilhar.</p>
        <div><button class="btn" data-a="edExportPatch">Gerar patch</button></div>
        ${io === 'patch' ? `<div class="field"><textarea id="ed-io" readonly>${esc(JSON.stringify({ type: 'patch', name: 'Meu patch', version: 1, clubs: db().clubs.map((c) => ({ id: c.id, name: c.name, short: c.short, country: c.country, city: c.city, stadium: c.stadium, colors: c.colors })) }))}</textarea></div><div><button class="btn" data-a="copy" data-t="ed-io">Copiar</button></div>` : ''}
      </div>
      ${setupMode ? `<div class="card" style="display:flex;flex-direction:column;gap:12px;grid-column:1/-1"><h3>Gerar de novo</h3>
        <p class="muted" style="margin:0">Cria clubes e jogadores fictícios novos, com nomes e atributos sorteados.</p>
        <div class="row"><button class="btn" data-a="edRegen" data-k="default">Banco padrão</button><button class="btn" data-a="edRegen" data-k="random">Sortear novo banco</button></div></div>` : ''}
    </div>`;
  }

  // ---------- Ações ----------
  Object.assign(A.ACT, {
    edGo(d) { const keep = A.st.ed || {}; A.st.ed = { v: d.v || 'clubs', div: keep.div, q: keep.q }; A.st.confirm = null; A.st.edio = ''; A.render(); window.scrollTo(0, 0); },
    edExit() { A.setup.editing = false; A.render(); window.scrollTo(0, 0); },
    edClub(d) { if (!d.id) return A.ACT.edGo({ v: 'clubs' }); const keep = A.st.ed || {}; A.st.ed = { v: 'club', cid: d.id, div: keep.div, q: keep.q }; A.st.confirm = null; A.render(); window.scrollTo(0, 0); },
    edPlayer(d) { const p = db().players[d.id]; const keep = A.st.ed || {}; A.st.ed = { v: 'player', pid: d.id, cid: p.clubId, div: keep.div, q: keep.q }; A.st.confirm = null; A.render(); window.scrollTo(0, 0); },
    edAddPlayer(d) {
      const pos = document.getElementById('newpos').value;
      const c = club(d.cid);
      const used = new Set(Object.values(db().players).map((p) => p.name));
      const p = P.makePlayer(Math.random, { pos, level: P.levelFromRep(c.rep), clubId: c.id, used, country: c.country });
      db().players[p.id] = p;
      changed([c.id]);
      A.st.ed = Object.assign({}, A.st.ed, { v: 'player', pid: p.id, cid: c.id }); A.render(); window.scrollTo(0, 0);
      A.toast(`${p.name} criado no ${c.name}`);
    },
    edBring(d) {
      const p = db().players[d.id], to = A.st.ed.cid, from = p.clubId;
      if (from && players(from).length <= 11) { A.toast('O clube de origem precisa manter pelo menos 11 jogadores'); return; }
      p.clubId = to;
      changed([from, to]);
      A.render(); A.toast(`${p.name} agora joga no ${club(to).name}`);
    },
    edDelete(d) {
      const p = db().players[d.id]; if (!p) return;
      const cid = p.clubId;
      if (cid && players(cid).length <= 11) { A.toast('O clube precisa de pelo menos 11 jogadores'); return; }
      delete db().players[d.id];
      changed([cid]);
      A.st.confirm = null; A.st.ed = Object.assign({}, A.st.ed, { v: 'club', cid }); A.render(); A.toast('Jogador removido');
    },
    edHeal(d) { const p = db().players[d.id]; p.inj = 0; p.susp = 0; p.cond = 100; p.mor = Math.max(p.mor, 70); changed([]); A.toast(`${p.name} pronto para jogar`); },
    edExport() { A.st.edio = 'export'; A.render(); },
    edExportPatch() { A.st.edio = 'patch'; A.render(); },
    edImport() {
      const ta = document.getElementById('ed-imp');
      try {
        const msg = A.importAny(ta.value, !!A.g);
        A.st.ed = { v: A.g ? 'db' : 'clubs' };
        A.render(); window.scrollTo(0, 0); A.toast(msg);
      } catch (e) { A.toast('Não deu para importar: ' + e.message); }
    },
    edRegen(d) {
      A.setup.db = P.generateDatabase(d.k === 'default' ? 2027 : (Date.now() & 0xffffff));
      A.setup.club = null; A.render(); A.toast(d.k === 'default' ? 'Banco padrão restaurado' : 'Novo banco sorteado');
    }
  });

  Object.assign(A.CHG, {
    edDiv(el) { A.st.ed.div = Number(el.value); A.st.ed.q = ''; A.render(); },
    cf(el) {
      const c = club(A.st.ed.cid), k = el.dataset.k;
      let v = el.value;
      if (k === 'rep') v = P.clamp(Math.round(Number(v) || 65), 1, 100);
      if (k === 'bal') {
        const n = Number(String(v).replace(',', '.'));
        if (String(v).trim() === '' || !isFinite(n)) { el.value = String(Math.round((c.bal || 0) / 1e5) / 10).replace('.', ','); return; }
        c.bal = Math.round(P.clamp(n, -10000, 10000) * 1e6); // em milhões
        el.value = String(Math.round(c.bal / 1e5) / 10).replace('.', ',');
        const hint = el.parentElement.querySelector('small'); if (hint) hint.textContent = `Hoje: ${P.money(c.bal)}. Aceita valor negativo.`;
        changed([]); if (A.toast) A.toast(`Saldo do ${c.name}: ${P.money(c.bal)}`);
        return;
      }
      if (k === 'short') v = v.toUpperCase().slice(0, 3) || c.short;
      if (k === 'name' && !v.trim()) v = c.name;
      c[k] = v; el.value = v;
      const b = document.getElementById('ed-badge'); if (b) b.innerHTML = P.badge(c, 48);
      changed([]);
    },
    cfColor(el) { const c = club(A.st.ed.cid); c.colors[Number(el.dataset.n)] = el.value; changed([]); },
    pf(el) {
      const p = db().players[A.st.ed.pid], k = el.dataset.k;
      if (k === 'name') { p.name = el.value.trim() || p.name; el.value = p.name; changed([]); return; }
      if (k === 'age') { p.age = P.clamp(Math.round(Number(el.value) || p.age), 15, 45); el.value = p.age; changed([]); return; }
      if (k === 'pot') { p.pot = P.clamp(Number(el.value) || p.pot, 1, 20); el.value = p.pot; changed([]); return; }
      if (k === 'nat') { p.nat = el.value; changed([]); return; }
      if (k === 'wage') { p.wage = Math.max(0, Math.round(Number(el.value) || 0)); el.value = p.wage; changed([]); return; }
      if (k === 'ctr') { p.ctr = P.clamp(Math.round(Number(el.value) || A.g.season), A.g.season, A.g.season + 6); el.value = p.ctr; changed([]); return; }
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

  Object.assign(A.INP, {
    edClubQ(el) { A.st.ed.q = el.value; document.getElementById('ed-clubs').innerHTML = filteredClubs(); },
    cfColorLive(el) {
      const c = club(A.st.ed.cid); c.colors[Number(el.dataset.n)] = el.value;
      const b = document.getElementById('ed-badge'); if (b) b.innerHTML = P.badge(c, 48);
    },
    edPlayerQ(el) {
      const box = document.getElementById('ed-presults');
      const q = el.value.trim().toLowerCase();
      const cid = A.st.ed.cid;
      if (q.length < 3) { box.innerHTML = ''; return; }
      const res = Object.values(db().players).filter((p) => p.clubId !== cid && p.name.toLowerCase().includes(q))
        .sort((a, b) => P.ovr(b) - P.ovr(a)).slice(0, 15);
      box.innerHTML = res.length ? res.map((p) => {
        const c = club(p.clubId);
        return `<div class="prow" style="grid-template-columns:44px 1fr auto auto"><span class="pos-tag ${P.LINE[p.pos]}">${p.pos}</span>
          <span class="nm"><b>${esc(p.name)}</b><small>${c ? esc(c.short) + ' · ' + c.div + 'ª div' : 'Sem clube'} · ${p.age} anos</small></span>
          <span class="ovr">${P.ovr(p)}</span><button class="btn sm" data-a="edBring" data-id="${p.id}">Trazer</button></div>`;
      }).join('') : '<p class="empty">Nenhum jogador encontrado.</p>';
    }
  });
})(window.PFC);
