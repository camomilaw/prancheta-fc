/* Prancheta FC — posições, atributos, países e banco de dados padrão (Ultraliga)
 * 160 clubes fictícios de 17 países em 8 divisões de 20.
 * Os nomes reais ficam num "patch" separado, importado pelo jogo.
 */
(function (P) {
  P.VERSION = 2;
  P.DIVS = 8;
  P.DIV_SIZE = 20;

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

  // ---------- Países ----------
  P.COUNTRIES = {
    BRA: { n: 'Brasil', lang: 'pt' }, ARG: { n: 'Argentina', lang: 'es' }, URU: { n: 'Uruguai', lang: 'es' },
    COL: { n: 'Colômbia', lang: 'es' }, MEX: { n: 'México', lang: 'es' }, USA: { n: 'Estados Unidos', lang: 'en' },
    ENG: { n: 'Inglaterra', lang: 'en' }, SCO: { n: 'Escócia', lang: 'en' }, ESP: { n: 'Espanha', lang: 'es' },
    POR: { n: 'Portugal', lang: 'pt' }, FRA: { n: 'França', lang: 'fr' }, BEL: { n: 'Bélgica', lang: 'nl' },
    NED: { n: 'Holanda', lang: 'nl' }, GER: { n: 'Alemanha', lang: 'de' }, ITA: { n: 'Itália', lang: 'it' },
    TUR: { n: 'Turquia', lang: 'tr' }, GRE: { n: 'Grécia', lang: 'gr' }
  };
  P.countryName = (c) => (P.COUNTRIES[c] ? P.COUNTRIES[c].n : c || '—');

  // País de cada uma das 160 vagas (da mais forte para a mais fraca)
  const SLOT_COUNTRIES = ('ESP ENG GER ENG ENG ESP FRA ITA ENG GER ESP ITA GER ITA ITA ENG ENG ENG POR POR ' +
    'POR ENG ITA GER ITA ITA ESP ESP ESP FRA FRA FRA NED NED NED ENG GER GER BRA BRA ' +
    'BRA ARG ARG BRA BRA BRA BRA BRA BRA TUR TUR SCO BEL ITA ITA FRA FRA FRA ESP ESP ' +
    'ESP ESP GER GER GER GER GER ENG ENG ENG ENG ENG ENG ENG ITA ITA SCO TUR POR BRA ' +
    'BRA BRA BRA BRA BRA ARG ARG ARG ARG ARG MEX MEX MEX MEX MEX URU URU GRE GRE BEL ' +
    'BEL BEL NED NED NED GER GER GER FRA FRA FRA FRA ESP ESP ESP ESP ESP ITA ITA ITA ' +
    'ENG ENG ENG ENG ENG ENG ENG ENG GER GER GER GER ESP ESP POR TUR SCO SCO USA USA ' +
    'USA USA COL COL COL URU ARG ARG ARG MEX MEX MEX BRA BRA BRA BRA BRA BRA BRA BRA').split(' ');

  // ---------- Nomes de jogadores por idioma ----------
  const NAMES = {
    pt: {
      f: ['Lucas', 'Gabriel', 'Mateus', 'Rafael', 'Felipe', 'Gustavo', 'Bruno', 'Thiago', 'Vinícius', 'Pedro', 'João', 'Caio', 'Diego', 'Rodrigo', 'Leandro', 'Marcelo', 'André', 'Fábio', 'Renan', 'Igor', 'Danilo', 'Wesley', 'Everton', 'Henrique', 'Luan', 'Murilo', 'Arthur', 'Davi', 'Samuel', 'Kaio', 'Yuri', 'Douglas', 'Ramon', 'Eduardo', 'Otávio', 'Vitor', 'Ítalo', 'Breno', 'Enzo', 'Heitor', 'Nuno', 'Tiago', 'Rúben', 'Diogo', 'Gonçalo', 'Tomás', 'Rui', 'Hugo'],
      l: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Gomes', 'Martins', 'Araújo', 'Ribeiro', 'Barbosa', 'Rocha', 'Dias', 'Moreira', 'Cardoso', 'Teixeira', 'Mendes', 'Freitas', 'Pinto', 'Vieira', 'Monteiro', 'Moura', 'Batista', 'Campos', 'Nunes', 'Ramos', 'Machado', 'Farias', 'Brito', 'Lopes', 'Sales', 'Peixoto', 'Andrade', 'Tavares', 'Fonseca', 'Prado', 'Leite', 'Duarte', 'Sequeira', 'Matos'],
      nick: ['Juninho', 'Tinga', 'Bigode', 'Neto', 'Dudu', 'Gegê', 'Toninho', 'Didi', 'Nenê', 'Baiano', 'Kiko', 'Tuta', 'Cacau', 'Marquinhos', 'Rafinha', 'Fabinho', 'Serginho', 'Paulinho', 'Magrão', 'Pipoca', 'Zé Rafael', 'Lelê', 'Biro']
    },
    es: {
      f: ['Santiago', 'Mateo', 'Diego', 'Javier', 'Alejandro', 'Pablo', 'Sergio', 'Álvaro', 'Iker', 'Hugo', 'Martín', 'Nicolás', 'Facundo', 'Lautaro', 'Gonzalo', 'Joaquín', 'Rodrigo', 'Emiliano', 'Agustín', 'Tomás', 'Juan', 'Carlos', 'Andrés', 'Felipe', 'Sebastián', 'Raúl', 'Óscar', 'Marcos', 'Iván', 'Bruno', 'Thiago', 'Franco', 'Valentín', 'Héctor', 'Luis', 'Jorge'],
      l: ['García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Díaz', 'Álvarez', 'Romero', 'Ruiz', 'Torres', 'Navarro', 'Ramírez', 'Morales', 'Ortiz', 'Castro', 'Vargas', 'Herrera', 'Medina', 'Aguirre', 'Rojas', 'Molina', 'Suárez', 'Cabrera', 'Ríos', 'Acosta', 'Benítez', 'Correa', 'Sosa', 'Paredes', 'Vega', 'Mendoza', 'Ibarra'],
      nick: ['Chucho', 'Pipa', 'Tucu', 'Chino', 'Pato', 'Cuti', 'Pocho', 'Toto']
    },
    en: {
      f: ['Jack', 'Harry', 'Oliver', 'George', 'Charlie', 'James', 'Thomas', 'William', 'Joe', 'Callum', 'Ryan', 'Luke', 'Mason', 'Kieran', 'Jordan', 'Connor', 'Lewis', 'Reece', 'Tyler', 'Ben', 'Sam', 'Jamie', 'Aaron', 'Declan', 'Marcus', 'Ethan', 'Owen', 'Liam', 'Dylan', 'Scott', 'Ross', 'Cole', 'Tyrone', 'Archie', 'Alfie', 'Josh'],
      l: ['Smith', 'Jones', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Walker', 'Wright', 'Robinson', 'Thompson', 'White', 'Hughes', 'Edwards', 'Green', 'Hall', 'Wood', 'Clarke', 'Harris', 'Lewis', 'Cooper', 'King', 'Baker', 'Turner', 'Hill', 'Ward', 'Morris', 'Mitchell', 'Campbell', 'Stewart', 'Murray', 'McKenzie', 'Fraser', 'Bennett', 'Carter', 'Palmer', 'Barnes'],
      nick: []
    },
    de: {
      f: ['Lukas', 'Leon', 'Felix', 'Jonas', 'Maximilian', 'Paul', 'Niklas', 'Tim', 'Jan', 'Florian', 'Kai', 'Julian', 'Moritz', 'Fabian', 'Marco', 'Kevin', 'Dennis', 'Sebastian', 'Tobias', 'Matthias', 'Lars', 'Nico', 'Robin', 'Erik', 'Jannik', 'Timo', 'Benedikt', 'Joshua', 'Malte', 'Henrik'],
      l: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger', 'Hartmann', 'Lange', 'Werner', 'Krause', 'Lehmann', 'Köhler', 'Maier', 'Huber', 'Kaiser', 'Fuchs', 'Vogel'],
      nick: []
    },
    it: {
      f: ['Lorenzo', 'Alessandro', 'Matteo', 'Francesco', 'Andrea', 'Federico', 'Riccardo', 'Davide', 'Marco', 'Nicolò', 'Simone', 'Gianluca', 'Stefano', 'Fabio', 'Luca', 'Giacomo', 'Manuel', 'Daniele', 'Pietro', 'Tommaso', 'Mattia', 'Leonardo', 'Emanuele', 'Gabriele', 'Christian', 'Giorgio', 'Michele', 'Antonio'],
      l: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo', 'Lombardi', 'Moretti', 'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso', 'Ferri', 'Galli', 'Martini', 'Leone'],
      nick: []
    },
    fr: {
      f: ['Lucas', 'Hugo', 'Théo', 'Nathan', 'Louis', 'Enzo', 'Mathis', 'Tom', 'Clément', 'Maxime', 'Antoine', 'Alexandre', 'Kylian', 'Jules', 'Adrien', 'Romain', 'Florian', 'Benjamin', 'Moussa', 'Ibrahima', 'Youssouf', 'Kévin', 'Rayan', 'Baptiste', 'Quentin', 'Bastien', 'Aurélien', 'Sofiane'],
      l: ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'Girard', 'Mercier', 'Diallo', 'Traoré', 'Koné', 'Camara', 'Bonnet', 'Lambert', 'Fontaine'],
      nick: []
    },
    nl: {
      f: ['Daan', 'Sem', 'Lars', 'Thijs', 'Jesse', 'Ruben', 'Bram', 'Stijn', 'Luuk', 'Joey', 'Teun', 'Niels', 'Wout', 'Jens', 'Milan', 'Kevin', 'Dries', 'Arne', 'Siebe', 'Pieter', 'Jelle', 'Koen', 'Timon', 'Maarten'],
      l: ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'de Boer', 'Mulder', 'de Groot', 'Bos', 'Vos', 'Peters', 'Hendriks', 'Dekker', 'Peeters', 'Maes', 'Claes', 'Wouters', 'Janssens', 'Mertens', 'Willems'],
      nick: []
    },
    tr: {
      f: ['Mehmet', 'Mustafa', 'Ahmet', 'Emre', 'Burak', 'Can', 'Kerem', 'Arda', 'Hakan', 'Cengiz', 'Ozan', 'Yusuf', 'Ömer', 'Barış', 'Serdar', 'Volkan', 'Kaan', 'Efe', 'Oğuz', 'Umut'],
      l: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özkan', 'Şimşek'],
      nick: []
    },
    gr: {
      f: ['Giorgos', 'Nikos', 'Kostas', 'Dimitris', 'Giannis', 'Christos', 'Panagiotis', 'Vasilis', 'Thanasis', 'Michalis', 'Stelios', 'Andreas', 'Manolis', 'Petros', 'Lefteris', 'Sotiris'],
      l: ['Papadopoulos', 'Georgiou', 'Nikolaidis', 'Karagiannis', 'Pappas', 'Vlachos', 'Angelopoulos', 'Dimitriou', 'Oikonomou', 'Makris', 'Christodoulou', 'Konstantinidis', 'Alexiou', 'Galanis', 'Ioannou', 'Spanos'],
      nick: []
    }
  };

  // Nacionalidade de um jogador: maioria do país do clube
  const NAT_POOL = ['BRA', 'BRA', 'ARG', 'ARG', 'FRA', 'ESP', 'POR', 'URU', 'COL', 'ENG', 'GER', 'ITA', 'NED', 'BEL', 'MEX', 'TUR'];
  P.pickNat = (r, clubCountry) => (r() < 0.75 && P.COUNTRIES[clubCountry] ? clubCountry : P.pick(r, NAT_POOL));

  P.makeName = function (r, used, nat) {
    const lang = (P.COUNTRIES[nat] || P.COUNTRIES.BRA).lang;
    const pool = NAMES[lang] || NAMES.pt;
    for (let i = 0; i < 60; i++) {
      const x = r();
      let n;
      if (lang === 'pt' && x < 0.25) n = r() < 0.6 ? P.pick(r, pool.f) : P.pick(r, pool.nick);
      else if (lang === 'es' && x < 0.06) n = P.pick(r, pool.nick);
      else n = P.pick(r, pool.f) + ' ' + P.pick(r, pool.l);
      if (!used || !used.has(n)) { if (used) used.add(n); return n; }
    }
    const n = P.pick(r, pool.f) + ' ' + P.pick(r, pool.l) + ' ' + P.pick(r, pool.l);
    if (used) used.add(n);
    return n;
  };

  // ---------- Nomes de clubes fictícios ----------
  // Cidades inventadas, montadas por sílabas no estilo de cada país
  const TOWN = {
    pt: [['Vila', 'Porto', 'Santa', 'São', 'Monte', 'Campo', 'Serra', 'Boa', 'Nova', 'Ribeira', 'Pedra', 'Barra', 'Lagoa', 'Vale'],
      ['Alegre', 'Verde', 'Bonita', 'Clara', 'Esperança', 'Formosa', 'do Sol', 'Funda', 'Dourada', 'Azul', 'das Flores', 'do Norte', 'Velha', 'Mansa', 'dos Ventos', 'Branca']],
    es: [['Villa', 'San', 'Puerto', 'Monte', 'Torre', 'Valle', 'Ciudad', 'Río', 'Playa', 'Cerro', 'Llano', 'Laguna'],
      ['Verde', 'del Sol', 'Hermosa', 'Alta', 'Nueva', 'Dorada', 'del Mar', 'Blanca', 'de Oro', 'Clara', 'Serena', 'Bravía', 'del Norte', 'Real', 'Florida']],
    en: [['Brack', 'Thorn', 'Ash', 'Wick', 'Hollin', 'Marl', 'Stan', 'Fern', 'Elder', 'Brom', 'Cran', 'Dun', 'Grey', 'Wil', 'Hather', 'Mill', 'Oak', 'Kel', 'Ravens', 'Black'],
      ['ford', 'wick', 'ham', 'bridge', 'field', 'ton', 'moor', 'by', 'stead', 'worth', 'dale', 'brook', 'gate', 'combe', 'mouth', 'hurst']],
    de: [['Wald', 'Stein', 'Rosen', 'Eichen', 'Linden', 'Hohen', 'Alten', 'Neu', 'Sonnen', 'Birken', 'Tannen', 'Falken', 'Mühl', 'Grün', 'Kirch'],
      ['burg', 'feld', 'bach', 'dorf', 'heim', 'au', 'stadt', 'hausen', 'berg', 'tal', 'brück', 'hof']],
    it: [['Monte', 'Castel', 'Villa', 'Porto', 'San', 'Borgo', 'Rocca', 'Valle', 'Pietra', 'Torre', 'Colle', 'Campo'],
      ['verde', 'rosso', 'franco', 'alto', 'marino', 'nuovo', 'fiore', 'lago', 'sereno', 'chiaro', 'dorato', 'vecchio', 'bianco']],
    fr: [['Saint-Aurin', 'Mont', 'Beau', 'Vill', 'Font', 'Clair', 'Roche', 'Belle', 'Ver', 'Château', 'Aube', 'Brie'],
      ['mont', 'ville', 'fort', 'lac', 'val', 'champ', 'rive', 'bourg', 'mer', 'pré', 'ac']],
    nl: [['Oost', 'West', 'Noord', 'Zuid', 'Groen', 'Hoog', 'Lange', 'Zee', 'Brug', 'Kerk', 'Wester', 'Ooster'],
      ['dam', 'wijk', 'veen', 'hoven', 'burg', 'horst', 'land', 'berg', 'drecht', 'zand', 'linde']],
    tr: [['Kara', 'Ak', 'Yeni', 'Göl', 'Deniz', 'Kızıl', 'Sarı', 'Gök', 'Taş', 'Ova'],
      ['köy', 'tepe', 'dere', 'pınar', 'kent', 'kaya', 'su', 'yurt', 'bağ']],
    gr: [['Nea', 'Agia', 'Palaia', 'Ano', 'Kato', 'Megali'],
      ['Kastro', 'Limani', 'Chora', 'Polis', 'Dafni', 'Elaia', 'Akti', 'Petra']]
  };
  const SPACE_LANGS = ['pt', 'es', 'gr'];
  const STYLE = {
    BRA: ['Esporte Clube {T}', '{T} FC', 'Atlético {T}', 'América de {T}', 'Sport Club {T}', 'Associação {T}', 'Grêmio {T}', 'União {T}'],
    POR: ['SC {T}', 'FC {T}', 'CD {T}', 'Académico de {T}', 'Desportivo de {T}', 'União de {T}'],
    ARG: ['Club Atlético {T}', '{T} Juniors', 'Deportivo {T}', 'Sportivo {T}', 'Club Social {T}'],
    URU: ['Club {T}', 'Atlético {T}', 'Sportivo {T}'],
    COL: ['Deportivo {T}', 'Atlético {T}', 'Independiente {T}', 'Real {T}'],
    MEX: ['Club {T}', 'Deportivo {T}', 'Atlético {T}', 'Real {T}', 'Unión {T}'],
    ESP: ['Real {T}', '{T} CF', 'CD {T}', 'UD {T}', 'Atlético {T}', 'SD {T}', 'Racing {T}'],
    ENG: ['{T} United', '{T} Town', '{T} City', '{T} Rovers', '{T} Athletic', '{T} Wanderers', '{T} Albion', 'AFC {T}', '{T} Rangers'],
    SCO: ['{T} FC', '{T} Thistle', '{T} Athletic', 'Inver{t}', '{T} Albion'],
    USA: ['{T} FC', '{T} SC', 'Real {T}', '{T} United'],
    GER: ['FC {T}', 'SV {T}', 'VfB {T}', 'TSV {T}', 'SC {T}', 'Borussia {T}', 'Fortuna {T}', 'Eintracht {T}'],
    ITA: ['AC {T}', 'US {T}', '{T} Calcio', 'SS {T}', 'Virtus {T}', 'Unione {T}', 'Sporting {T}'],
    FRA: ['{T} FC', 'Olympique {T}', 'AS {T}', 'Stade {T}', 'Racing {T}', 'US {T}'],
    BEL: ['Royal {T}', 'KV {T}', 'Sporting {T}', 'RFC {T}'],
    NED: ['FC {T}', 'SC {T}', 'VV {T}', 'SV {T}'],
    TUR: ['{T}spor', '{T} SK', '{T} Belediyespor', '{T} FK'],
    GRE: ['AE {T}', 'AO {T}', '{T} FC', 'PAE {T}']
  };
  const STADIUM = {
    pt: ['Estádio {T}', 'Arena {T}', 'Estádio Municipal de {T}'], es: ['Estadio {T}', 'Estadio Municipal de {T}', 'Arena {T}'],
    en: ['{T} Park', '{T} Road', '{T} Lane', '{T} Ground'], de: ['{T} Stadion', '{T}-Arena', 'Stadion am {T}er Wald'],
    it: ['Stadio {T}', 'Stadio Comunale di {T}'], fr: ['Stade de {T}', 'Stade Municipal de {T}'], nl: ['{T} Stadion', 'Sportpark {T}'],
    tr: ['{T} Stadyumu', '{T} Arena'], gr: ['Gipedo {T}', 'Stadio {T}']
  };
  const PALETTE = ['#c8102e', '#1d3a8a', '#0b6e3b', '#111111', '#ffffff', '#f2c230', '#6a1b9a', '#0a8fd8', '#e85d04', '#7a1f2b', '#00897b', '#d81b60', '#5d4037', '#ffd200', '#2e7d32', '#283593'];

  function makeTown(r, lang, usedTowns) {
    const parts = TOWN[lang] || TOWN.pt;
    for (let i = 0; i < 80; i++) {
      const a = P.pick(r, parts[0]), b = P.pick(r, parts[1]);
      const t = SPACE_LANGS.includes(lang) ? a + ' ' + b : a + b;
      if (!usedTowns.has(t)) { usedTowns.add(t); return t; }
    }
    return P.pick(r, parts[0]) + ' ' + P.pick(r, parts[1]) + ' ' + Math.floor(r() * 90 + 10);
  }
  function makeShort(name, used) {
    const stop = ['FC', 'SC', 'CD', 'UD', 'SD', 'AC', 'US', 'SS', 'AS', 'SV', 'VfB', 'TSV', 'KV', 'RFC', 'VV', 'AE', 'AO', 'PAE', 'SK', 'FK', 'AFC', 'Club', 'de', 'do', 'da', 'del', 'di', 'dos', 'das', 'Real', 'Atlético', 'Esporte', 'Clube', 'Sport', 'Club', 'Deportivo', 'Sportivo', 'Royal', 'Stade', 'Olympique', 'Racing', 'Unione', 'Virtus', 'Unión', 'União', 'Associação', 'Grêmio', 'Académico', 'Desportivo', 'Sporting', 'Borussia', 'Fortuna', 'Eintracht', 'Independiente', 'Social', 'América'];
    const words = name.replace(/[^A-Za-zÀ-ÿĞğİıŞşÇçÖöÜü ]/g, ' ').split(' ').filter((w) => w && !stop.includes(w));
    const base = (words.join('') || name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();
    const cands = [base.slice(0, 3), base[0] + base.slice(2, 4), base[0] + base[1] + base[base.length - 1], base[0] + base.slice(3, 5)];
    for (const c of cands) if (c.length === 3 && !used.has(c)) { used.add(c); return c; }
    for (let i = 0; i < 26; i++) { const c = base.slice(0, 2) + String.fromCharCode(65 + i); if (!used.has(c)) { used.add(c); return c; } }
    return base.slice(0, 3);
  }

  P.SQUAD_TEMPLATE = { GOL: 3, LD: 2, ZAG: 4, LE: 2, VOL: 3, MC: 3, MEI: 2, PD: 2, PE: 2, ATA: 3 };
  P.levelFromRep = (rep) => 5 + rep * 0.11; // rep 95 → 15.5 | rep 45 → 10
  P.slotRep = (i) => Math.round((95 - i * 50 / 159) * 10) / 10;

  function pickAge(r) {
    const x = r();
    if (x < 0.12) return 17 + Math.floor(r() * 3);
    if (x < 0.35) return 20 + Math.floor(r() * 4);
    if (x < 0.80) return 24 + Math.floor(r() * 7);
    return 31 + Math.floor(r() * 5);
  }
  function ageEffect(age) {
    if (age <= 19) return -2.5;
    if (age <= 21) return -1.5;
    if (age <= 23) return -0.6;
    if (age <= 30) return 0;
    if (age <= 32) return -0.3;
    return -1;
  }

  P.blankStats = () => ({ j: 0, g: 0, as: 0, ca: 0, cv: 0, nt: 0, cg: 0 });

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
    const pot = P.clamp(Math.round((q + (age < 24 ? (24 - age) * 0.45 + Math.abs(P.gauss(r)) * 1.2 : 0)) * 10) / 10, 1, 20);
    const nat = opts.nat || P.pickNat(r, opts.country);
    return {
      id: opts.id || P.uid('p'),
      name: opts.name || P.makeName(r, opts.used, nat),
      age, pos, nat, clubId: opts.clubId || null, a, pot,
      cond: 100, mor: 70, inj: 0, susp: 0, ylw: 0,
      s: P.blankStats()
    };
  };

  P.makeSquad = function (r, db, club, used, idGen) {
    const level = P.levelFromRep(club.rep);
    for (const pos of Object.keys(P.SQUAD_TEMPLATE)) {
      for (let n = 0; n < P.SQUAD_TEMPLATE[pos]; n++) {
        const p = P.makePlayer(r, { pos, level, clubId: club.id, used, country: club.country, id: idGen ? idGen() : undefined });
        db.players[p.id] = p;
      }
    }
  };

  // Gera o banco de dados completo (160 clubes + ~4.160 jogadores)
  P.generateDatabase = function (seed) {
    const r = P.rng(seed || 2027);
    const used = new Set(), towns = new Set(), shorts = new Set();
    const db = { version: P.VERSION, clubs: [], players: {} };
    let pc = 1;
    SLOT_COUNTRIES.forEach((country, i) => {
      const lang = P.COUNTRIES[country].lang;
      const town = makeTown(r, lang, towns);
      let name = P.pick(r, STYLE[country]).replace('{T}', town).replace('{t}', town.toLowerCase());
      const c1 = P.pick(r, PALETTE);
      let c2 = P.pick(r, PALETTE);
      while (c2 === c1) c2 = P.pick(r, PALETTE);
      const club = {
        id: 'c' + (i + 1), name, short: makeShort(name, shorts), country, city: town,
        stadium: P.pick(r, STADIUM[lang]).replace('{T}', town), colors: [c1, c2],
        rep: P.slotRep(i), div: Math.floor(i / P.DIV_SIZE) + 1
      };
      db.clubs.push(club);
      P.makeSquad(r, db, club, used, () => 'p' + (pc++));
    });
    return db;
  };

  // Aplica um patch (nomes, cores, países...) aos clubes pelo id
  P.applyPatch = function (db, patch) {
    if (!patch || !Array.isArray(patch.clubs)) throw new Error('Patch sem lista de clubes.');
    let n = 0;
    for (const pc of patch.clubs) {
      const c = db.clubs.find((x) => x.id === pc.id);
      if (!c) continue;
      for (const k of ['name', 'short', 'city', 'stadium', 'country']) if (pc[k]) c[k] = String(pc[k]);
      if (Array.isArray(pc.colors) && pc.colors.length >= 2) c.colors = pc.colors.slice(0, 2);
      if (pc.rep) c.rep = P.clamp(Number(pc.rep) || c.rep, 1, 100);
      n++;
    }
    return n;
  };
})(window.PFC);
