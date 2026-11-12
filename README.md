# Prancheta FC

Jogo de gerenciamento de futebol no navegador: a agilidade do Brasfoot com atributos, táticas e editor no estilo FM. Funciona no celular e no computador, sem instalar nada.

**Ultraliga:** 160 clubes de 17 países em 8 divisões de 20. Sobem 2 direto + o vencedor do playoff (3º a 6º), descem 3. Copa Ultra em mata-mata com todos os clubes. Você pode escolher qualquer clube ou criar o seu.

**Patch de clubes reais:** o banco padrão é fictício. O arquivo `patch-clubes-reais.json` (fora do repositório) troca nomes, cores e países pelos clubes reais. Importe pelo jogo em Importar ou Editor › Banco e patches.

## Como rodar

- **Mais fácil:** abra `index.html` no navegador.
- Ele carrega `style.css` e os arquivos `.js` separados, então qualquer mudança aparece ao recarregar a página.
- Opcional: `python3 build.py` gera `jogo-completo.html`, o jogo inteiro num arquivo só.

Está publicado na Vercel a partir do GitHub: cada alteração salva no repositório atualiza o site sozinha.

## Onde fica cada coisa

| Arquivo | O que tem |
|---|---|
| `util.js` | Sorteio com semente, helpers, salvamento no navegador |
| `data.js` | Posições, atributos, países, geração de clubes e jogadores, aplicação de patch |
| `engine.js` | Força, formações, táticas, simulação, calendário semanal, Copa Ultra, playoffs, acesso/rebaixamento, criação de clube |
| `ui.js` | Todas as telas (início, elenco, tática, tabela, dia de jogo, mais) e as ações dos botões |
| `staff.js` | Equipe técnica: olheiros, fisioterapeuta, preparador físico, treinador do Sub-20, auxiliar técnico |
| `tactics.js` | Táticas avançadas: posição livre, funções e postura, entrosamento, instruções de equipe |
| `calendar.js` | Calendário com datas, plano de treino por semana (adjunto decide quando vazio) e simulação até uma data |
| `live.js` | Partida ao vivo: pausa em expulsão, lesão e intervalo; substituições e mentalidade durante o jogo |
| `potential.js` | Potencial dinâmico: sobe com tempo de jogo e boas notas, cai para quem não joga (até 24 anos e Sub-20) |
| `club.js` | Dificuldade (diretoria e negociações), confiança, demissão, propostas de emprego, estádio e estrutura |
| `people.js` | Discurso pós-jogo, insatisfação, conversas individuais e tipos de lesão |
| `stats.js` | Estatísticas da temporada e da carreira e resumo de fim de temporada |
| `editor.js` | Editor de clubes, jogadores e banco de dados |
| `main.js` | Inicialização |
| `style.css` | Visual (cores no topo do arquivo, tema claro e escuro) |

## Mexendo no equilíbrio do jogo

No começo do `engine.js` ficam `TUNING` (equilíbrio das partidas) e `RULES` (quantos sobem, playoff e quantos descem). Logo abaixo, `ECON` controla a economia: cotas de TV por divisão, preço do ingresso, premiações e a curva de salários. `TUNING` tem: chance de ataque por minuto, conversão de gols, vantagem de jogar em casa, frequência de cartões e lesões, desgaste e recuperação física. Com os valores atuais, a média é de cerca de 2,5 gols por jogo, com 45% de vitórias do mandante.

Para testar mudanças rápido, simule temporadas inteiras no terminal com Node (veja o exemplo no fim deste arquivo).

## Como adicionar coisas

- **Nova formação:** acrescente uma entrada em `P.FORMATIONS` (`engine.js`) com 11 posições e coordenadas x/y no campo.
- **Novo atributo:** adicione em `P.ATTRS` (`data.js`), dê peso em `P.roles` (`engine.js`) e ajuste os perfis em `P.PROFILE`.
- **Nova tela:** crie uma função `vNome()` em `ui.js`, registre em `views` dentro de `A.render` e adicione o botão no `nav`.
- **Novo botão:** use `data-a="minhaAcao"` no HTML e crie `minhaAcao(d)` dentro de `ACT`. Os `data-*` do botão chegam em `d`.

## Próximos passos sugeridos

2. Mercado de transferências (comprar, vender, empréstimo, propostas da IA)
3. Ultraliga Sub-20 com olheiros e equipe técnica
4. Substituições e mudança de tática durante o jogo
6. Treinamento e categorias de base

## Teste de temporada no terminal

```js
// node teste.js
global.window = {};
const fs = require('fs');
for (const f of ['util', 'data', 'engine']) eval(fs.readFileSync(f + '.js', 'utf8'));
const P = window.PFC;
const g = P.newGame(P.generateDatabase(2027), 'c1', 'Teste');
while (!g.over) P.playWeek(g);
console.log(P.table(g, 1).slice(0, 5).map((r) => P.club(g, r.cid).name + ' ' + r.pts));
```
