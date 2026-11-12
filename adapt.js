/* Prancheta FC — adaptação de estrangeiros
 * Quem chega de um país diferente do país do clube precisa se adaptar em duas frentes:
 *  - Idioma: só se a língua do país dele for outra. Jovens aprendem bem mais rápido.
 *  - Cultura: longe de casa. Outro continente pesa mais. Os experientes se acostumam mais rápido.
 * Ajudam: companheiros do mesmo país (profissional ou Sub-20), companheiros que falam a língua dele
 * e membros da comissão técnica do mesmo país ou da mesma língua.
 * Enquanto não se adapta, o jogador evolui menos nos treinos e a moral cai um pouco.
 * Só vale para o seu clube (profissional e Sub-20). Quem já estava no elenco quando o sistema
 * chegou na carreira conta como adaptado.
 */
(function (P) {
  const A = P.app, esc = P.esc;

  const LANG_N = { pt: 'português', es: 'espanhol', en: 'inglês', fr: 'francês', nl: 'holandês', de: 'alemão', it: 'italiano', tr: 'turco', gr: 'grego', sl: 'língua do leste europeu', sc: 'língua escandinava', af: 'língua africana', ar: 'árabe', jp: 'japonês', kr: 'coreano', cn: 'chinês' };
  P.LANG_N = LANG_N;
  const langOf = (c) => (P.COUNTRIES[c] ? P.COUNTRIES[c].lang : null);
  const contOf = (c) => { if (!P.CONTINENTS) return null; for (const [k, v] of Object.entries(P.CONTINENTS)) if (v.c.includes(c)) return k; return null; };

  const clubCountry = (g) => { const c = P.club(g, g.user); return c ? c.country : null; };
  const allMine = (g) => P.squad(g, g.user).concat(g.y && g.y.squad ? Object.values(g.y.squad) : []);

  // O que este jogador precisa vencer no clube atual
  function needs(g, p) {
    const cc = clubCountry(g);
    if (!cc || !p.nat || p.nat === cc) return null;
    const lang = langOf(p.nat) !== langOf(cc);
    const far = contOf(p.nat) !== contOf(cc);
    return { lang, far };
  }
  // Valor 0-100 da adaptação (100 = em casa)
  P.adLevel = function (g, p) {
    if (!p.ad) return 100;
    const n = needs(g, p); if (!n) return 100;
    return Math.round(((n.lang ? p.ad.l : 100) + p.ad.c) / 2);
  };
  // Fator de evolução: 0,5 (perdido) a 1 (adaptado)
  P.adF = function (g, p) {
    if (!g || !p || !p.ad) return 1;
    const lv = P.adLevel(g, p);
    return lv >= 100 ? 1 : 0.5 + 0.5 * lv / 100;
  };

  // Primeira vez: todo mundo que já está no clube conta como adaptado
  P.ensureAdapt = function (g) {
    if (!g || !g.user) return;
    const seen = g.adSeen || (g.adSeen = {});
    const first = !g.adInit || g.adClub !== g.user;
    for (const p of allMine(g)) {
      if (seen[p.id] === g.user) continue;
      seen[p.id] = g.user;
      const n = needs(g, p);
      if (!n || first) { delete p.ad; continue; }
      // chegou agora: começa do zero no idioma; na cultura, mais perto de casa = mais fácil
      p.ad = { l: n.lang ? 10 : 100, c: n.far ? 20 : 55, w: 0, warned: false };
    }
    g.adInit = true; g.adClub = g.user;
    // limpa quem saiu do clube
    for (const id of Object.keys(seen)) if (seen[id] === g.user && !g.db.players[id] && !(g.y && g.y.squad[id])) delete seen[id];
  };

  // Quem ajuda este jogador (para a semana e para a ficha)
  function helpers(g, p) {
    const lang = langOf(p.nat);
    const mates = allMine(g).filter((x) => x.id !== p.id);
    const comp = mates.filter((x) => x.nat === p.nat);
    const speak = mates.filter((x) => x.nat !== p.nat && langOf(x.nat) === lang);
    const staff = (g.y && g.y.staff) || [];
    const stComp = staff.filter((s) => s.nat === p.nat);
    const stLang = staff.filter((s) => s.nat !== p.nat && langOf(s.nat) === lang);
    return { comp, speak, stComp, stLang };
  }

  P.adaptWeek = function (g) {
    P.ensureAdapt(g);
    const done = [], struggling = [];
    for (const p of allMine(g)) {
      if (!p.ad) continue;
      const n = needs(g, p);
      if (!n) { delete p.ad; continue; }
      const h = helpers(g, p);
      const young = p.age <= 18 ? 1.6 : p.age <= 21 ? 1.3 : p.age <= 25 ? 1 : p.age <= 29 ? 0.75 : 0.55;
      const exp = P.xp ? 0.6 + P.xp(p) * 0.045 : (p.age <= 18 ? 0.6 : p.age <= 21 ? 0.8 : p.age <= 25 ? 1 : p.age <= 29 ? 1.25 : 1.45);
      const helpL = 1 + Math.min(0.5, 0.3 * h.comp.length + 0.12 * h.speak.length + 0.25 * (h.stComp.length + h.stLang.length));
      const helpC = 1 + Math.min(0.7, 0.35 * h.comp.length + 0.3 * h.stComp.length + 0.1 * h.stLang.length);
      const before = P.adLevel(g, p);
      if (n.lang) p.ad.l = Math.min(100, p.ad.l + 4 * young * helpL);
      p.ad.c = Math.min(100, p.ad.c + (n.far ? 3 : 5) * exp * helpC);
      p.ad.w++;
      const lv = P.adLevel(g, p);
      if (lv < 40 && p.mor != null) p.mor = Math.max(45, p.mor - 1);
      if (!p.ad.warned && p.ad.w >= 5 && lv < 55) { p.ad.warned = true; struggling.push(p); }
      if (before < 100 && lv >= 100) { done.push(p.name); delete p.ad; }
    }
    if (done.length) P.news(g, `${done.join(', ')} já ${done.length === 1 ? 'se sente' : 'se sentem'} em casa: adaptação completa.`, 'good');
    for (const p of struggling) {
      const n = needs(g, p), cc = clubCountry(g);
      const why = [n.lang ? `ainda não se entende bem em ${LANG_N[langOf(cc)] || 'na língua daqui'}` : '', `sente falta de ${P.countryName(p.nat)}`].filter(Boolean).join(' e ');
      const tip = p.age <= 21 ? 'Ele é novo e aprende a língua rápido, mas sente muito a distância de casa.' : p.age >= 27 ? 'Ele tem experiência e se acostuma com o lugar, mas a língua demora.' : '';
      const body = `Chefe, o ${p.name} não está conseguindo evoluir direito: ${why}. ${tip} Ajudaria ter no elenco alguém de ${P.countryName(p.nat)}, ou contratar alguém da comissão (fisioterapeuta, preparador, auxiliar…) do país dele ou que fale ${LANG_N[langOf(p.nat)] || 'a língua dele'}.`;
      P.news(g, `${p.name} sofre para se adaptar e não evolui como deveria.`, 'warn');
      if (P.mail) P.mail(g, { k: 'adp', pid: p.id, subj: `${p.name} não está se adaptando`, body });
    }
  };

  // Chamado toda semana junto com o treino
  const orig = P.trainWeek;
  P.trainWeek = function (g, step) {
    P.adaptWeek(g);
    if (orig) orig(g, step);
  };

  // ---------- Telas ----------
  P.adaptChip = function (p) {
    const g = A.g; if (!g || !p.ad) return '';
    const lv = P.adLevel(g, p);
    return lv < 100 ? `<span class="chip sus" title="Adaptação ${lv}%">Adaptando ${lv}%</span>` : '';
  };
  // Quantos jogadores do seu clube este funcionário ajudaria
  P.adaptStaffHint = function (g, s) {
    if (!g) return '';
    const lang = langOf(s.nat);
    const who = allMine(g).filter((p) => p.ad && P.adLevel(g, p) < 100 && (p.nat === s.nat || langOf(p.nat) === lang));
    return who.length ? `<div class="ad-hint">Ajudaria na adaptação de ${esc(who.slice(0, 3).map((p) => p.name).join(', '))}${who.length > 3 ? ` e mais ${who.length - 3}` : ''}</div>` : '';
  };
  P.adaptBlock = function (g, p) {
    if (!g) return '';
    const mine = p.clubId === g.user || (g.y && g.y.squad[p.id]);
    if (!mine) {
      // jogador de fora: aviso antes de contratar
      const n = needs(g, p);
      if (!n) return '';
      return `<div class="ad-box"><span class="label">Adaptação</span><p>Vindo de ${esc(P.countryName(p.nat))}, ${n.lang ? `precisaria aprender ${esc(LANG_N[langOf(clubCountry(g))] || 'a língua daqui')} e ` : ''}se acostumar ${n.far ? 'a outro continente' : 'a outro país'}. ${p.age <= 21 ? 'Jovem: aprende a língua rápido, sente mais a distância.' : p.age >= 27 ? 'Experiente: se acostuma rápido ao lugar, a língua demora.' : ''}</p></div>`;
    }
    if (!p.ad) return '';
    const n = needs(g, p); if (!n) return '';
    const h = helpers(g, p), lv = P.adLevel(g, p);
    const bar = (lbl, v) => `<div class="bar"><span>${lbl}</span><span class="tr"><i style="width:${Math.round(v)}%"></i></span><b class="num">${Math.round(v)}</b></div>`;
    const help = [
      h.comp.length ? `${h.comp.length} ${h.comp.length === 1 ? 'compatriota' : 'compatriotas'} no clube` : '',
      h.speak.length ? `${h.speak.length} ${h.speak.length === 1 ? 'companheiro fala' : 'companheiros falam'} ${LANG_N[langOf(p.nat)] || 'a língua dele'}` : '',
      h.stComp.length + h.stLang.length ? `${h.stComp.length + h.stLang.length} da comissão técnica ${h.stComp.length ? 'do país dele' : 'fala a língua dele'}` : ''
    ].filter(Boolean);
    return `<div class="ad-box"><div class="row"><span class="label" style="flex:1">Adaptação · ${lv}%</span><span class="muted" style="font-size:.8rem">evolui ${Math.round(P.adF(g, p) * 100)}% do normal</span></div>
      ${n.lang ? bar(`Idioma (${esc(LANG_N[langOf(clubCountry(g))] || '')})`, p.ad.l) : ''}
      ${bar(n.far ? 'Cultura (outro continente)' : 'Cultura', p.ad.c)}
      <p>${help.length ? 'Ajudam: ' + esc(help.join(' · ')) + '.' : `Ninguém de ${esc(P.countryName(p.nat))} por perto. Um compatriota no elenco ou na comissão técnica acelera bastante.`} ${p.age <= 21 ? 'Jovem: aprende a língua rápido.' : p.age >= 27 ? 'Experiente: se acostuma rápido ao lugar.' : ''}</p></div>`;
  };

  if (A) (A.onLoad = A.onLoad || []).push((g) => P.ensureAdapt(g));
})(window.PFC);
