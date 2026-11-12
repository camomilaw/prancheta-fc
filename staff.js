/* Prancheta FC — equipe técnica
 * Olheiros, fisioterapeuta, preparador físico, treinador do Sub-20 e auxiliar técnico.
 * Cada um tem de 1 a 5 estrelas; mais estrelas = efeito maior e salário maior.
 * Os funcionários ficam em g.y.staff (junto com os olheiros do Sub-20).
 */
(function (P) {
  const A = P.app, esc = P.esc;

  P.STAFF_ROLES = {
    olheiro: { n: 'Olheiro', max: 3, wageM: 1, desc: 'Viaja o mundo atrás de jovens talentos. As missões são definidas em Elenco › Sub-20 › Olheiros.', eff: (s) => `${2 + Math.floor(s / 2)} jovens por relatório, potencial com margem de ±${[0, 12, 9, 6, 4, 2][s]}` },
    fisio: { n: 'Fisioterapeuta', max: 1, wageM: 0.8, desc: 'Recupera lesionados mais rápido.', eff: (s) => `${s * 8}% de chance por semana de adiantar a volta de cada lesionado` },
    prep: { n: 'Preparador físico', max: 1, wageM: 0.8, desc: 'Melhora a recuperação física entre os jogos.', eff: (s) => `+${(s * 1.5).toFixed(1).replace('.', ',')} de condição por semana para todo o elenco` },
    tsub: { n: 'Treinador do Sub-20', max: 1, wageM: 0.6, desc: 'Acelera a evolução dos jovens do Sub-20.', eff: (s) => `jovens evoluem ${s * 8}% mais rápido` },
    aux: { n: 'Auxiliar técnico', max: 1, wageM: 0.9, desc: 'Ajuda os jogadores de até 24 anos do profissional a evoluírem na virada da temporada.', eff: (s) => `bônus de evolução de +${(s * 0.05).toFixed(2).replace('.', ',')} por atributo ao ano` }
  };
  const STAR_WAGE = [0, 8000, 20000, 45000, 90000, 160000];
  const PER_ROLE = { olheiro: 5, fisio: 3, prep: 3, tsub: 3, aux: 3 };

  P.staffStars = (g, role) => (g.y ? g.y.staff.filter((s) => s.role === role).reduce((m, s) => Math.max(m, s.stars), 0) : 0);

  // Candidatos da temporada (todas as funções)
  P.staffCandidates = function (g) {
    const r = Math.random, names = new Set();
    const out = [];
    for (const [role, n] of Object.entries(PER_ROLE)) {
      for (let i = 0; i < n; i++) {
        const stars = P.weighted(r, [1, 2, 3, 4, 5], (s) => [0, 30, 30, 22, 12, 6][s]);
        const nat = P.pick(r, Object.keys(P.COUNTRIES));
        const wage = Math.round(STAR_WAGE[stars] * P.STAFF_ROLES[role].wageM / 500) * 500;
        out.push({ id: P.uid('s'), role, name: P.makeName(r, names, nat), nat, stars, wage, fee: wage * 6 });
      }
    }
    g.y.cands = out.sort((a, b) => b.stars - a.stars);
  };
  function ensureCands(g) {
    if (!g.y) P.ensureYouth(g);
    if (!g.y.cands.some((c) => c.role !== 'olheiro')) P.staffCandidates(g);
  }

  // Efeitos semanais (chamado pelo Sub-20 a cada semana)
  P.staffWeek = function (g) {
    const r = Math.random;
    const fisio = P.staffStars(g, 'fisio'), prep = P.staffStars(g, 'prep');
    if (!fisio && !prep) return;
    for (const p of P.squad(g, g.user)) {
      if (fisio && p.inj > 0 && r() < fisio * 0.08) p.inj--;
      if (prep) p.cond = Math.min(100, Math.round(p.cond + prep * 1.5));
    }
  };
  // Efeito na virada de temporada (auxiliar técnico)
  P.staffSeason = function (g) {
    const r = Math.random, aux = P.staffStars(g, 'aux');
    if (!aux) return;
    for (const p of P.squad(g, g.user)) {
      if (p.age > 24) continue;
      for (const at of P.ATTRS) {
        if (P.GK_ATTRS.includes(at.k) && p.pos !== 'GOL') continue;
        p.a[at.k] = P.clamp(p.a[at.k] + P.sround(r, aux * 0.05), 1, 20);
      }
    }
  };

  P.hireStaff = function (g, id) {
    ensureCands(g);
    const c = g.y.cands.find((x) => x.id === id);
    if (!c) return 'Candidato não encontrado.';
    const role = P.STAFF_ROLES[c.role];
    const have = g.y.staff.filter((s) => s.role === c.role).length;
    if (have >= role.max) return role.max === 1 ? `Você já tem um ${role.n.toLowerCase()}. Demita o atual antes.` : `Máximo de ${role.max} (${role.n.toLowerCase()}s).`;
    if (P.club(g, g.user).bal < c.fee) return 'O saldo não cobre as luvas.';
    P.pay(g, g.user, -c.fee, 'Equipe técnica');
    g.y.staff.push(Object.assign({}, c, { mission: null }));
    g.y.cands = g.y.cands.filter((x) => x.id !== id);
    P.news(g, `${c.name} (${role.n.toLowerCase()}, ${c.stars} estrelas) foi contratado.`, 'good');
    return '';
  };

  // ---------- Tela: Mercado › Funcionários ----------
  const stars = (n) => `<span class="stars">${'★'.repeat(n)}<span class="off">${'★'.repeat(5 - n)}</span></span>`;
  P.staffView = function () {
    const g = A.g;
    ensureCands(g);
    const st = A.st.mk;
    const role = st.srole || 'all';
    const roles = Object.entries(P.STAFF_ROLES);
    const mine = g.y.staff;
    const cands = g.y.cands.filter((c) => role === 'all' || c.role === role);
    const payroll = mine.reduce((t, s) => t + s.wage, 0);
    return `<div class="label" style="margin-bottom:8px">Sua equipe técnica · ${P.money(payroll)}/mês</div>
      <div class="plist">${roles.map(([k, r]) => {
        const list = mine.filter((s) => s.role === k);
        if (!list.length) return `<div class="staff-row"><div style="flex:1;min-width:0"><b>${r.n}</b><div class="muted" style="font-size:.85rem">Vago · ${esc(r.desc)}</div></div><button class="btn sm" data-a="stRole" data-r="${k}">Ver candidatos</button></div>`;
        return list.map((s) => `<div class="staff-row"><div style="flex:1;min-width:0"><b>${r.n}: ${esc(s.name)}</b> ${stars(s.stars)}
          <div class="muted" style="font-size:.85rem">${esc(r.eff(s.stars))} · ${P.money(s.wage)}/mês${k === 'olheiro' ? (s.mission ? ` · em missão (${esc(P.FOCUS[s.mission.focus].n.toLowerCase())})` : ' · <b>sem missão</b>') : ''}</div></div>
          ${A.st.mk.fire === s.id ? `<button class="btn sm" data-a="stFireNo">Cancelar</button><button class="btn sm danger" data-a="stFireYes" data-id="${s.id}">Confirmar</button>` : `<button class="btn sm danger" data-a="stFire" data-id="${s.id}">Demitir</button>`}</div>`).join('');
      }).join('')}</div>
      <div class="row" style="margin:18px 0 8px"><span class="label" style="flex:1">Disponíveis nesta temporada</span>
        <select class="sel" data-c="stRoleSel" aria-label="Função"><option value="all">Todas as funções</option>${roles.map(([k, r]) => `<option value="${k}" ${role === k ? 'selected' : ''}>${r.n}</option>`).join('')}</select></div>
      <div class="plist">${cands.map((c) => `<div class="staff-row"><div style="flex:1;min-width:0"><b>${esc(c.name)}</b> ${stars(c.stars)}
          <div class="muted" style="font-size:.85rem">${P.STAFF_ROLES[c.role].n} · ${esc(P.countryName(c.nat))} · ${esc(P.STAFF_ROLES[c.role].eff(c.stars))}</div>
          <div class="muted" style="font-size:.85rem">${P.money(c.wage)}/mês · luvas ${P.money(c.fee)}</div></div>
        <button class="btn sm primary" data-a="stHire" data-id="${c.id}">Contratar</button></div>`).join('') || '<p class="empty">Ninguém disponível para essa função.</p>'}</div>
      <p class="muted" style="font-size:.85rem">A lista de candidatos muda a cada temporada. Salários entram em Finanças › Equipe técnica.</p>`;
  };

  Object.assign(A.ACT, {
    stHire(d) {
      const err = P.hireStaff(A.g, d.id);
      if (err) { A.toast(err); return; }
      const s = A.g.y.staff[A.g.y.staff.length - 1];
      A.save(); A.render();
      A.toast(s.role === 'olheiro' ? `${s.name} contratado. Defina a missão em Elenco › Sub-20 › Olheiros.` : `${s.name} contratado`);
    },
    stFire(d) { A.st.mk.fire = d.id; A.render(); },
    stFireNo() { A.st.mk.fire = null; A.render(); },
    stFireYes(d) {
      const g = A.g, s = g.y.staff.find((x) => x.id === d.id);
      g.y.staff = g.y.staff.filter((x) => x.id !== d.id);
      A.st.mk.fire = null; A.save(); A.render(); A.toast(`${s.name} demitido`);
    },
    stRole(d) { A.st.mk.srole = d.r; A.render(); },
    stGoMarket(d) {
      A.st.mk = A.st.mk || {};
      A.st.mk.tab = 'func'; A.st.mk.srole = d.r || 'all';
      A.view = 'mercado'; A.render(); window.scrollTo(0, 0);
    }
  });
  Object.assign(A.CHG, {
    stRoleSel(el) { A.st.mk.srole = el.value; A.render(); }
  });
})(window.PFC);
