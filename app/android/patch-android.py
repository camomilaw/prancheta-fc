# Ajustes no projeto Android gerado pelo Capacitor:
# tela deitada ao abrir, permissões para a pasta Documentos (Android antigo), ícones e versão.
import os, re, sys, subprocess, shutil
ROOT = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(ROOT, 'android', 'app', 'src', 'main')
man = os.path.join(A, 'AndroidManifest.xml')
s = open(man, encoding='utf-8').read()
if 'screenOrientation' not in s:
    s = s.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="sensorLandscape"', 1)
perms = ['<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
         '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />']
for p in perms:
    if p.split('"')[1] not in s:
        s = s.replace('</manifest>', '    ' + p + '\n</manifest>')
if 'requestLegacyExternalStorage' not in s:
    s = s.replace('<application', '<application\n        android:requestLegacyExternalStorage="true"', 1)
open(man, 'w', encoding='utf-8').write(s)

# ícones a partir do ícone do jogo
src = os.path.join(ROOT, 'www', 'icons', 'icon-512.png')
sizes = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
res = os.path.join(A, 'res')
for d, px in sizes.items():
    folder = os.path.join(res, 'mipmap-' + d)
    os.makedirs(folder, exist_ok=True)
    for name in ('ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'):
        subprocess.run(['convert', src, '-resize', f'{px}x{px}', os.path.join(folder, name)], check=True)
shutil.rmtree(os.path.join(res, 'mipmap-anydpi-v26'), ignore_errors=True)

# versão do app (vem do número da compilação)
gradle = os.path.join(ROOT, 'android', 'app', 'build.gradle')
g = open(gradle, encoding='utf-8').read()
code = os.environ.get('VERSION_CODE', '1'); name = os.environ.get('VERSION_NAME', '1.0.0')
g = re.sub(r'versionCode \d+', f'versionCode {code}', g)
g = re.sub(r'versionName "[^"]*"', f'versionName "{name}"', g)
# chave fixa (de teste): assim uma versão nova instala por cima da antiga sem apagar nada
if 'pfc-debug.keystore' not in g:
    g = g.replace('android {', '''android {
    signingConfigs {
        debug {
            storeFile file('../../pfc-debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }''', 1)
open(gradle, 'w', encoding='utf-8').write(g)

# tela inicial do Android com a cor do jogo
colors = os.path.join(res, 'values', 'colors.xml')
if not os.path.exists(colors):
    open(colors, 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>\n')
c = open(colors, encoding='utf-8').read()
if 'pfc_bg' not in c:
    c = c.replace('</resources>', '    <color name="pfc_bg">#16130F</color>\n</resources>')
open(colors, 'w', encoding='utf-8').write(c)
print('android ajustado')
