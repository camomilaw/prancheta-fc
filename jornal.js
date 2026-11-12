/* Prancheta FC — "Gazeta": manchetes geradas a partir do que aconteceu na carreira.
 * P.headline(g) devolve { kicker, head, dek } para a capa (Início) e para a tela inicial.
 * As frases variam, mas a escolha é fixa para a mesma rodada (não muda a cada clique).
 */
(function (P) {
  const pick = (arr, seed) => arr[Math.abs(seed) % arr.length];
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? v[k] : ''));

  // Último jogo do usuário (qualquer competição)
  function lastMatch(g) {
    for (let w = Math.min(g.week, g.cal.length) - 1; w >= 0; w--) {
      const step = g.cal[w];
      const um = P.userMatch(g, step);
      if (um && um.m.done) return { m: um.m, step, ko: um.ko };
    }
    return null;
  }
  P.lastUserMatch = lastMatch;

  const WIN_BIG = ['{me} atropela o {op}', 'Goleada! {me} faz {gf} a {ga} no {op}', '{me} passeia contra o {op}'];
  const WIN = ['{me} vence o {op}', '{me} bate o {op} por {gf} a {ga}', 'Vitória do {me} sobre o {op}'];
  const WIN_TOP = ['{me} vence e segura a ponta', '{me} bate o {op} e segue líder'];
  const WIN_UP = ['{me} vence e sonha com o acesso', '{me} bate o {op} e mira a subida'];
  const DRAW = ['{me} e {op} ficam no {gf} a {ga}', 'Empate entre {me} e {op}', '{me} só empata com o {op}'];
  const DRAW0 = ['{me} e {op} não saem do zero', 'Jogo amarrado: 0 a 0 com o {op}'];
  const LOSS = ['{me} tropeça diante do {op}', '{me} perde para o {op}', 'Derrota do {me} para o {op}'];
  const LOSS_BIG = ['Noite para esquecer: {me} leva {ga} do {op}', '{op} atropela o {me}'];
  const LOSS_DOWN = ['{me} perde e afunda na tabela', 'Crise: {me} cai diante do {op}'];
  const PEN_W = ['{me} avança nos pênaltis contra o {op}', 'Nos pênaltis, {me} elimina o {op}'];
  const PEN_L = ['{me} cai nos pênaltis diante do {op}', 'Pênaltis eliminam o {me}'];
  const KO_W = ['{me} elimina o {op} e segue vivo', '{me} despacha o {op}'];
  const KO_L = ['{me} dá adeus diante do {op}', '{op} elimina o {me}'];
  const OPEN = ['{me} abre a temporada {season}', 'Começa a era {mgr} no {me}', 'Tudo pronto para a temporada {season} do {me}'];

  P.headline = function (g) {
    const me = P.club(g, g.user);
    const tb = P.table(g, me.div);
    const idx = tb.findIndex((r) => r.cid === g.user);
    const row = tb[idx] || { pts: 0, gp: 0, gc: 0, j: 0 };
    const pos = idx + 1, n = tb.length;
    const v = { me: me.name, mgr: g.manager, season: g.season };
    const seed = g.season * 31 + g.week * 7;
    const kicker = `${me.div}ª divisão · ${g.over ? 'Fim da temporada ' + g.season : P.stepLabel(g.cal[Math.min(g.week, g.cal.length - 1)])}`;
    let head;

    if (g.over && g.hist && g.hist.length) {
      const h = g.hist[g.hist.length - 1];
      head = `${v.me}: ${h.result}`;
    } else {
      const lm = lastMatch(g);
      if (!lm) head = fill(pick(OPEN, seed), v);
      else {
        const m = lm.m, home = m.h === g.user;
        const op = P.club(g, home ? m.a : m.h);
        Object.assign(v, { op: op.name, gf: home ? m.hg : m.ag, ga: home ? m.ag : m.hg });
        let set;
        if (lm.ko && m.pen && v.gf === v.ga) set = m.w === g.user ? PEN_W : PEN_L;
        else if (lm.ko && lm.step.t !== 'lg') set = m.w === g.user ? (v.gf - v.ga >= 3 ? WIN_BIG : KO_W) : KO_L;
        else if (v.gf > v.ga) set = v.gf - v.ga >= 3 ? WIN_BIG : pos === 1 && row.j >= 3 ? WIN_TOP : pos <= P.RULES.playoff[1] && me.div > 1 && row.j >= 5 ? WIN_UP : WIN;
        else if (v.gf === v.ga) set = v.gf === 0 ? DRAW0 : DRAW;
        else set = v.ga - v.gf >= 3 ? LOSS_BIG : pos > n - P.RULES.down && row.j >= 5 ? LOSS_DOWN : LOSS;
        head = fill(pick(set, seed), v);
      }
    }

    // Linha fina: situação na tabela + próximo compromisso
    let dek = `Sob o comando de ${g.manager}, o ${me.name.length > 16 ? me.short : me.name} ${row.j ? `ocupa o ${pos}º lugar da ${me.div}ª divisão, com ${row.pts} ponto${row.pts === 1 ? '' : 's'}` : `estreia na ${me.div}ª divisão`}`;
    const nx = !g.over && P.userMatch(g, g.cal[g.week]);
    if (nx) {
      const home = nx.m.h === g.user, op = P.club(g, home ? nx.m.a : nx.m.h);
      dek += nx.m.neutral ? ` e enfrenta o ${op.name} em campo neutro.` : home ? ` e recebe o ${op.name} na próxima.` : ` e visita o ${op.name} na próxima.`;
    } else dek += '.';
    return { kicker, head, dek, pos, pts: row.pts, sg: row.gp - row.gc, j: row.j };
  };

  // Frase do adjunto sobre o próximo jogo (aparece no quadro "Próximo jogo")
  P.adjQuote = function (g, um) {
    const me = P.club(g, g.user);
    const op = P.club(g, um.m.h === g.user ? um.m.a : um.m.h);
    const ov = P.clubOvrs ? P.clubOvrs(g.db) : null;
    const a = ov ? ov[me.id] : 0, b = ov ? ov[op.id] : 0;
    const d = a - b, seed = g.week + g.season;
    const lines = d >= 4 ? ['Somos favoritos, mas favorito não ganha jogo sozinho.', 'Se jogarmos o nosso, a vitória vem.']
      : d <= -4 ? ['Eles são mais fortes no papel. Precisamos de muita entrega.', 'Jogo para sofrer junto e aproveitar a chance que aparecer.']
      : ['Jogo equilibrado. Detalhe vai decidir.', 'Times parecidos. Quem errar menos leva.'];
    return pick(lines, seed);
  };
})(window.PFC);
