/* Prancheta FC — posições, atributos e banco de dados padrão
 * Os clubes e jogadores são fictícios. Use o Editor no jogo para mudar o que quiser.
 */
(function (P) {
  P.VERSION = 1;

  // ---------- Posições ----------
  P.POS = ['GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'PE', 'ATA'];
  P.POS_NAME = {
    GOL: 'Goleiro', LD: 'Lateral direito', ZAG: 'Zagueiro', LE: 'Lateral esquerdo',
    VOL: 'Volante', MC: 'Meio-campista', MEI: 'Meia ofensivo', PD: 'Ponta direita',
    PE: 'Ponta esquerda', ATA: 'Atacante'
  };
  P.LINE = { GOL: 'GOL', LD: 'DEF', ZAG: 'DEF', LE: 'DEF', VOL: 'MEI', MC: 'MEI', MEI: 'MEI', PD: 'ATA', PE: 'ATA', ATA: 'ATA' };

  // ---------- Atributos (escala 1 a 20, como no FM) ----------
  P.ATTRS = [
    { k: 'fin', n: 'Finalização', g: 'Técnicos' },
    { k: 'pas', n: 'Passe', g: 'Técnicos' },
    { k: 'dri', n: 'Drible', g: 'Técnicos' },
    { k: 'cru', n: 'Cruzamento', g: 'Técnicos' },
    { k: 'cab', n: 'Cabeceio', g: 'Técnicos' },
    { k: 'des', n: 'Desarme', g: 'Técnicos' },
    { k: 'mar', n: 'Marcação', g: 'Técnicos' },
    { k: 'vis', n: 'Visão de jogo', g: 'Mentais' },
    { k: 'dec', n: 'Decisões', g: 'Mentais' },
    { k: 'pos', n: 'Posicionamento', g: 'Mentais' },
    { k: 'com', n: 'Compostura', g: 'Mentais' },
    { k: 'vel', n: 'Velocidade', g: 'Físicos' },
    { k: 'res', n: 'Resistência', g: 'Físicos' },
    { k: 'for', n: 'Força', g: 'Físicos' },
    { k: 'ref', n: 'Reflexos', g: 'Goleiro' },
    { k: 'aer', n: 'Jogo aéreo', g: 'Goleiro' },
    { k: 'um1', n: 'Um contra um', g: 'Goleiro' }
  ];
  P.GK_ATTRS = ['ref', 'aer', 'um1'];
  P.PHYS_ATTRS = ['vel', 'res', 'for'];

  // Perfil de cada posição: bônus/penalidade somado ao nível base ao gerar jogadores
  P.PROFILE = {
    GOL: { ref: 3, aer: 2, um1: 2, pos: 1, com: 1, fin: -7, dri: -5, cru: -6, cab: -4, des: -5, mar: -5, vel: -2, vis: -3 },
    ZAG: { des: 3, mar: 3, cab: 3, pos: 2, for: 2, fin: -4, dri: -3, cru: -3, vis: -2 },
    LD: { vel: 2, cru: 3, des: 1, mar: 1, res: 2, fin: -3, cab: -1 },
    LE: { vel: 2, cru: 3, des: 1, mar: 1, res: 2, fin: -3, cab: -1 },
    VOL: { des: 3, mar: 2, pas: 1, pos: 2, res: 2, fin: -3, dri: -1, cru: -2 },
    MC: { pas: 3, vis: 2, dec: 2, res: 1, fin: -1, cab: -1 },
    MEI: { pas: 2, vis: 3, dri: 2, com: 1, des: -3, mar: -3, cab: -1 },
    PD: { vel: 3, dri: 3, cru: 2, des: -3, mar: -3, cab: -2 },
    PE: { vel: 3, dri: 3, cru: 2, des: -3, mar: -3, cab: -2 },
    ATA: { fin: 4, cab: 2, com: 2, for: 1, des: -4, mar: -4, cru: -2, pas: -1 }
  };

  // ---------- Nomes ----------
  const FIRST = ['Lucas', 'Gabriel', 'Mateus', 'Rafael', 'Felipe', 'Gustavo', 'Bruno', 'Thiago', 'Vinícius', 'Pedro',
    'João', 'Caio', 'Diego', 'Rodrigo', 'Leandro', 'Marcelo', 'André', 'Fábio', 'Renan', 'Igor',
    'Danilo', 'Wesley', 'Everton', 'Matheus', 'Henrique', 'Luan', 'Murilo', 'Arthur', 'Davi', 'Samuel',
    'Kaio', 'Yuri', 'Alisson', 'Douglas', 'Jefferson', 'Anderson', 'Cristian', 'Ramon', 'Patrick', 'Wellington',
    'Eduardo', 'Otávio', 'Vitor', 'Ítalo', 'Breno', 'Cauã', 'Enzo', 'Heitor', 'Nathan', 'Luiz',
    'Fernando', 'Sérgio', 'Ronaldo', 'Robson', 'Willian', 'Emerson', 'Juliano', 'Márcio', 'Paulo', 'Tiago'];
  const LAST = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida',
    'Nascimento', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Ribeiro', 'Barbosa', 'Rocha', 'Dias', 'Moreira',
    'Cardoso', 'Teixeira', 'Correia', 'Mendes', 'Freitas', 'Pinto', 'Vieira', 'Cavalcanti', 'Monteiro', 'Moura',
    'Batista', 'Campos', 'Nunes', 'Ramos', 'Machado', 'Farias', 'Brito', 'Lopes', 'Sales', 'Bezerra',
    'Peixoto', 'Andrade', 'Queiroz', 'Xavier', 'Siqueira', 'Tavares', 'Fonseca', 'Prado', 'Leite', 'Duarte'];
  const NICK = ['Juninho', 'Zé Carlos', 'Tinga', 'Pituca', 'Bigode', 'Neto', 'Dudu', 'Biro', 'Gegê', 'Toninho',
    'Didi', 'Pelezinho', 'Nenê', 'Fumaça', 'Baiano', 'Paraíba', 'Carioca', 'Mineirinho', 'Kiko', 'Tuta',
    'Cacau', 'Lelê', 'Marquinhos', 'Rafinha', 'Robinho', 'Diguinho', 'Fabinho', 'Serginho', 'Paulinho', 'Léo Moura',
    'Bolívia', 'Gaúcho', 'Branco', 'Magrão', 'Pipoca'];

  // ---------- Clubes fictícios (liga de 20) ----------
  P.DEFAULT_CLUBS = [
    { short: 'PAU', name: 'Paulistano FC', city: 'São Paulo', stadium: 'Estádio do Ipiranga', colors: ['#1d3a8a', '#ffffff'], rep: 86 },
    { short: 'CAR', name: 'Carioca Atlético', city: 'Rio de Janeiro', stadium: 'Arena da Lagoa', colors: ['#c8102e', '#111111'], rep: 87 },
    { short: 'MIN', name: 'Mineiro EC', city: 'Belo Horizonte', stadium: 'Estádio da Serra', colors: ['#0b4ea2', '#ffffff'], rep: 82 },
    { short: 'UGA', name: 'União Gaúcha', city: 'Porto Alegre', stadium: 'Arena do Guaíba', colors: ['#0a6ab3', '#111111'], rep: 81 },
    { short: 'GUA', name: 'Guanabara FC', city: 'Rio de Janeiro', stadium: 'Estádio da Baía', colors: ['#00704a', '#ffffff'], rep: 78 },
    { short: 'PRA', name: 'Praiano FC', city: 'Santos', stadium: 'Vila do Mar', colors: ['#ffffff', '#111111'], rep: 76 },
    { short: 'ARA', name: 'Araucária FC', city: 'Curitiba', stadium: 'Estádio dos Pinheirais', colors: ['#b5121b', '#111111'], rep: 74 },
    { short: 'BAN', name: 'Bandeirantes AC', city: 'Campinas', stadium: 'Estádio do Café', colors: ['#d71920', '#ffffff'], rep: 72 },
    { short: 'BTS', name: 'Baía de Todos FC', city: 'Salvador', stadium: 'Arena do Farol', colors: ['#1e4fa0', '#d71920'], rep: 71 },
    { short: 'SER', name: 'Sertão EC', city: 'Fortaleza', stadium: 'Estádio do Sol', colors: ['#c1121f', '#1d3a8a'], rep: 70 },
    { short: 'MAR', name: 'Maré Alta SC', city: 'Recife', stadium: 'Arena dos Arrecifes', colors: ['#e30613', '#ffd200'], rep: 69 },
    { short: 'PAM', name: 'Pampa EC', city: 'Pelotas', stadium: 'Estádio da Coxilha', colors: ['#7a1f2b', '#f2e6c9'], rep: 67 },
    { short: 'CER', name: 'Cerrado AC', city: 'Goiânia', stadium: 'Estádio do Ipê', colors: ['#2e7d32', '#111111'], rep: 66 },
    { short: 'CAP', name: 'Capital FC', city: 'Brasília', stadium: 'Arena do Planalto', colors: ['#f5a300', '#0b3d91'], rep: 65 },
    { short: 'ILH', name: 'Ilha da Magia EC', city: 'Florianópolis', stadium: 'Estádio da Lagoinha', colors: ['#00a3e0', '#ffffff'], rep: 64 },
    { short: 'SGA', name: 'Serra Gaúcha AC', city: 'Caxias do Sul', stadium: 'Estádio das Videiras', colors: ['#6a1b9a', '#ffffff'], rep: 63 },
    { short: 'VAL', name: 'Vale do Paraíba FC', city: 'São José dos Campos', stadium: 'Estádio do Vale', colors: ['#00897b', '#ffd200'], rep: 62 },
    { short: 'MOG', name: 'Mogiana FC', city: 'Ribeirão Preto', stadium: 'Estádio da Mogiana', colors: ['#111111', '#e30613'], rep: 62 },
    { short: 'TRI', name: 'Triângulo EC', city: 'Uberlândia', stadium: 'Arena do Triângulo', colors: ['#00843d', '#ffd200'], rep: 61 },
    { short: 'AMA', name: 'Amazonas Clube', city: 'Manaus', stadium: 'Arena do Encontro das Águas', colors: ['#ffcc00', '#006837'], rep: 60 }
  ];

  // Elenco padrão de 26 jogadores
  P.SQUAD_TEMPLATE = { GOL: 3, LD: 2, ZAG: 4, LE: 2, VOL: 3, MC: 3, MEI: 2, PD: 2, PE: 2, ATA: 3 };

  P.levelFromRep = (rep) => 5 + rep * 0.11; // rep 60 → 11.6 | rep 87 → 14.6

  function pickAge(r) {
    const x = r();
    if (x < 0.12) return 17 + Math.floor(r() * 3);   // 17-19
    if (x < 0.35) return 20 + Math.floor(r() * 4);   // 20-23
    if (x < 0.80) return 24 + Math.floor(r() * 7);   // 24-30
    return 31 + Math.floor(r() * 5);                 // 31-35
  }
  function ageEffect(age) {
    if (age <= 19) return -2.5;
    if (age <= 21) return -1.5;
    if (age <= 23) return -0.6;
    if (age <= 30) return 0;
    if (age <= 32) return -0.3;
    return -1;
  }

  P.makeName = function (r, used) {
    for (let i = 0; i < 50; i++) {
      const x = r();
      let n;
      if (x < 0.55) n = P.pick(r, FIRST) + ' ' + P.pick(r, LAST);
      else if (x < 0.8) n = P.pick(r, FIRST);
      else n = P.pick(r, NICK);
      if (!used || !used.has(n)) { if (used) used.add(n); return n; }
    }
    const n = P.pick(r, FIRST) + ' ' + P.pick(r, LAST) + ' ' + P.pick(r, LAST);
    if (used) used.add(n);
    return n;
  };

  P.blankStats = () => ({ j: 0, g: 0, as: 0, ca: 0, cv: 0, nt: 0 });

  // Cria um jogador. level = média de atributos esperada (1-20)
  P.makePlayer = function (r, opts) {
    const pos = opts.pos;
    const age = opts.age || pickAge(r);
    const q = opts.level + P.gauss(r) * 1.4 + ageEffect(age);
    const prof = P.PROFILE[pos] || {};
    const a = {};
    for (const at of P.ATTRS) {
      const k = at.k;
      let v;
      if (P.GK_ATTRS.includes(k) && pos !== 'GOL') v = 1 + Math.floor(r() * 4);
      else v = q + (prof[k] || 0) + P.gauss(r) * 1.6;
      if (age >= 31 && (k === 'vel' || k === 'res')) v -= (age - 30) * 0.6;
      a[k] = P.clamp(Math.round(v), 1, 20);
    }
    // potencial: quanto o jogador ainda pode evoluir (escondido, usado na virada de temporada)
    const pot = P.clamp(Math.round((q + (age < 24 ? (24 - age) * 0.45 + Math.abs(P.gauss(r)) * 1.2 : 0)) * 10) / 10, 1, 20);
    return {
      id: opts.id || P.uid('p'),
      name: opts.name || P.makeName(r, opts.used),
      age, pos, clubId: opts.clubId || null, a, pot,
      cond: 100, mor: 70, inj: 0, susp: 0, ylw: 0,
      s: P.blankStats()
    };
  };

  // Gera o banco de dados completo (clubes + jogadores)
  P.generateDatabase = function (seed) {
    const r = P.rng(seed || 2027);
    const used = new Set();
    const db = { version: P.VERSION, clubs: [], players: {} };
    let pc = 1;
    P.DEFAULT_CLUBS.forEach((c, i) => {
      const club = Object.assign({ id: 'c' + (i + 1) }, P.clone(c));
      db.clubs.push(club);
      const level = P.levelFromRep(club.rep);
      for (const pos of Object.keys(P.SQUAD_TEMPLATE)) {
        for (let n = 0; n < P.SQUAD_TEMPLATE[pos]; n++) {
          const p = P.makePlayer(r, { pos, level, clubId: club.id, used, id: 'p' + (pc++) });
          db.players[p.id] = p;
        }
      }
    });
    return db;
  };
})(window.PFC);
