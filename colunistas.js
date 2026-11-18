/* Prancheta FC — colunistas da Gazeta
 * Personagens caricatos que dão uma opinião por rodada sobre o seu time.
 * Aparecem na capa (matéria da última carreira) e no Início › Notícias.
 * Para trocar nomes ou frases, é só editar a lista COLUNISTAS abaixo.
 * Nas frases: {clube} {tecnico} {adv} {placar} {proximo} {craque} {pos} {ESTADIO_ADV}
 * Listas: vitoria, empate, derrota, semjogo (início de temporada), jogo (após qualquer partida),
 * todas (sempre), foraVitoria (vitória fora de casa), rivalSemVitoria (empate/derrota contra rival).
 */
(function (P) {
  const esc = P.esc;
  const COLUNISTAS = [
    {
      nome: 'Maurício Soraivo', apelido: 'o engenheiro de obra pronta',
      vitoria: ['Eu avisei na terça: {placar} era o placar mais óbvio do mundo. Só não escrevi porque ninguém pediu.', 'Vitória sobre o {adv}? Previsível. Desde a pré-temporada eu sabia que {tecnico} ia acertar a escalação justamente nesse jogo.'],
      empate: ['Empate. Exatamente como eu imaginei, mas preferi não dizer para não secar.', 'Qualquer um via que esse jogo ia terminar {placar}. Qualquer um que entendesse de futebol, claro.'],
      derrota: ['Estava na cara. Era só olhar o aquecimento: ali eu já sabia que o {adv} ia ganhar.', 'Eu teria mexido no time aos 12 do primeiro tempo. Agora é fácil falar, mas eu teria.'],
      semjogo: ['Ainda não começou, mas já sei como vai terminar. Conto depois.']
    },
    {
      nome: 'Pazinha', apelido: 'o filósofo da arquibancada',
      // "todas" vale para qualquer resultado
      todas: ['O futebol é como a lasanha: as camadas importam, mas é o queijo que gruda.', 'O {clube} não tem esse jogador.', 'Restaurante que vende farofa não tem ventilador de teto.', 'É aquilo, depois das 4 da manhã, se for mulher é melhor.'],
      vitoria: ['Ganhar do {adv} é como achar o controle remoto no sofá: ninguém sabe como, mas todos celebram.'],
      empate: ['O empate é o pão de forma do futebol: alimenta, mas ninguém tira foto.', '{placar}. Às vezes a bola não entra porque ela também tem seus dias, e quem somos nós para julgar a bola?'],
      derrota: ['O {clube} vem numa fase tão ruim que se comprar um circo, o anão cresce.', 'Perder é como o vento: não se vê, mas despenteia. Hoje o {clube} saiu despenteado.'],
      semjogo: ['Toda temporada começa com um apito. E todo apito começa com um sopro. Pensem nisso.']
    },
    {
      nome: 'Pedernesto', apelido: 'o pessimista de plantão',
      jogo: ['Nas circunstâncias que está, é mais fácil ganhar a Supercopa Ultra do que escapar do rebaixamento.'],
      vitoria: ['Venceu, sim. Mas e o próximo? O {proximo} vai ser outra história, anotem.', 'Ganhou do {adv}, mas eu vi o time cansado no fim. Vem lesão por aí.'],
      empate: ['Empatar com o {adv} é o começo do fim. Lembrem que eu avisei.', 'Um ponto. Só um. Daqui a pouco é zero.'],
      derrota: ['Não quero ser alarmista, mas acho que o {clube} cai. Talvez duas divisões.', 'Eu já arrumei a mala do {tecnico}. Só por precaução.'],
      semjogo: ['Pré-temporada animada demais. Desconfio.']
    },
    {
      nome: 'Repórter Varginha', apelido: 'o torcedor com microfone',
      todas: ['O {clube} vai ser campeão uma hora ou outra.'],
      foraVitoria: ['CALAMOS O {ESTADIO_ADV}!'],
      rivalSemVitoria: ['Não vou responder a arrogância tricolor.'],
      vitoria: ['MAIOR VITÓRIA DA HISTÓRIA DO FUTEBOL MUNDIAL! {placar}! Liguem para a seleção e mandem convocar o time inteiro!', '{craque} é melhor que qualquer jogador que já existiu. E eu já vi muitos. Uns três.'],
      empate: ['Empate com sabor de título! Moralmente, ganhamos de goleada.', 'Foi {placar}, mas se o juiz fosse justo era 5 a 0 pra gente!'],
      derrota: ['ROUBADO! Não vi o lance, mas foi roubado!', 'Derrota? Eu chamo de vitória adiada. O {proximo} que se prepare.'],
      semjogo: ['Este ano é NOSSO! Ano passado também era, mas este é MAIS!']
    },
    {
      nome: 'Marcos Bertãocelo', apelido: 'o homem dos números',
      vitoria: ['Dado curioso: o {clube} nunca perdeu uma partida que venceu. Os números não mentem.', 'Quando {craque} toca na bola mais de 30 vezes e o jogo cai numa quarta de lua minguante, o {clube} vence 87% das vezes.'],
      empate: ['Estatisticamente, um empate é metade de uma vitória e metade de uma derrota. Ou seja: nada a declarar.', 'Desde a rodada 1, o {clube} tem 100% de aproveitamento em jogos que terminam empatados.'],
      derrota: ['Os números indicam que o {clube} perdeu. Mais que isso eu não posso afirmar sem uma planilha maior.', 'Times que ocupam o {pos} lugar costumam estar no {pos} lugar. Fiquem atentos.'],
      semjogo: ['Calculei as chances do {clube} nesta temporada: entre 0 e 100%. Mantenho a previsão.']
    }
  ];
  P.COLUNISTAS = COLUNISTAS;

  // Uma coluna por rodada (a mesma até o próximo jogo)
  P.columnHTML = function (x, ctx) {
    if (!x) return '';
    const L = x.last;
    const kind = !L ? 'semjogo' : (L.ko && L.pen ? (L.won ? 'vitoria' : 'derrota') : L.gf > L.ga ? 'vitoria' : L.gf < L.ga ? 'derrota' : 'empate');
    const seed = (ctx.season || 0) * 53 + (ctx.week || 0) * 11;
    const c = COLUNISTAS[seed % COLUNISTAS.length];
    let lines = (c[kind] || c.semjogo || []).concat(c.todas || []);
    if (kind !== 'semjogo') lines = lines.concat(c.jogo || []);
    if (L && kind === 'vitoria' && !L.home && !L.neutral && c.foraVitoria) lines = c.foraVitoria.concat(c.foraVitoria, lines); // pesa mais quando cabe
    if (L && L.derby >= 1 && kind !== 'vitoria' && c.rivalSemVitoria) lines = c.rivalSemVitoria.concat(c.rivalSemVitoria, lines);
    const v = {
      clube: ctx.club, tecnico: ctx.mgr, adv: L ? L.op : 'adversário', placar: L ? `${L.gf} a ${L.ga}` : '0 a 0',
      proximo: x.next ? x.next.op : 'próximo adversário', craque: (x.top && x.top.n) || (x.star && x.star.n) || 'o camisa 10', pos: x.pos ? x.pos + 'º' : 'mesmo', ESTADIO_ADV: L && L.opStad ? L.opStad.toUpperCase() : (L ? L.op.toUpperCase() : '')
    };
    const txt = lines[(seed >> 1) % lines.length].replace(/\{(\w+)\}/g, (_, k) => (v[k] != null ? v[k] : ''));
    const ini = c.nome.split(' ').filter((w) => !/^(Prof|Repórter)/.test(w)).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    return `<aside class="col-box"><div class="col-h"><span class="col-ini">${esc(ini)}</span><div><b>${esc(c.nome)}</b><small>${esc(c.apelido)}</small></div><span class="col-tag">Opinião</span></div>
      <p class="col-q">“${esc(txt)}”</p></aside>`;
  };
  // Para o Início (dentro do jogo)
  P.columnFor = function (g) {
    if (!P.frontExtra) return '';
    try { const x = P.frontExtra(g), c = P.club(g, g.user); return P.columnHTML(x, { season: g.season, week: g.week, club: c.name, mgr: g.manager }); } catch (e) { return ''; }
  };
})(window.PFC);
