// Monta a pasta "www" do app (PC e Android) a partir do jogo do site.
// Baixa as fontes do Google para dentro do app, para funcionar sem internet.
// Uso: node app/prepare-www.mjs <pasta-destino>
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'app', 'www'));
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const copy = (rel) => fs.cpSync(path.join(root, rel), path.join(out, rel), { recursive: true });
for (const f of fs.readdirSync(root)) {
  if (/\.(js|css|webmanifest)$/.test(f) && f !== 'jogo-completo.html') copy(f);
}
['index.html', 'icons', 'musicas'].forEach(copy);

let html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
const m = html.match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com[^"]+)">/);
if (m) try {
  const url = m[1].replace(/&amp;/g, '&');
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
  let css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });
  const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map((x) => x[1]))];
  let i = 0;
  for (const u of urls) {
    const name = `f${String(i++).padStart(3, '0')}${path.extname(new URL(u).pathname) || '.woff2'}`;
    fs.writeFileSync(path.join(out, 'fonts', name), Buffer.from(await (await fetch(u)).arrayBuffer()));
    css = css.split(u).join(`${name}`);
  }
  fs.writeFileSync(path.join(out, 'fonts', 'fonts.css'), css);
  html = html.replace(m[0], '<link rel="stylesheet" href="fonts/fonts.css">')
    .replace(/<link rel="preconnect"[^>]*>\s*/g, '');
  console.log(`fontes: ${urls.length} arquivos`);
} catch (e) { console.warn('fontes não baixadas (sem internet?):', e.message); }
// o app não precisa do manifesto de site instalável
html = html.replace(/<link rel="manifest"[^>]*>\s*/, '');
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('www pronto em', out);
