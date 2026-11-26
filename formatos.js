/* Prancheta FC — Carreira normal (versão 2): formatos reais das ligas, copas e vagas continentais
 * Só dados. Quem executa é o temporada.js.
 *
 * Divisão (nível): size = clubes; t = tipo:
 *   'rr'     turno e returno (rounds: 3 = três turnos)
 *   'grp'    várias chaves no mesmo nível (groups), cada uma em turno e returno
 *   'split'  Coreia: 3 turnos, depois divide em Final A (6 de cima) e Final B (6 de baixo), turno único
 *   'ac'     Apertura e Clausura (zones: 1 ou 2), cada um seguido de mata-mata (lig)
 *   'conf'   conferências (MLS/USL), turno e returno dentro da conferência, depois playoffs
 *   'serieC' Brasil C: turno único, os 8 melhores em 2 quadrangulares (ida e volta)
 *   'serieD' Brasil D: 16 grupos de 6 e mata-mata de ida e volta
 *   'uru'    Uruguai: Apertura, Intermedio (2 grupos + final), Clausura e decisão do título
 *   'nac'    Argentina 2ª: 2 zonas, final entre os líderes e "reducido" pela 2ª vaga
 *   'grp2'   Portugal 3ª: 2 séries de 10, depois fase de subida com os 4 melhores de cada
 * up = sobem direto; down = caem direto; po = mata-mata de acesso { r: [de, até], legs: [por fase], adv: 'seed'|'pens', to: 'rel' }
 * rel = repescagem contra a divisão de baixo [{ pos, vs: posição na de baixo | 'po' }]; playout = { r: [a, b], legs } (perdedor cai)
 * cup = copa nacional: lv = níveis que jogam; two = fases de ida e volta contadas do fim (1 = final, 2 = semi...)
 */
(function (P) {
  const PO = (a, b, legs, extra) => Object.assign({ r: [a, b], legs }, extra || {});
  P.WORLD2 = [
    // ---------------- Europa ----------------
    { c: 'ENG', z: 'eu', rep: 94, lv: [
      { size: 20, down: 3 },
      { size: 24, up: 2, po: PO(3, 6, [2, 1], { neutral: true }), down: 3 },
      { size: 24, up: 2, po: PO(3, 6, [2, 1], { neutral: true }), down: 4 },
      { size: 24, up: 3, po: PO(4, 7, [2, 1], { neutral: true }) }],
      cup: { lv: 4 } },
    { c: 'ESP', z: 'eu', rep: 92, lv: [
      { size: 20, down: 3 },
      { size: 22, up: 2, po: PO(3, 6, [2, 2]), down: 4 },
      { size: 40, t: 'grp', groups: 2, up: 1, po: PO(2, 5, [2, 2], { win: 2 }) }],
      cup: { lv: 3, two: [2] } },
    { c: 'ITA', z: 'eu', rep: 90, lv: [
      { size: 20, down: 3 },
      { size: 20, up: 2, po: PO(3, 8, [1, 2, 2], { adv: 'seed' }), playout: { r: [16, 17], legs: 2 }, down: 3 },
      { size: 60, t: 'grp', groups: 3, up: 1, po: PO(2, 3, [2, 2, 2], { best4: 2 }) }],
      cup: { lv: 2, two: [2] } },
    { c: 'GER', z: 'eu', rep: 90, lv: [
      { size: 18, down: 2, rel: [{ pos: 16, vs: 3 }] },
      { size: 18, up: 2, down: 2, rel: [{ pos: 16, vs: 3 }] },
      { size: 20, up: 2 }],
      cup: { lv: 3 } },
    { c: 'FRA', z: 'eu', rep: 86, lv: [
      { size: 18, down: 2, rel: [{ pos: 16, vs: 'po' }] },
      { size: 18, up: 2, po: PO(3, 5, [1, 1], { adv: 'seed', to: 'rel' }), down: 2, rel: [{ pos: 16, vs: 3 }] },
      { size: 18, up: 2 }],
      cup: { lv: 3 } },
    { c: 'POR', z: 'eu', rep: 82, lv: [
      { size: 18, down: 2, rel: [{ pos: 16, vs: 3 }] },
      { size: 18, up: 2, down: 2, rel: [{ pos: 16, vs: 3 }] },
      { size: 20, t: 'grp2', up: 2 }],
      cup: { lv: 3, two: [2] } },
    { c: 'NED', z: 'eu', rep: 80, lv: [
      { size: 18, down: 2, poUp: 16 },
      { size: 20, up: 2, po: PO(3, 9, [2, 2, 2], { upper: 16 }) }],
      cup: { lv: 2 } },
    { c: 'TUR', z: 'eu', rep: 77, lv: [
      { size: 18, down: 3 },
      { size: 20, up: 2, po: PO(3, 6, [1, 1], { neutral: true }) }],
      cup: { lv: 2 } },
    { c: 'BEL', z: 'eu', rep: 76, lv: [
      { size: 18, down: 2 },
      { size: 16, up: 2 }],
      cup: { lv: 2, two: [2] } },
    // ---------------- América do Sul ----------------
    { c: 'BRA', z: 'sa', rep: 85, lv: [
      { size: 20, down: 4 },
      { size: 20, up: 4, down: 4 },
      { size: 20, t: 'serieC', down: 4 },
      { size: 96, t: 'serieD' }],
      cup: { lv: 3, plus: 4, two: [1, 2, 3, 4] } },
    { c: 'ARG', z: 'sa', rep: 81, lv: [
      { size: 30, t: 'ac', zones: 2, lig: { top: 8, legs: [1, 1, 1, 1] }, relAnnual: 1, relProm: 1 },
      { size: 36, t: 'nac', down: 2 },
      { size: 22, up: 1, po: PO(2, 9, [2, 2, 1], { neutral: true }) }],
      cup: { lv: 2, neutralAll: true } },
    { c: 'URU', z: 'sa', rep: 71, lv: [
      { size: 16, t: 'uru', relProm: 3 },
      { size: 14, up: 2, po: PO(3, 6, [2, 2]) }],
      cup: { lv: 2 } },
    { c: 'CHI', z: 'sa', rep: 70, lv: [
      { size: 16, down: 2 },
      { size: 16, up: 1, po: PO(2, 5, [2, 2]) }],
      cup: { lv: 2 } },
    // ---------------- Concacaf ----------------
    { c: 'MEX', z: 'nc', rep: 76, lv: [
      { size: 18, t: 'ac', zones: 1, lig: { top: 8, legs: [2, 2, 2], adv: 'seed' }, closed: true },
      { size: 16, t: 'ac', zones: 1, lig: { top: 8, legs: [2, 2, 2], adv: 'seed' }, closed: true }] },
    { c: 'USA', z: 'nc', rep: 73, lv: [
      { size: 30, t: 'conf', mls: true, down: 1 },
      { size: 24, t: 'conf', up: 1 }],
      cup: { lv: 2 } },
    // ---------------- Ásia ----------------
    { c: 'JPN', z: 'as', rep: 80, lv: [
      { size: 20, down: 3 },
      { size: 20, up: 2, po: PO(3, 6, [1, 1], { adv: 'seed' }), down: 3 },
      { size: 20, up: 2, po: PO(3, 6, [1, 1], { adv: 'seed' }) }],
      cup: { lv: 3 } },
    { c: 'KOR', z: 'as', rep: 75, lv: [
      { size: 12, t: 'split', down: 1, rel: [{ pos: 11, vs: 2 }, { pos: 10, vs: 'po' }] },
      { size: 16, up: 1, po: PO(3, 5, [1, 1], { adv: 'seed', to: 'rel' }) }],
      cup: { lv: 2 } },
    { c: 'CHN', z: 'as', rep: 72, lv: [
      { size: 16, down: 2 },
      { size: 16, up: 2 }],
      cup: { lv: 2 } }
  ];

  // ---------------- Copas continentais ----------------
  // slots: vagas por país. Número = posição na liga; 'cup' = campeão da copa nacional;
  // 'ap'/'cl' = campeões do Apertura/Clausura; 'a3' = 3º da tabela anual; 'ch' = campeão nacional (Uruguai, MLS Cup);
  // 'sh' = melhor campanha (MLS). Vaga repetida passa para o próximo da liga.
  // guests: clubes convidados de países fora do jogo { país: quantos }
  P.CONT = {
    ucl: { n: 'Liga dos Campeões', short: 'Liga dos Campeões', conf: 'eu', fmt: 'swiss', md: 8, n0: 36, m: 1,
      slots: { ENG: [1, 2, 3, 4], ITA: [1, 2, 3, 4], ESP: [1, 2, 3, 4], GER: [1, 2, 3, 4], FRA: [1, 2, 3], NED: [1, 2], POR: [1, 2], BEL: [1], TUR: [1] },
      guests: { SCO: 1, AUT: 1, SUI: 1, CZE: 1, DEN: 1, GRE: 1, CRO: 1, SRB: 1, UKR: 1, NOR: 1, POL: 1 } },
    uel: { n: 'Liga Europa', short: 'Liga Europa', conf: 'eu', fmt: 'swiss', md: 8, n0: 36, m: 0.45,
      slots: { ENG: [5, 'cup'], ITA: [5, 'cup'], ESP: [5, 'cup'], GER: [5, 'cup'], FRA: [4, 'cup'], NED: [3, 'cup'], POR: ['cup'], BEL: [2, 'cup'], TUR: [2, 'cup'] },
      guests: { SCO: 2, AUT: 2, SUI: 1, CZE: 2, DEN: 1, GRE: 2, CRO: 1, SRB: 1, UKR: 1, NOR: 1, POL: 1, SWE: 1, ISR: 1, HUN: 1, ROU: 1 } },
    uecl: { n: 'Liga Conferência', short: 'Liga Conferência', conf: 'eu', fmt: 'swiss', md: 6, n0: 36, m: 0.25,
      slots: { ENG: [6], ITA: [6], ESP: [6], GER: [6], FRA: [5], NED: [4], POR: [3, 4], BEL: [3], TUR: [3] },
      guests: { SCO: 2, AUT: 1, SUI: 2, CZE: 1, DEN: 2, GRE: 1, CRO: 2, SRB: 1, UKR: 1, NOR: 2, POL: 2, SWE: 2, ISR: 1, HUN: 1, ROU: 1, CYP: 2, BUL: 1, SVN: 1 } },
    lib: { n: 'Copa Libertadores', short: 'Libertadores', conf: 'sa', fmt: 'groups', n0: 32, m: 0.5,
      slots: { BRA: [1, 2, 3, 4, 5, 6, 'cup'], ARG: ['ap', 'cl', 'cup', 'a1', 'a2', 'a3'], URU: ['ch', 'a1', 'a2', 'a3'], CHI: [1, 2, 3, 'cup'] },
      guests: { COL: 3, PAR: 3, ECU: 2, PER: 2, BOL: 1 } },
    sud: { n: 'Copa Sul-Americana', short: 'Sul-Americana', conf: 'sa', fmt: 'groups', n0: 32, m: 0.2,
      slots: { BRA: [7, 8, 9, 10, 11, 12], ARG: ['a4', 'a5', 'a6', 'a7', 'a8', 'a9'], URU: ['a4', 'a5', 'a6', 'a7'], CHI: [4, 5, 6, 7] },
      guests: { COL: 3, PAR: 2, ECU: 2, PER: 2, BOL: 2, VEN: 1 } },
    ccc: { n: 'Copa dos Campeões da Concacaf', short: 'Concacaf', conf: 'nc', fmt: 'ko27', n0: 27, m: 0.25,
      slots: { MEX: ['ap', 'cl', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'], USA: ['ch', 'sh', 'cup', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'] },
      guests: { CAN: 3, CRC: 2, HON: 1, PAN: 1, GUA: 1, JAM: 1 } },
    acle: { n: 'Liga dos Campeões da Ásia', short: 'Campeões da Ásia', conf: 'as', fmt: 'swiss2', md: 8, n0: 24, m: 0.35,
      slots: { JPN: [1, 2, 'cup'], KOR: [1, 2, 'cup'], CHN: [1, 2, 'cup'] },
      guests: { AUS: 1, THA: 1, MAS: 1, KSA: 4, QAT: 3, UAE: 2, IRN: 2, UZB: 1 }, west: ['KSA', 'QAT', 'UAE', 'IRN', 'UZB'] },
    acl2: { n: 'Copa da Ásia', short: 'Copa da Ásia', conf: 'as', fmt: 'groups', n0: 32, m: 0.1,
      slots: { JPN: [3], KOR: [3], CHN: [3] },
      guests: { AUS: 2, THA: 2, MAS: 1, VIE: 2, IDN: 2, SGP: 1, PHI: 1, HKG: 1, TPE: 1, KSA: 2, QAT: 2, UAE: 2, IRN: 2, UZB: 2, IRQ: 2, JOR: 2, BHR: 1, OMA: 1 },
      west: ['KSA', 'QAT', 'UAE', 'IRN', 'UZB', 'IRQ', 'JOR', 'BHR', 'OMA'] }
  };
  // força dos clubes convidados por país (rep do mais forte)
  P.GUEST_REP = { SCO: 78, AUT: 76, SUI: 76, CZE: 75, DEN: 75, GRE: 76, CRO: 75, SRB: 74, UKR: 75, NOR: 72, POL: 71, SWE: 70, ISR: 69, HUN: 69, ROU: 69, CYP: 68, BUL: 66, SVN: 66,
    COL: 74, PAR: 72, ECU: 73, PER: 69, BOL: 66, VEN: 64, CAN: 68, CRC: 67, HON: 63, PAN: 63, GUA: 61, JAM: 60,
    AUS: 68, THA: 64, MAS: 61, KSA: 79, QAT: 72, UAE: 71, IRN: 70, UZB: 67, VIE: 60, IDN: 59, SGP: 56, PHI: 54, HKG: 55, TPE: 52, IRQ: 64, JOR: 61, BHR: 58, OMA: 57 };
  P.CONT_ZONE = { eu: ['ucl', 'uel', 'uecl'], sa: ['lib', 'sud'], nc: ['ccc'], as: ['acle', 'acl2'] };
})(window.PFC);
