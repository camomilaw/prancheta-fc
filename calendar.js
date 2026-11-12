/* Prancheta FC — calendário, treinos e simulação
 * - Cada semana do jogo vira uma data: liga aos domingos, copa e playoffs no meio da semana.
 * - Plano de treino por semana (intensidade + foco). Sem plano, o adjunto decide.
 * - "Simular até aqui": o adjunto toca o clube até a véspera da data escolhida.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const DAY = 86400000;
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const WDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  // ---------- Treinos ----------
  P.TRAIN = {
    int: {
      des: { n: 'Descanso', cond: 12, dev: 0, mor: 1 },
      lev: { n: 'Leve', cond: 6, dev: 0.5 },
      nor: { n: 'Normal', cond: 0, dev: 1 },
      int: { n: 'Intenso', cond: -6, dev: 1.6, inj: 0.008 }
    },
    foco: {
      fis: { n: 'Físico', at: ['vel', 'res', 'for'] },
      tec: { n: 'Técnico', at: ['pas', 'dri', 'cru'] },
      ata: { n: 'Ataque', at: ['fin', 'cab', 'com'] },
      def: { n: 'Defesa', at: ['des', 'mar', 'pos'] },
      tat: { n: 'Tático', at: ['dec', 'vis', 'pos'], chem: 2 }
    }
  };
  const tr = (g) => {
    if (!g.train || g.train.s !== g.season) g.train = { s: g.season, plan: {} };
    return g.train;
  };

  // Plano do adjunto: descansa quem está cansado, alterna os focos pelas fraquezas
  P.autoPlan = function (g, w) {
    const t = g.tac[g.user];
    const xi = (t.xi || []).map((id) => g.db.players[id]).filter(Boolean);
    const cond = xi.length ? xi.reduce((s, p) => s + p.cond, 0) / xi.length : 100;
    const next = g.cal[w + 1];
    const short = next && next.t !== 'lg';
    let int = cond < 72 ? 'des' : cond < 82 || short ? 'lev' : 'nor';
    const s = P.teamPreview(g, g.user);
    const cycle = [s.att < s.def ? 'ata' : 'def', 'tec', 'tat', 'fis'];
    return { int, foco: cycle[w % cycle.length], auto: true };
  };
  P.planOf = (g, w) => tr(g).plan[w] || P.autoPlan(g, w);

  P.trainWeek = function (g, step) {
    const r = Math.random;
    const plan = P.planOf(g, g.week);
    const I = P.TRAIN.int[plan.int], F = P.TRAIN.foco[plan.foco];
    const hurt = [];
    for (const p of P.squad(g, g.user)) {
      if (p.inj) continue;
      p.cond = P.clamp(Math.round(p.cond + I.cond), 30, 100);
      if (I.mor) p.mor = Math.min(100, p.mor + I.mor);
      if (I.dev) {
        const ageF = p.age <= 21 ? 1.6 : p.age <= 24 ? 1.2 : p.age <= 29 ? 0.8 : 0.3;
        const potF = P.ovr(p) / 5 < p.pot ? 1 : 0.25;
        const attrs = p.pos === 'GOL' && plan.foco !== 'fis' ? ['ref', 'aer', 'um1'] : F.at;
        for (const k of attrs) if (p.a[k] < 20 && r() < 0.025 * I.dev * ageF * potF * (P.facLvl ? 1 + (P.facLvl(g, 'ct') - 3) * 0.12 : 1)) p.a[k]++;
      }
      if (I.inj && r() < I.inj) { p.inj = 1 + Math.floor(r() * 2); hurt.push(p.name); }
    }
    if (F.chem && I.dev && g.chem) for (const k of Object.keys(g.chem)) g.chem[k] = Math.min(100, g.chem[k] + F.chem);
    if (hurt.length) P.news(g, `Lesão no treino intenso: ${hurt.join(', ')}.`, 'bad');
  };

  // ---------- Datas ----------
  P.stepDates = function (g) {
    if (g._dates && g._dates.s === g.season && g._dates.n === g.cal.length) return g._dates.d;
    let d = Date.UTC(g.season, 1, 1);
    while (new Date(d).getUTCDay() !== 0) d += DAY; // primeiro domingo de fevereiro
    const out = [];
    g.cal.forEach((st, i) => {
      if (i === 0) { out.push(d); return; }
      const prev = out[i - 1];
      if (st.t === 'lg' || st.t === 'po') { let x = prev + DAY; while (new Date(x).getUTCDay() !== 0) x += DAY; out.push(x); }
      else out.push(prev + 3 * DAY); // quarta-feira
    });
    Object.defineProperty(g, '_dates', { value: { s: g.season, n: g.cal.length, d: out }, writable: true, configurable: true, enumerable: false });
    return out;
  };
  const fmtLong = (ms) => { const d = new Date(ms); return `${WDAYS[d.getUTCDay()]}, ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`; };
  P.fmtDate = (ms) => { const d = new Date(ms); return `${d.getUTCDate()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };

  // Jogo do usuário numa semana, sem forçar sorteios futuros
  function matchAt(g, i) {
    const st = g.cal[i];
    if (!st) return { pending: false, m: null };
    if (st.t === 'cup' && !g.cup.rounds[st.r]) return { pending: true };
    if (st.t === 'po' && (!g.po || (st.r === 1 && !g.po[2].final))) return { pending: true };
    const um = P.userMatch(g, st);
    return { pending: false, m: um ? um.m : null, ko: um && um.ko };
  }

  // ---------- Tela ----------
  const club = (cid) => A.g.db.clubs.find((c) => c.id === cid);
  P.calendarView = function () {
    const g = A.g;
    const dates = P.stepDates(g);
    const cs = A.st.cal || (A.st.cal = {});
    const cur = Math.min(g.week, g.cal.length - 1);
    if (cs.sel == null || cs.season !== g.season) { cs.sel = cur; cs.season = g.season; cs.month = new Date(dates[cur]).getUTCMonth(); }
    const month = cs.month, year = g.season;
    const first = Date.UTC(year, month, 1);
    const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const lead = (new Date(first).getUTCDay() + 6) % 7; // semana começa na segunda
    const byDay = {};
    dates.forEach((ms, i) => { byDay[ms] = i; });
    const minM = new Date(dates[0]).getUTCMonth(), maxM = new Date(dates[dates.length - 1]).getUTCMonth();
    let cells = '';
    for (let k = 0; k < lead; k++) cells += '<div class="cal-cell empty"></div>';
    for (let dnum = 1; dnum <= days; dnum++) {
      const ms = Date.UTC(year, month, dnum);
      const i = byDay[ms];
      let inner = '', cls = '';
      if (i != null) {
        const st = g.cal[i];
        const info = matchAt(g, i);
        cls += st.t === 'lg' ? ' lg' : st.t === 'cup' ? ' cup' : ' po';
        if (info.m) {
          const home = info.m.h === g.user, opp = club(home ? info.m.a : info.m.h);
          let res = '';
          if (info.m.done) {
            const gf = home ? info.m.hg : info.m.ag, ga = home ? info.m.ag : info.m.hg;
            const won = info.ko ? info.m.w === g.user : gf > ga;
            const r = info.ko ? (won ? 'V' : 'D') : gf > ga ? 'V' : gf < ga ? 'D' : 'E';
            void won; res = `<b class="res ${r}">${gf}-${ga}</b>`;
          }
          inner = `<span class="opp">${home ? 'C' : 'F'} ${esc(opp.short)}</span>${res}`;
        } else inner = `<span class="opp muted">${info.pending ? '?' : st.t === 'cup' ? 'Copa' : st.t === 'po' ? 'PO' : '—'}</span>`;
        if (tr(g).plan[i]) cls += ' planned';
      }
      if (i === cur && !g.over) cls += ' today';
      if (i != null && i === cs.sel) cls += ' sel';
      cells += `<button class="cal-cell${cls}" ${i != null ? `data-a="calSel" data-i="${i}"` : 'disabled'}><span class="dn">${dnum}</span>${inner}</button>`;
    }
    return `<div class="card"><div class="head"><h2>Calendário ${g.season}</h2><button class="btn sm ghost" data-a="go" data-v="inicio">‹ Início</button></div>
        <div class="row cal-nav"><button class="btn sm" data-a="calMonth" data-d="-1" ${month <= minM ? 'disabled' : ''} aria-label="Mês anterior">‹</button>
          <b class="cal-title">${MONTHS[month]} ${year}</b>
          <button class="btn sm" data-a="calMonth" data-d="1" ${month >= maxM ? 'disabled' : ''} aria-label="Próximo mês">›</button></div>
        <div class="cal-grid">${['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((d) => `<div class="cal-wd">${d}</div>`).join('')}${cells}</div>
        <div class="row legend"><span><i class="lg-dot lg"></i> Liga</span><span><i class="lg-dot cup"></i> Copa Ultra</span><span><i class="lg-dot po"></i> Playoffs</span><span>C = casa · F = fora</span></div>
      </div>
      ${dayPanel(g, cs.sel, dates)}`;
  };

  function dayPanel(g, i, dates) {
    const st = g.cal[i]; if (!st) return '';
    const info = matchAt(g, i);
    const past = i < g.week, isNext = i === g.week && !g.over;
    let ev;
    if (info.pending) ev = `<p style="margin:0">${esc(P.stepLabel(st))}. O adversário sai no sorteio, depois da fase anterior.</p>`;
    else if (info.m) {
      const h = club(info.m.h), a = club(info.m.a);
      const score = info.m.done ? `${info.m.hg} × ${info.m.ag}${info.m.pen ? ` (pên. ${info.m.pen[0]}-${info.m.pen[1]})` : ''}` : '×';
      ev = `<div class="fixture" style="margin-top:6px"><div class="side">${P.badge(h, 40)}<b>${esc(h.name)}</b></div><div class="vs">${score}</div><div class="side">${P.badge(a, 40)}<b>${esc(a.name)}</b></div></div>`;
    } else ev = `<p style="margin:0">${esc(P.stepLabel(st))}. Seu time não joga nesta data.</p>`;
    let plan = '';
    if (!past) {
      const p = tr(g).plan[i], cur = P.planOf(g, i);
      plan = `<div class="label" style="margin:14px 0 6px">Treino da semana ${p ? '' : '· o adjunto decide'}</div>
        <div class="opt"><span class="muted">Intensidade</span><div class="seg">${Object.entries(P.TRAIN.int).map(([k, o]) => `<button class="${cur.int === k ? 'on' : ''} ${p ? '' : 'auto'}" data-a="calPlan" data-i="${i}" data-k="int" data-v="${k}">${o.n}</button>`).join('')}</div></div>
        <div class="opt" style="margin-top:8px"><span class="muted">Foco</span><div class="seg">${Object.entries(P.TRAIN.foco).map(([k, o]) => `<button class="${cur.foco === k ? 'on' : ''} ${p ? '' : 'auto'}" data-a="calPlan" data-i="${i}" data-k="foco" data-v="${k}">${o.n}</button>`).join('')}</div></div>
        <p class="muted" style="font-size:.82rem;margin:8px 0 0">Descanso recupera a condição. Intenso evolui mais, cansa e pode lesionar. Foco tático também melhora o entrosamento.</p>
        ${p ? `<div style="margin-top:8px"><button class="btn sm" data-a="calPlanAuto" data-i="${i}">Deixar com o adjunto</button></div>` : ''}`;
    }
    const actions = isNext ? `<div class="row" style="margin-top:14px"><span class="muted" style="flex:1">É a próxima data.</span><button class="btn primary" data-a="play">${info.m ? 'Jogar' : 'Avançar'}</button></div>`
      : (!past && !g.over) ? `<div class="row" style="margin-top:14px"><span class="muted" style="flex:1;font-size:.88rem">${i - g.week} ${i - g.week === 1 ? 'semana' : 'semanas'} até lá. A simulação para na véspera.</span><button class="btn primary" data-a="simOpen" data-i="${i}">Simular até aqui</button></div>` : '';
    return `<div class="card"><div class="label">${esc(fmtLong(dates[i]))} · ${esc(P.stepLabel(st))}</div>${ev}${plan}${actions}</div>`;
  }

  // ---------- Simulação ----------
  A.simOptions = function (i) {
    const o = A.st.simOpt || (A.st.simOpt = { renew: 'yes', offers: 'reject', lineup: 'best' });
    const radio = (k, opts) => `<fieldset class="radio"><legend class="label">${opts.t}</legend>${opts.o.map(([v, n, d]) => `<label><input type="radio" name="so-${k}" value="${v}" data-c="simOpt" data-k="${k}" ${o[k] === v ? 'checked' : ''}> <span><b>${n}</b>${d ? `<br><span class="muted">${d}</span>` : ''}</span></label>`).join('')}</fieldset>`;
    const dates = P.stepDates(A.g);
    A.openSheet(`<div class="bar-top"><h2>Simular até ${P.fmtDate(dates[i])}</h2><button class="btn sm" data-a="closeSheet">Fechar</button></div>
      <p class="muted" style="margin:0">O adjunto comanda o clube até a véspera. Treinos sem plano ficam com ele. Você só poderá cancelar.</p>
      ${radio('renew', { t: 'Contratos acabando', o: [['yes', 'Renovar automaticamente', 'Renova por 2 anos quem aceitar.'], ['no', 'Deixar como estão']] })}
      ${radio('offers', { t: 'Propostas por jogadores', o: [['reject', 'Recusar todas'], ['accept', 'Aceitar todas'], ['value', 'Aceitar só acima do valor de mercado']] })}
      ${radio('lineup', { t: 'Escalação', o: [['keep', 'Manter a atual sempre que possível', 'Troca só quem estiver lesionado ou suspenso.'], ['best', 'Sempre o melhor time', 'Considera a condição física de cada jogador.']] })}
      <div class="row"><span class="spacer"></span><button class="btn primary" data-a="simStart" data-i="${i}">Começar simulação</button></div>`);
  };

  A.simStart = function (target) {
    const g = A.g, t = g.tac[g.user];
    A.closeSheet();
    A.sim = { target, from: g.week, opts: Object.assign({}, A.st.simOpt), cancel: false, auto: t.auto, v: 0, e: 0, d: 0, last: '', sold: 0 };
    t.auto = A.sim.opts.lineup === 'best';
    let el = document.getElementById('sim');
    if (!el) { el = document.createElement('div'); el.id = 'sim'; el.className = 'sim-bg'; document.body.appendChild(el); }
    el.hidden = false;
    drawSim();
    setTimeout(simStep, 60);
  };
  function drawSim() {
    const s = A.sim, g = A.g, el = document.getElementById('sim');
    if (!s || !el) return;
    const total = s.target - s.from, done = g.week - s.from;
    const dates = P.stepDates(g);
    el.innerHTML = `<div class="sim-box" role="dialog" aria-modal="true" aria-live="polite">
      <div class="label">Simulando</div>
      <h2>${esc(P.fmtDate(dates[Math.min(g.week, dates.length - 1)]))} · ${esc(P.stepLabel(g.cal[g.week]))}</h2>
      <div class="sim-bar"><i style="width:${total ? Math.round(done / total * 100) : 100}%"></i></div>
      <div class="muted">${done} de ${total} ${total === 1 ? 'semana' : 'semanas'} · campanha ${s.v}V ${s.e}E ${s.d}D</div>
      ${s.last ? `<div class="msg">${esc(s.last)}</div>` : ''}
      <button class="btn danger" data-a="simCancel">${s.cancel ? 'Cancelando...' : 'Cancelar'}</button></div>`;
  }
  function simStep() {
    const s = A.sim, g = A.g;
    if (!s) return;
    if (s.cancel || g.over || g.week >= s.target) return simEnd();
    // antes da semana: contratos
    if (s.opts.renew === 'yes') for (const p of P.squad(g, g.user)) if (p.ctr <= g.season && !p.loan) P.renew(g, p, 2);
    const res = P.playWeek(g);
    // resultado do meu time
    const mine = res && res.anim.find((x) => x.h === g.user || x.a === g.user);
    if (mine) {
      const m = mine.full, home = m.h === g.user, opp = club(home ? m.a : m.h);
      const gf = home ? m.hg : m.ag, ga = home ? m.ag : m.hg;
      if (gf > ga) s.v++; else if (gf < ga) s.d++; else s.e++;
      s.last = `${P.stepLabel(res.step)}: ${gf} × ${ga} contra o ${opp.name}${m.pen ? ` (pênaltis ${home ? m.pen[0] : m.pen[1]}-${home ? m.pen[1] : m.pen[0]})` : ''}`;
    }
    // propostas
    for (const o of (g.offers || []).slice()) {
      const p = g.db.players[o.pid];
      if (!p || p.clubId !== g.user) continue;
      const ok = s.opts.offers === 'accept' || (s.opts.offers === 'value' && o.fee >= P.value(p));
      if (ok && !P.acceptOffer(g, o.id)) s.sold++;
      else g.offers = g.offers.filter((x) => x.id !== o.id);
    }
    A.save();
    drawSim();
    setTimeout(simStep, 140);
  }
  function simEnd() {
    const s = A.sim, g = A.g;
    A.sim = null;
    g.tac[g.user].auto = s.auto;
    A.save();
    const el = document.getElementById('sim'); if (el) { el.hidden = true; el.innerHTML = ''; }
    A.view = 'inicio'; A.render(); window.scrollTo(0, 0);
    const n = g.week - s.from;
    A.toast(`${s.cancel ? 'Simulação cancelada. ' : ''}${n} ${n === 1 ? 'semana simulada' : 'semanas simuladas'}: ${s.v}V ${s.e}E ${s.d}D${s.sold ? ` · ${s.sold} ${s.sold === 1 ? 'venda' : 'vendas'}` : ''}`);
  }

  // ---------- Ações ----------
  Object.assign(A.ACT, {
    calSel(d) { A.st.cal.sel = Number(d.i); A.render(); },
    calMonth(d) { A.st.cal.month = P.clamp(A.st.cal.month + Number(d.d), 0, 11); A.render(); },
    calPlan(d) {
      const g = A.g, i = Number(d.i), plan = tr(g).plan;
      const base = plan[i] || P.autoPlan(g, i);
      plan[i] = { int: base.int, foco: base.foco };
      plan[i][d.k] = d.v;
      A.save(); A.render();
    },
    calPlanAuto(d) { delete tr(A.g).plan[Number(d.i)]; A.save(); A.render(); },
    simOpen(d) { A.simOptions(Number(d.i)); },
    simStart(d) { A.simStart(Number(d.i)); },
    simCancel() { if (A.sim) { A.sim.cancel = true; drawSim(); } }
  });
  Object.assign(A.CHG, {
    simOpt(el) { A.st.simOpt[el.dataset.k] = el.value; }
  });
})(window.PFC);
