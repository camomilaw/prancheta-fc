/* Prancheta FC — compartilhar times
 * Baixa o time da carreira num arquivo (.json) para mandar a outras pessoas.
 * Quem recebe importa na tela inicial: começa uma carreira com ele, coloca como adversário
 * ou guarda para o Modo Torneio. Os times importados ficam salvos no aparelho (biblioteca).
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const LIB_KEY = 'prancheta-fc:teams';
  const DROP = ['clubId', 's', 'cs', 'cond', 'mor', 'inj', 'injN', 'susp', 'ylw', 'listed', 'loanList', 'saleList', 'loan', 'ad', 'unh', 'wage', 'ctr', 'freeSince', 'potT', 'tr', 'lo', 'hi', 'fee'];

  // ---------- Exportar ----------
  P.exportTeam = function (g, cid) {
    const c = P.club(g, cid || g.user), t = g.tac[c.id] || {};
    const players = P.squad(g, c.id).map((p) => {
      const o = JSON.parse(JSON.stringify(p));
      DROP.forEach((k) => delete o[k]);
      return o;
    });
    return {
      type: 'team', v: 1, name: c.name, short: c.short, city: c.city, stadium: c.stadium, country: c.country,
      colors: c.colors, logo: c.logo || null, cap: c.cap || null, rep: c.rep, div: c.div,
      manager: cid && cid !== g.user ? null : g.manager, season: g.season,
      tac: { f: t.f, xy: t.xy || null, men: t.men, pre: t.pre, ins: t.ins || null, roles: t.roles || null },
      players
    };
  };
  const slug = (s) => String(s || 'time').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  A.downloadTeam = function () {
    const g = A.g; if (!g) return;
    const team = P.exportTeam(g);
    try {
      const blob = new Blob([JSON.stringify(team)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `time-${slug(team.name)}-${team.season}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      A.toast('Arquivo do time baixado. Mande para quem quiser!');
    } catch (e) { A.toast('Não deu para baixar o arquivo neste navegador.'); }
  };

  // ---------- Biblioteca de times importados ----------
  P.teamLib = function () { try { return JSON.parse(P.store.get(LIB_KEY)) || []; } catch (e) { return []; } };
  P.teamLibSave = function (list) { P.store.set(LIB_KEY, JSON.stringify(list.slice(0, 24))); };
  P.teamLibAdd = function (team) {
    const list = P.teamLib().filter((x) => !(x.name === team.name && x.season === team.season && x.manager === team.manager));
    team.libId = team.libId || P.uid('tm');
    list.unshift(team); P.teamLibSave(list);
    return team;
  };
  P.teamOvr = function (team) {
    const ps = team.players.slice().sort((a, b) => P.ovr(b) - P.ovr(a)).slice(0, 11);
    return ps.length ? Math.round(ps.reduce((s, p) => s + P.ovr(p), 0) / ps.length) : 0;
  };

  // ---------- Colocar um time importado no banco (no lugar de outro clube) ----------
  P.placeTeam = function (db, team, replaceId) {
    const c = db.clubs.find((x) => x.id === replaceId);
    if (!c) throw new Error('Escolha qual clube será substituído.');
    for (const p of Object.values(db.players)) if (p.clubId === c.id) delete db.players[p.id];
    Object.assign(c, { name: team.name, short: (team.short || team.name.slice(0, 3)).toUpperCase().slice(0, 3), city: team.city || team.name, stadium: team.stadium || 'Estádio ' + (team.city || team.name), country: P.COUNTRIES[team.country] ? team.country : c.country, colors: team.colors || c.colors, custom: true, imported: true });
    if (team.cap) c.cap = team.cap;
    if (team.logo && P.isLogo && P.isLogo(team.logo)) c.logo = team.logo; else delete c.logo;
    const used = new Set(Object.values(db.players).map((p) => p.name));
    for (const src of team.players) {
      const p = JSON.parse(JSON.stringify(src));
      p.id = P.uid('p'); p.clubId = c.id;
      if (used.has(p.name)) p.name = p.name + ' ' + c.short; used.add(p.name);
      Object.assign(p, { cond: 100, mor: 70, inj: 0, susp: 0, ylw: 0, s: P.blankStats() });
      if (P.wageFor) p.wage = P.wageFor(p);
      db.players[p.id] = p;
    }
    return c;
  };

  // ---------- Tela inicial: painel do time importado ----------
  P.teamImportPanel = function () {
    const s = A.setup, team = s.teamImp; if (!team) return '';
    const db = s.db, ovrs = P.clubOvrs(db);
    const div = s.teamDiv || Math.min(P.DIVS, Math.max(1, team.div || 8));
    const list = P.divClubs(db, div).sort((a, b) => ovrs[a.id] - ovrs[b.id]);
    const rep = s.teamRep && list.find((c) => c.id === s.teamRep) ? s.teamRep : list[0].id;
    return `<section class="jr-classif tm-imp" aria-label="Time importado">
      <div class="jr-classif-h"><h2>${esc(team.name)}</h2><span>Time recebido</span></div>
      <p>${team.manager ? `Time de ${esc(team.manager)}, ` : ''}temporada ${team.season || '—'} · ${team.players.length} jogadores · força ${P.teamOvr(team)}. Ele já está guardado para o Modo Torneio.</p>
      <div class="form-grid jr-two">
        <div class="field"><span class="jr-step">Divisão</span><select class="sel" data-c="tmDiv">${Array.from({ length: P.DIVS }, (_, i) => `<option value="${i + 1}" ${div === i + 1 ? 'selected' : ''}>${i + 1}ª divisão</option>`).join('')}</select></div>
        <div class="field"><span class="jr-step">No lugar de</span><select class="sel" data-c="tmRep">${list.map((c) => `<option value="${c.id}" ${rep === c.id ? 'selected' : ''}>${esc(c.name)} (${ovrs[c.id]})</option>`).join('')}</select></div>
      </div>
      <div class="row"><button class="btn primary" data-a="tmPlace" data-k="me">Jogar com ele</button><button class="btn" data-a="tmPlace" data-k="opp">Enfrentar ele</button><button class="jr-link" data-a="tmClose">fechar</button></div>
    </section>`;
  };

  Object.assign(A.CHG, {
    tmDiv(el) { A.setup.teamDiv = Number(el.value); A.setup.teamRep = null; A.render(); },
    tmRep(el) { A.setup.teamRep = el.value; }
  });
  Object.assign(A.ACT, {
    teamDownload() { A.downloadTeam(); },
    tmClose() { A.setup.teamImp = null; A.render(); },
    tmPlace(d) {
      const s = A.setup, team = s.teamImp; if (!team) return;
      const div = s.teamDiv || Math.min(P.DIVS, Math.max(1, team.div || 8));
      const ovrs = P.clubOvrs(s.db);
      const list = P.divClubs(s.db, div).sort((a, b) => ovrs[a.id] - ovrs[b.id]);
      const rep = s.teamRep && list.find((c) => c.id === s.teamRep) ? s.teamRep : list[0].id;
      const c = P.placeTeam(s.db, team, rep);
      s.teamImp = null; s.divF = c.div; s.q = '';
      if (d.k === 'me') { s.club = c.id; if (team.manager && !s.manager) s.manager = team.manager; A.render(); A.toast(`${c.name} está na ${c.div}ª divisão. Assine o contrato para começar!`); }
      else { if (s.club === c.id) s.club = null; A.render(); A.toast(`${c.name} entrou na ${c.div}ª divisão como adversário. Agora escolha o seu clube.`); }
    }
  });
})(window.PFC);
