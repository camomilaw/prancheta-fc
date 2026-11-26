/* Prancheta FC — estilo do técnico e início de carreira em passos
 * O técnico escolhe até 2 estilos (cada um com um lado bom e um custo) e uma formação preferida.
 * Os efeitos valem só para o time do jogador: força nos jogos, cartões, moral, base, entrosamento e mercado.
 */
(function (P) {
  const A = P.app, esc = P.esc;

  P.COACH_STYLES = {
    retranca: { n: 'Retranqueiro', good: 'Defesa 5% mais forte', bad: 'ataque 3% mais fraco' },
    ofensivo: { n: 'Ofensivo', good: 'Ataque 5% mais forte', bad: 'defesa 3% mais fraca' },
    formador: { n: 'Formador', good: 'Base e jovens evoluem 20% mais', bad: 'o elenco principal treina um pouco menos' },
    motivador: { n: 'Motivador', good: 'Moral sobe mais e cai menos nas derrotas', bad: 'jogadores insatisfeitos cobram mais (pedem salário maior para renovar)' },
    agregador: { n: 'Agregador', good: 'O time ganha entrosamento 40% mais rápido', bad: 'novos jogadores perdem um pouco de moral ao chegar' },
    negociador: { n: 'Negociador', good: 'Compra até 8% mais barato e vende 5% mais caro', bad: 'jogadores pedem 3% a mais de salário' },
    disciplinador: { n: 'Disciplinador', good: 'O time leva 20% menos cartões', bad: 'a moral sobe um pouco menos' }
  };
  const has = (g, k) => !!(g && g.coach && g.coach.styles && g.coach.styles.includes(k));
  P.coachHas = has;

  // Fatores na partida para o time do usuário (chamado no simInit)
  P.coachFx = function (g, cid, tac) {
    if (!g || !g.coach || cid !== g.user) return null;
    const f = { a: 1, m: 1, d: 1, cards: 1 };
    if (has(g, 'retranca')) { f.d *= 1.05; f.a *= 0.97; }
    if (has(g, 'ofensivo')) { f.a *= 1.05; f.d *= 0.97; }
    if (has(g, 'disciplinador')) f.cards = 0.8;
    // formação preferida: o time joga mais solto nela
    if (g.coach.form && tac && !tac.xy && tac.f === g.coach.form) { f.a *= 1.03; f.m *= 1.03; f.d *= 1.03; }
    return f;
  };

  // País do técnico: compatriotas assinam mais fácil (salário menor, aceitam descer mais divisões)
  const origDemand = P.playerDemand;
  if (origDemand) P.playerDemand = function (g, p, toCid) {
    const same = g && g.coach && g.coach.nat && toCid === g.user && p.nat === g.coach.nat;
    let d = origDemand.apply(this, arguments);
    if (!same) return d;
    if (d == null) { const from = p.clubId ? P.club(g, p.clubId) : null, to = P.club(g, toCid); if (from && P.dt(to) - P.dt(from) <= 4) d = Math.round(P.wageFor(p) * 1.8 / 500) * 500; else return d; }
    return Math.round(d * 0.9 / 500) * 500;
  };
  // palavras conforme o gênero escolhido
  P.cw = (g) => (g && g.coach && g.coach.gender === 'f' ? { tec: 'técnica', o: 'a', do: 'da', no: 'na', demitido: 'demitida', novo: 'nova' } : { tec: 'técnico', o: 'o', do: 'do', no: 'no', demitido: 'demitido', novo: 'novo' });

  // ---------- Escolha do estilo (usada no início de carreira e na aba do técnico) ----------
  P.coachPicker = function (cur, act) {
    const styles = (cur && cur.styles) || [], form = (cur && cur.form) || '4-4-2';
    const clash = (k) => P.COACH_CLASH && P.COACH_CLASH[k] && styles.includes(P.COACH_CLASH[k]);
    return `<div class="coach-pick">${Object.entries(P.COACH_STYLES).map(([k, s]) => `<button class="coach-st ${styles.includes(k) ? 'on' : ''} ${clash(k) ? 'clash' : ''}" data-a="${act}" data-k="${k}" ${clash(k) ? `title="Não combina com ${esc(P.COACH_STYLES[P.COACH_CLASH[k]].n)}"` : ''}>
        <b>${esc(s.n)}</b><small><span class="good">+ ${esc(s.good)}</span><span class="bad">− ${esc(s.bad)}</span></small></button>`).join('')}</div>
      <div class="field" style="margin-top:10px"><span class="jr-step">Formação preferida</span><select class="sel" data-c="${act}Form">${Object.keys(P.FORMATIONS).map((f) => `<option ${f === form ? 'selected' : ''}>${f}</option>`).join('')}</select>
      <small class="jr-note">Jogando nela (sem posições personalizadas), o time rende 3% a mais.</small></div>`;
  };
  // estilos que se contradizem: escolher um tira o outro
  const CLASH = { retranca: 'ofensivo', ofensivo: 'retranca', motivador: 'disciplinador', disciplinador: 'motivador' };
  P.COACH_CLASH = CLASH;
  const toggle = (obj, k) => {
    const st = obj.styles || (obj.styles = []);
    const i = st.indexOf(k), opp = CLASH[k];
    if (i < 0 && opp && st.includes(opp)) {
      st.splice(st.indexOf(opp), 1, k);
      A.toast(`${P.COACH_STYLES[k].n} e ${P.COACH_STYLES[opp].n} não combinam: trocado para ${P.COACH_STYLES[k].n}`);
      return true;
    }
    if (i >= 0) st.splice(i, 1);
    else if (st.length >= 2) { A.toast('Escolha no máximo 2 estilos'); return false; }
    else st.push(k);
    return true;
  };

  // ---------- Nova carreira em 3 passos ----------
  P.newCareerView = function () {
    const s = A.setup, step = s.newc;
    const c = s.coach || (s.coach = { styles: [], form: '4-4-2', age: 40, nat: 'BRA', gender: 'm' });
    const dots = [1, 2, 3].map((i) => `<span class="nc-dot ${i === step ? 'on' : i < step ? 'done' : ''}">${i}</span>`).join('<i></i>');
    let body = '';
    if (step === 1) {
      const nats = Object.entries(P.COUNTRIES).sort((a, b) => a[1].n.localeCompare(b[1].n));
      body = `<section class="jr-classif nc1"><div class="jr-classif-h"><h2>Ficha de inscrição</h2><span>Classificados</span></div>
        <div class="nc1-grid">
          <div class="nc1-left">
            <div class="field"><label class="jr-step" for="mgr">Seu nome</label><input id="mgr" class="jr-sign" data-i="mgr" value="${esc(s.manager)}" placeholder="assine aqui" maxlength="30"></div>
            <div class="nc1-row">
              <div class="field"><label class="jr-step" for="nc-age">Idade</label><input id="nc-age" class="sel" type="number" inputmode="numeric" min="14" max="110" step="1" data-c="ncMeta" data-k="age" value="${c.age || 40}"></div>
              <div class="field"><span class="jr-step">Você é</span><div class="seg">${[['m', 'Técnico'], ['f', 'Técnica']].map(([k, n]) => `<button class="${(c.gender || 'm') === k ? 'on' : ''}" data-a="ncGender" data-k="${k}">${n}</button>`).join('')}</div></div>
            </div>
            <div class="field"><label class="jr-step" for="nc-nat">País</label><select id="nc-nat" class="sel" data-c="ncMeta" data-k="nat">${nats.map(([k, v]) => `<option value="${k}" ${k === (c.nat || 'BRA') ? 'selected' : ''}>${esc(v.n)}</option>`).join('')}</select>
              <small class="jr-note">Jogadores do seu país pedem salário menor e aceitam descer mais divisões para trabalhar com você. Estrangeiros do seu país (ou que falam a sua língua) se adaptam mais rápido ao clube.</small></div>
          </div>
          <div class="nc1-right"><span class="jr-step">Formação e estilo (até 2)</span>${P.coachPicker(c, 'ncStyle')}</div>
        </div></section>`;
    }
    if (step === 2) body = `<section class="jr-classif"><div class="jr-classif-h"><h2>Condições do contrato</h2><span>Classificados</span></div>
        ${P.modePick ? P.modePick() : ''}${P.setupExtra ? P.setupExtra() : ''}${P.slotPick ? P.slotPick() : ''}</section>`;
    if (step === 3) body = A.clubPickSection ? A.clubPickSection() : '';
    return `<div class="setup jr nc nc-s${step}">
      <div class="row"><button class="btn" data-a="ncBack">‹ ${step === 1 ? 'Capa' : 'Voltar'}</button><span class="spacer"></span><span class="nc-steps">${dots}</span></div>
      <header class="jr-mast"><div class="jr-mast-top"><span>Classificados</span><span>Passo ${step} de 3</span><span>Procura-se técnico</span></div>
        <h1>${['', 'O técnico', 'A diretoria', 'O clube'][step]}</h1></header>
      ${body}
      ${step < 3 ? `<div class="row"><span class="spacer"></span><button class="btn primary" data-a="ncNext">Próximo →</button></div>` : ''}
    </div>`;
  };

  Object.assign(A.ACT, {
    ncOpen() { A.setup.newc = 1; A.render(); window.scrollTo(0, 0); },
    ncBack() { const s = A.setup; s.newc = s.newc > 1 ? s.newc - 1 : 0; A.render(); window.scrollTo(0, 0); },
    ncNext() {
      const s = A.setup;
      if (s.newc === 1 && !(s.manager || '').trim()) { A.toast('Assine com o seu nome'); const el = document.getElementById('mgr'); if (el) el.focus(); return; }
      s.newc = Math.min(3, s.newc + 1); A.render(); window.scrollTo(0, 0);
    },
    ncStyle(d) { if (toggle(A.setup.coach, d.k)) A.render(); },
    ncGender(d) { A.setup.coach.gender = d.k; A.render(); },
    // aba do técnico (carreiras antigas ou mudança de estilo no fim da temporada)
    cStyle(d) { const g = A.g; g.coach = g.coach || { styles: [], form: '4-4-2' }; if (toggle(g.coach, d.k)) { A.save(); A.render(); } }
  });
  Object.assign(A.CHG, {
    ncStyleForm(el) { A.setup.coach.form = el.value; },
    ncMeta(el) { let v = el.value; if (el.dataset.k === 'age') { v = Math.round(Math.min(110, Math.max(14, Number(v) || 40))); el.value = v; } A.setup.coach[el.dataset.k] = v; },
    cStyleForm(el) { const g = A.g; g.coach = g.coach || { styles: [], form: '4-4-2' }; g.coach.form = el.value; A.save(); }
  });

  // Cartão do estilo na aba do técnico
  P.coachCard = function (g) {
    const c = g.coach;
    const canEdit = !c || !c.styles || !c.styles.length || g.over || A.st.cEdit;
    const list = c && c.styles && c.styles.length ? c.styles.map((k) => P.COACH_STYLES[k]).filter(Boolean) : [];
    return `<div class="coach-card"><div class="row"><span class="label" style="flex:1">Estilo do técnico</span>${!canEdit ? '' : ''}</div>
      ${list.length ? `<div class="coach-tags">${list.map((s) => `<span class="coach-tag" title="+ ${esc(s.good)} · − ${esc(s.bad)}">${esc(s.n)}</span>`).join('')}${c.form ? `<span class="coach-tag f">Prefere ${esc(c.form)}</span>` : ''}</div>` : '<p class="jr-note">Ainda sem estilo definido. Escolha até 2.</p>'}
      ${canEdit ? `<div style="margin-top:8px">${P.coachPicker(c, 'cStyle')}</div><p class="jr-note">${list.length ? 'Fim de temporada: dá para rever o estilo agora.' : ''}</p>` : '<p class="jr-note">Dá para mudar o estilo no fim de cada temporada.</p>'}</div>`;
  };
})(window.PFC);
