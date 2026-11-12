/* Prancheta FC — caixa de entrada
 * O adjunto manda e-mails sobre o que exige atenção (propostas, lesões, suspensões).
 * Ficam na tela inicial; tocar num e-mail marca como lido e leva à tela certa.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const MAX = 40;
  const KIND = {
    prop: { tag: 'Proposta', go: 'Ver propostas' },
    inj: { tag: 'Lesão', go: 'Ajustar a tática' },
    sus: { tag: 'Suspensão', go: 'Ajustar a tática' }
  };
  const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'tecnico';

  function box(g) {
    if (!g.inbox) {
      const me = P.club(g, g.user);
      const adj = P.makeName(Math.random, new Set(), (me && me.country) || 'BRA');
      g.inbox = { adj, list: [] };
    }
    return g.inbox;
  }
  // Quem assina: o auxiliar técnico contratado ou o adjunto da casa
  P.adjName = (g) => { const aux = g.y && g.y.staff && g.y.staff.find((s) => s.role === 'aux'); return aux ? aux.name : box(g).adj; };
  P.adjMail = (g) => `${slug(P.adjName(g))}@gmail.com`;
  P.userMail = (g) => `${slug(g.manager)}@gmail.com`;

  P.mail = function (g, m) {
    const b = box(g);
    b.list.unshift(Object.assign({ id: P.uid('m'), s: g.season, w: g.week, read: false, l: P.stepLabel(g.cal[g.week]) }, m));
    if (b.list.length > MAX) b.list.length = MAX;
  };
  // Validade: avisos somem depois de 1 semana; propostas depois de 2 semanas ou quando a proposta
  // deixa de existir (aceita, recusada ou vencida). O e-mail é criado na semana m.w e lido a partir da m.w + 1.
  function alive(g, m) {
    if (m.s !== g.season) return false;
    if (m.k !== 'prop') return g.week < m.w + 2;
    if (g.week >= m.w + 3) return false;
    const offers = g.offers || [];
    return m.oid ? offers.some((o) => o.id === m.oid) : offers.some((o) => o.pid === m.pid);
  }
  function prune(g) {
    const b = box(g), before = b.list.length;
    b.list = b.list.filter((m) => alive(g, m));
    return before !== b.list.length;
  }
  P.mailPrune = prune;
  P.unread = (g) => { if (!g.inbox) return 0; prune(g); return g.inbox.list.filter((m) => !m.read).length; };

  // ---------- Cartão na tela inicial ----------
  P.inboxCard = function (g) {
    prune(g);
    const b = box(g), st = A.st.inbox || (A.st.inbox = { all: false });
    const n = P.unread(g);
    const list = b.list.slice(0, st.all ? MAX : 4);
    const initials = P.adjName(g).split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    const rows = list.map((m) => `<button class="mail ${m.read ? '' : 'unread'}" data-a="mailOpen" data-id="${m.id}">
        <span class="mail-av">${esc(initials)}</span>
        <span class="mail-body">
          <span class="mail-top"><b class="mail-from">${esc(P.adjName(g))}</b><span class="mail-when">${esc(m.s === g.season ? m.l : String(m.s))}</span></span>
          <span class="mail-subj"><span class="mail-tag ${m.k}">${KIND[m.k].tag}</span>${esc(m.subj)}</span>
          <span class="mail-prev">${esc(m.body)}</span>
          <span class="mail-go">${KIND[m.k].go} ›</span>
        </span></button>`).join('');
    return `<div class="card inbox"><div class="head"><span class="label">Cartas do adjunto${n ? ` <span class="mail-count">${n}</span>` : ''}</span>
        ${n ? '<button class="btn sm ghost" data-a="mailAllRead">Marcar como lidos</button>' : ''}</div>
      <div class="mail-addr muted">De <b>${esc(P.adjMail(g))}</b> para <b>${esc(P.userMail(g))}</b></div>
      ${rows || '<p class="empty" style="padding:8px 0 0">Nenhum e-mail. Propostas, lesões e suspensões chegam aqui.</p>'}
      ${b.list.length > 4 ? `<div style="margin-top:8px"><button class="btn sm ghost" data-a="mailMore">${st.all ? 'Mostrar menos' : `Ver todos (${b.list.length})`}</button></div>` : ''}</div>`;
  };

  Object.assign(A.ACT, {
    mailOpen(d) {
      const g = A.g; prune(g);
      const m = box(g).list.find((x) => x.id === d.id); if (!m) { A.render(); return; }
      m.read = true;
      if (m.k === 'prop') { A.st.mk = Object.assign(A.st.mk || {}, { tab: 'prop' }); A.view = 'mercado'; }
      else A.view = 'tatica';
      A.save(); A.render(); window.scrollTo(0, 0);
    },
    mailAllRead() { box(A.g).list.forEach((m) => { m.read = true; }); A.save(); A.render(); },
    mailMore() { const st = A.st.inbox || (A.st.inbox = {}); st.all = !st.all; A.render(); }
  });
})(window.PFC);
