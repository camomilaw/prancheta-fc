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

  // ---------- Escolha do estilo (usada no início de carreira e na aba do técnico) ----------
  P.coachPicker = function (cur, act) {
    const styles = (cur && cur.styles) || [], form = (cur && cur.form) || '4-4-2';
    return `<div class="coach-pick">${Object.entries(P.COACH_STYLES).map(([k, s]) => `<button class="coach-st ${styles.includes(k) ? 'on' : ''}" data-a="${act}" data-k="${k}">
        <b>${esc(s.n)}</b><small><span class="good">+ ${esc(s.good)}</span><span class="bad">− ${esc(s.bad)}</span></small></button>`).join('')}</div>
      <div class="field" style="margin-top:10px"><span class="jr-step">Formação preferida</span><select class="sel" data-c="${act}Form">${Object.keys(P.FORMATIONS).map((f) => `<option ${f === form ? 'selected' : ''}>${f}</option>`).join('')}</select>
      <small class="jr-note">Jogando nela (sem posições personalizadas), o time rende 3% a mais.</small></div>`;
  };
  const toggle = (obj, k) => {
    const st = obj.styles || (obj.styles = []);
    const i = st.indexOf(k);
    if (i >= 0) st.splice(i, 1);
    else if (st.length >= 2) { A.toast('Escolha no máximo 2 estilos'); return false; }
    else st.push(k);
    return true;
  };

  // ---------- Nova carreira em 3 passos ----------
  P.newCareerView = function () {
    const s = A.setup, step = s.newc;
    const c = s.coach || (s.coach = { styles: [], form: '4-4-2' });
    const dots = [1, 2, 3].map((i) => `<span class="nc-dot ${i === step ? 'on' : i < step ? 'done' : ''}">${i}</span>`).join('<i></i>');
    let body = '';
    if (step === 1) body = `<section class="jr-classif"><div class="jr-classif-h"><h2>Ficha de inscrição</h2><span>Classificados</span></div>
        <div class="field"><label class="jr-step" for="mgr">Seu nome</label><input id="mgr" class="jr-sign" data-i="mgr" value="${esc(s.manager)}" placeholder="assine aqui" maxlength="30"></div>
        <div><span class="jr-step">Estilo (até 2)</span>${P.coachPicker(c, 'ncStyle')}</div></section>`;
    if (step === 2) body = `<section class="jr-classif"><div class="jr-classif-h"><h2>Condições do contrato</h2><span>Classificados</span></div>
        ${P.setupExtra ? P.setupExtra() : ''}${P.slotPick ? P.slotPick() : ''}</section>`;
    if (step === 3) body = A.clubPickSection ? A.clubPickSection() : '';
    return `<div class="setup jr">
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
    // aba do técnico (carreiras antigas ou mudança de estilo no fim da temporada)
    cStyle(d) { const g = A.g; g.coach = g.coach || { styles: [], form: '4-4-2' }; if (toggle(g.coach, d.k)) { A.save(); A.render(); } }
  });
  Object.assign(A.CHG, {
    ncStyleForm(el) { A.setup.coach.form = el.value; },
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
