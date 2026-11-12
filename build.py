"""Junta CSS e JS num único arquivo (dist/prancheta-fc.html).
Uso: python3 build.py   (opcional: --artifact gera a versão sem <html>/<head>/<body>)"""
import re, sys, pathlib
root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'style.css').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')
def inline(m):
    js = (root / m.group(1)).read_text(encoding='utf-8')
    return '<script>\n' + js.replace('</script', '<\\/script') + '\n</script>'
html = re.sub(r'<script src="([^"/]+\.js)"></script>', inline, html)
out = root
(out / 'jogo-completo.html').write_text(html, encoding='utf-8')
if '--artifact' in sys.argv:
    head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
    head = re.sub(r'<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*', '', head)
    body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)
    (out / 'artifact.html').write_text(head.strip() + '\n' + body.strip() + '\n', encoding='utf-8')
print('ok')
