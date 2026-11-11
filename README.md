# Prancheta FC

Jogo de gerenciamento de futebol no navegador: a agilidade do Brasfoot com atributos, táticas e editor no estilo FM. Funciona no celular e no computador, sem instalar nada.

## Como rodar

- **Mais fácil:** abra `index.html` no navegador.
- Ele carrega `style.css` e os arquivos `.js` separados, então qualquer mudança aparece ao recarregar a página.
- Opcional: `python3 build.py` gera `jogo-completo.html`, o jogo inteiro num arquivo só.

Está publicado na Vercel a partir do GitHub: cada alteração salva no repositório atualiza o site sozinha.

## Onde fica cada coisa

| Arquivo | O que tem |
|---|---|
| `util.js` | Sorteio com semente, helpers, salvamento no navegador |
| `data.js` | Posições, atributos, clubes padrão, geração de jogadores e nomes |
| `engine.js` | Força dos jogadores, formações, táticas, simulação das partidas, rodada, tabela, virada de temporada |
| `ui.js` | Todas as telas (início, elenco, tática, tabela, dia de jogo, mais) e as ações dos botões |
| `editor.js` | Editor de clubes, jogadores e banco de dados |
| `main.js` | Inicialização |
| `style.css` | Visual (cores no topo do arquivo, tema claro e escuro) |

## Mexendo no equilíbrio do jogo

No começo do `engine.js` fica o objeto `TUNING`: chance de ataque por minuto, conversão de gols, vantagem de jogar em casa, frequência de cartões e lesões, desgaste e recuperação física. Com os valores atuais, a média é de cerca de 2,5 gols por jogo, com 45% de vitórias do mandante.

Para testar mudanças rápido, simule temporadas inteiras no terminal com Node (veja o exemplo no fim deste arquivo).

## Como adicionar coisas

- **Nova formação:** acrescente uma entrada em `P.FORMATIONS` (`engine.js`) com 11 posições e coordenadas x/y no campo.
- **Novo atributo:** adicione em `P.ATTRS` (`data.js`), dê peso em `P.roles` (`engine.js`) e ajuste os perfis em `P.PROFILE`.
- **Nova tela:** crie uma função `vNome()` em `ui.js`, registre em `views` dentro de `A.render` e adicione o botão no `nav`.
- **Novo botão:** use `data-a="minhaAcao"` no HTML e crie `minhaAcao(d)` dentro de `ACT`. Os `data-*` do botão chegam em `d`.

## Próximos passos sugeridos

1. Segunda divisão com acesso e rebaixamento
2. Transferências e mercado (comprar, vender, empréstimo)
3. Finanças: bilheteria, salários, orçamento
4. Substituições e mudança de tática durante o jogo
5. Copa nacional em mata-mata
6. Treinamento e categorias de base

## Teste de temporada no terminal

```js
// node teste.js
global.window = {};
const fs = require('fs');
for (const f of ['util', 'data', 'engine']) eval(fs.readFileSync(f + '.js', 'utf8'));
const P = window.PFC;
const g = P.newGame(P.generateDatabase(2027), 'c1', 'Teste');
while (!g.over) P.playRound(g);
console.log(P.table(g).slice(0, 5).map((r) => P.club(g, r.cid).name + ' ' + r.pts));
```
