/* Prancheta FC — capa estilo menu (PC e celular deitado)
 * Esquerda: menu em ordem (Continuar, Nova carreira, Carreiras salvas, Torneio, Preferências).
 * Direita: a "matéria" da última carreira, como página de jornal.
 * Em pé, a capa continua no formato de jornal empilhado.
 */
(function (P) {
  const A = P.app, esc = P.esc;
  const ago = (t) => { if (!t) return ''; const d = Math.floor((Date.now() - t) / 864e5); return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`; };

  // Dados extras guardados com o save, para a matéria da capa
  P.frontExtra = function (g) {
    const c = P.club(g, g.user), tb = P.table(g, c.div), i = tb.findIndex((r) => r.cid === g.user), r = tb[i] || {};
    const sq = P.squad(g, g.user);
    const top = sq.slice().sort((a, b) => (b.s.g + b.s.cg) - (a.s.g + a.s.cg))[0];
    const star = sq.slice().sort((a, b) => P.ovr(b) - P.ovr(a))[0];
    const nx = !g.over && P.userMatch(g, g.cal[g.week]);
    const lm = P.lastUserMatch ? P.lastUserMatch(g) : null;
    let last = null;
    if (lm) { const m = lm.m, home = m.h === g.user; last = { op: P.club(g, home ? m.a : m.h).name, opStad: P.club(g, home ? m.a : m.h).stadium || '', neutral: !!m.neutral, gf: home ? m.hg : m.ag, ga: home ? m.ag : m.hg, home, ko: !!lm.ko, pen: !!m.pen, won: m.w === g.user, derby: P.rivalry ? P.rivalry(g, m.h, m.a) : 0 }; }
    return {
      form: (r.form || []).slice(-5).join(''), tgt: g.board ? g.board.target : null, down: P.RULES ? tb.length - P.RULES.down : null, upTo: P.RULES && c.div > 1 ? P.RULES.playoff[1] : null,
      pos: r.j ? i + 1 : 0, pts: r.pts || 0, v: r.v || 0, e: r.e || 0, d: r.d || 0, sg: (r.gp || 0) - (r.gc || 0), n: tb.length,
      stad: c.stadium || '', city: c.city || '', bal: c.bal, conf: g.board ? g.board.conf : null, obj: P.expectation ? P.expectation(g, g.user) : '',
      top: top && (top.s.g + top.s.cg) ? { n: top.name, g: top.s.g + top.s.cg } : null, star: star ? { n: star.name, o: P.ovr(star), p: star.pos } : null,
      next: nx ? { op: P.club(g, nx.m.h === g.user ? nx.m.a : nx.m.h).name, home: nx.m.h === g.user, lbl: P.stepLabel(g.cal[g.week]), derby: P.rivalry ? P.rivalry(g, nx.m.h, nx.m.a) : 0 } : null, last,
      tx: (() => { const t = (g.tx || []).find((x) => x.s === g.season && (x.to === g.user || x.from === g.user)); return t ? { n: t.name, in: t.to === g.user, op: (P.club(g, t.to === g.user ? t.from : t.to) || {}).name || '', fee: t.fee, loan: t.kind === 'loan' } : null; })(),
      badgeL: P.badge(c, 140)
    };
  };

  // Texto da matéria: narrativo, sem números de sistema (confiança, força)
  P.frontStory = function (m, x) {
    let seed = (m.season || 0) * 97 + (m.week || 0) * 13 + (m.club || '').length;
    const pk = (arr) => arr[(seed++ * 7919) % arr.length];
    const C = esc(m.club), T = esc(m.mgr), out = [];
    const L = x.last, conf = x.conf;
    // 1. o último jogo e o que ele significa para o cargo
    if (L) {
      const res = L.ko && L.pen ? (L.won ? 'v' : 'd') : L.gf > L.ga ? 'v' : L.gf < L.ga ? 'd' : 'e';
      const big = Math.abs(L.gf - L.ga) >= 3, op = esc(L.op), sc = `${L.gf} a ${L.ga}`;
      const where = L.home ? 'diante da sua torcida' : 'longe de casa';
      if (res === 'v') out.push(L.derby >= 1 ? pk([`Que noite: o ${C} venceu o clássico contra o ${op} por ${sc} e a cidade amanheceu em festa.`, `Clássico é clássico, e este foi do ${C}: ${sc} no ${op}.`])
        : big ? pk([`O ${C} não tomou conhecimento do ${op}: ${sc}, ${where}.`, `Atropelo. O ${C} passou por cima do ${op} com um ${sc} ${where}.`])
        : L.pen ? `Com o coração na boca, o ${C} passou pelo ${op} nos pênaltis.` : pk([`O ${C} venceu o ${op} por ${sc}, ${where}.`, `Três pontos no bolso: ${sc} sobre o ${op}, ${where}.`]));
      else if (res === 'e') out.push(pk([`O ${C} ficou no ${sc} com o ${op}, ${where}.`, `Empate com o ${op}: ${sc}, num jogo que deixou gosto de pouco.`]));
      else out.push(L.derby >= 1 ? pk([`Doeu: o ${C} perdeu o clássico para o ${op}, ${sc}, e a semana promete ser longa.`, `O clássico ficou com o ${op} (${sc}), e a torcida do ${C} não esconde a irritação.`])
        : big ? pk([`Noite para esquecer: o ${C} levou ${sc} do ${op}.`, `Vexame ${where}: ${sc} para o ${op}.`])
        : L.pen ? `Nos pênaltis, o ${C} caiu diante do ${op}.` : pk([`O ${C} perdeu para o ${op} por ${sc}, ${where}.`, `Tropeço diante do ${op}: ${sc}.`]));
      // cargo do técnico, em palavras
      if (conf != null) {
        const band = conf < 25 ? 'fogo' : conf < 45 ? 'pressao' : conf < 70 ? 'ok' : 'alta';
        const t = {
          fogo: { v: [`Um alívio para ${T}, que vinha com o cargo por um fio.`, `A vitória dá fôlego a ${T}: nos bastidores, a demissão chegou a ser discutida.`], e: [`O empate não muda muito para ${T}, que segue na corda bamba.`, `Para ${T}, que balança no cargo, o ponto ajuda pouco.`], d: [`Um passo mais perto da degola: a paciência da diretoria com ${T} está no fim.`, `Nos corredores do clube, já se fala em substituto para ${T}.`] },
          pressao: { v: [`${T} respira um pouco e ganha tempo com a diretoria.`, `Resultado importante para ${T}, que andava pressionado.`], e: [`${T} segue sob pressão: a diretoria quer mais.`, `O ponto não acalma a cobrança sobre ${T}.`], d: [`A pressão sobre ${T} aumenta, e a diretoria já cobra reação.`, `Mais uma derrota e o nome de ${T} começa a ser questionado.`] },
          ok: { v: [`O trabalho de ${T} ganha corpo.`, `A diretoria gosta do que vê no trabalho de ${T}.`], e: [`Nada que abale o trabalho de ${T}.`, ''], d: [`Nada de pânico: a diretoria segue confiando em ${T}, mas quer resposta.`, `Um tropeço que acende o sinal amarelo, sem tirar o crédito de ${T}.`] },
          alta: { v: [`${T} vive lua de mel com a diretoria e com a torcida.`, `Prestígio em alta: ${T} é tratado como unanimidade no clube.`], e: [`Com o crédito que tem, ${T} nem sente o empate.`, ''], d: [`Prestigiado, ${T} tem crédito de sobra para corrigir a rota.`, `A derrota não arranha o prestígio de ${T}.`] }
        }[band][res];
        const line = pk(t); if (line) out.push(line);
      }
    } else out.push(pk([`A bola ainda não rolou para o ${C} em ${m.season}, mas a expectativa já toma conta da torcida.`, `Começa a temporada ${m.season}, e o ${C} chega cheio de perguntas e de esperança.`]));
    // 2. tabela e meta, em palavras
    if (x.pos) {
      const f = x.form || '', wins = (f.match(/V/g) || []).length, losses = (f.match(/D/g) || []).length;
      const pos = x.pos, n = x.n || 20;
      const zone = pos === 1 ? 'lider' : x.upTo && pos <= x.upTo ? 'acesso' : x.down && pos > x.down ? 'z' : pos <= Math.ceil(n / 3) ? 'cima' : pos <= Math.ceil(n * 2 / 3) ? 'meio' : 'baixo';
      out.push({
        lider: pk([`Na ${m.dn || m.div + 'ª divisão'}, o time olha todos de cima: é o líder.`, `A liderança é do ${C}, e ninguém no clube quer largar o osso.`]),
        acesso: pk([`Na tabela, o ${C} está na briga pelo acesso, em ${pos}º.`, `O sonho de subir segue vivo: ${pos}º lugar.`]),
        cima: pk([`O time ocupa a parte de cima da tabela, em ${pos}º.`, `Em ${pos}º, o ${C} anda entre os primeiros.`]),
        meio: pk([`No meio da tabela, em ${pos}º, o time ainda procura uma identidade.`, `O ${C} é o ${pos}º: nem lá, nem cá.`]),
        baixo: pk([`O ${C} está na parte de baixo da tabela, em ${pos}º, e o sinal de alerta já acendeu.`, `Em ${pos}º, o time precisa de reação para não se complicar.`]),
        z: pk([`O ${C} está na zona de rebaixamento, em ${pos}º, e o fantasma da queda ronda o clube.`, `Em ${pos}º, dentro da zona da degola, cada jogo vale como uma final.`])
      }[zone]);
      if (wins >= 4) out.push(pk(['A fase é ótima: o time não para de vencer.', 'A sequência de vitórias empolga a torcida.']));
      else if (losses >= 3) out.push(pk(['A má fase preocupa: as derrotas se acumulam.', 'A sequência ruim já pesa no ambiente.']));
      if (x.tgt && x.obj) out.push(pos <= x.tgt ? pk([`Por ora, o time cumpre o que a diretoria pediu: ${esc(x.obj.toLowerCase())}.`, `A meta de ${esc(x.obj.toLowerCase())} está sendo cumprida.`]) : pk([`A diretoria pediu ${esc(x.obj.toLowerCase())}, e o time ainda está devendo.`, `Para cumprir a meta (${esc(x.obj.toLowerCase())}), é preciso subir na tabela.`]));
    }
    // 3. destaque, mercado e próximo jogo
    if (x.top && x.top.g >= 2) out.push(pk([`Nos gols, quem decide é ${esc(x.top.n)}, já com ${x.top.g} na temporada.`, `${esc(x.top.n)} vive fase artilheira, com ${x.top.g} gols.`]));
    else if (x.star) out.push(`${esc(x.star.n)} segue como a principal referência técnica do elenco.`);
    if (x.tx) out.push(x.tx.in ? `No mercado, a novidade é ${esc(x.tx.n)}${x.tx.op ? `, que chegou do ${esc(x.tx.op)}` : ''}${x.tx.loan ? ' por empréstimo' : ''}.` : `No mercado, a torcida ainda digere a saída de ${esc(x.tx.n)} para o ${esc(x.tx.op)}.`);
    if (x.next) out.push(x.next.derby >= 1 ? pk([`Agora vem o clássico contra o ${esc(x.next.op)}, ${x.next.home ? 'em casa' : 'fora'}, e a cidade já não fala de outra coisa.`, `Semana de clássico: o ${esc(x.next.op)} vem aí${x.next.home ? ', em casa' : ''}.`])
      : pk([`O próximo desafio é ${x.next.home ? 'em casa, contra o' : 'fora, diante do'} ${esc(x.next.op)}${x.next.home && x.stad ? `, no ${esc(x.stad)}` : ''}.`, `Na sequência, o ${C} ${x.next.home ? 'recebe' : 'visita'} o ${esc(x.next.op)}.`]));
    return out.join(' ');
  };

  P.frontMenu = function () {
    const meta = P.slotMeta ? P.slotMeta() : { s: {} };
    const ids = Object.keys(meta.s).map(Number);
    const last = meta.s[meta.active] ? meta.active : ids.sort((a, b) => (meta.s[b].at || 0) - (meta.s[a].at || 0))[0];
    const m = last ? meta.s[last] : null;
    const view = A.setup.fm || 'news';
    const item = (n, t, sub, act, extra, on) => `<button class="fm-item ${on ? 'on' : ''}" data-a="${act}" ${extra || ''}><span class="fm-n">${n}</span><span class="fm-t"><b>${t}</b><small>${sub}</small></span><span class="fm-go">›</span></button>`;
    const menu = `<nav class="fm-menu" aria-label="Menu">
      ${m ? item('1', 'Continuar', `${esc(m.club)} · temporada ${m.season}`, 'slotOpen', `data-n="${last}"`, false) : ''}
      ${item(m ? '2' : '1', 'Nova carreira', 'Técnico, diretoria e clube em 3 passos', 'ncOpen')}
      ${item(m ? '3' : '2', 'Carreiras salvas', `${ids.length} de ${P.SLOT_N || 9} espaços em uso`, 'fmView', 'data-k="slots"', view === 'slots')}
      ${item(m ? '4' : '3', 'Modo torneio', 'Monte e simule de 3 a 64 times', 'tourOpen')}
      ${item(m ? '5' : '4', 'Preferências', 'Tema, tela, rádio e banco de dados', 'prefsOpen')}
    </nav>`;
    let right;
    if (view === 'slots') {
      right = `<div class="fm-slots"><div class="row" style="align-items:center"><h2 class="jr-h" style="flex:1;margin:0">Carreiras salvas</h2><button class="btn sm ghost" data-a="fmView" data-k="news">‹ Voltar</button></div>${(P.slotsCard && P.slotsCard()) || '<p class="empty">Nenhuma carreira salva ainda.</p>'}</div>`;
    } else if (m) {
      const x = m.x || {};
      const box = (k, v) => (v || v === 0 ? `<div><span>${k}</span><b>${v}</b></div>` : '');
      const body = P.frontStory(m, x);
      right = `<article class="fm-news fm-big">
        <div class="fm-kick">${m.dn || m.div + 'ª divisão'} · Temporada ${m.season}${m.over ? ' · fim de temporada' : ''} · Espaço ${last}</div>
        <h2 class="fm-head">${esc(m.head || `${m.club}, de ${m.mgr}`)}</h2>
        <p class="fm-sub">${esc(m.dek || `${m.club} sob o comando de ${m.mgr}.`)}</p>
        <div class="fm-by"><span>Por ${esc(m.mgr)} · última edição ${ago(m.at)}</span><button class="btn primary land-only-btn" data-a="slotOpen" data-n="${last}">Continuar →</button></div>
        <div class="fm-grid">
          <figure class="fm-photo">${x.badgeL || m.badge || ''}<figcaption>${esc(m.club)}${x.stad ? ' · ' + esc(x.stad) : ''}</figcaption></figure>
          <div class="fm-text"><p class="fm-dek">${body}</p></div>
          ${x.pos || x.next ? `<aside class="fm-box"><h4>Em números</h4>${box('Posição', x.pos ? x.pos + 'º' : '')}${box('Pontos', x.pos ? x.pts : '')}${box('Campanha', x.pos ? `${x.v}-${x.e}-${x.d}` : '')}${box('Saldo', x.pos ? (x.sg > 0 ? '+' : '') + x.sg : '')}${x.bal != null ? box('Caixa', P.money(x.bal)) : ''}${x.next ? `<div class="fm-next"><span>Próximo jogo</span><b>${x.next.home ? 'vs.' : '@'} ${esc(x.next.op)}</b></div>` : ''}</aside>` : ''}
        </div>
        ${P.columnHTML ? P.columnHTML(x, { season: m.season, week: m.week, club: m.club, mgr: m.mgr }) : ''}
        <div class="row fm-act"><button class="btn primary" data-a="slotOpen" data-n="${last}">Continuar a leitura →</button></div>
      </article>`;
    } else {
      right = `<article class="fm-news"><div class="fm-kick">Classificados</div><h2 class="fm-head">Procura-se técnico</h2>
        <p class="fm-dek">Clube da Ultraliga contrata. 160 clubes, 17 países, 8 divisões. Paga-se em glória. Três passos: o técnico, a diretoria e o clube.</p>
        <div class="row fm-act"><button class="btn primary" data-a="ncOpen">Começar nova carreira →</button></div></article>`;
    }
    return `<div class="fm">${menu}<div class="fm-right">${right}</div></div>`;
  };
  A.ACT.fmView = (d) => { A.setup.fm = d.k; A.render(); };
})(window.PFC);
