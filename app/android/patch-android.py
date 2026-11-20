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
# tela cheia "imersiva": barra de status e botões do sistema somem e, se aparecerem
# (print, deslizar o dedo, notificação), escondem-se sozinhos de novo
act = os.path.join(A, 'java', 'com', 'pranchetafc', 'jogo', 'MainActivity.java')
open(act, 'w', encoding='utf-8').write("""package com.pranchetafc.jogo;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RadioPlugin.class);
        super.onCreate(savedInstanceState);
        immersive();
    }

    // rádio tocando: a página continua viva com o app em segundo plano ou a tela apagada
    private void keepAlive() {
        if (RadioPlugin.playing && getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().onResume();
            getBridge().getWebView().resumeTimers();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        keepAlive();
    }

    @Override
    public void onStop() {
        super.onStop();
        keepAlive();
    }

    @Override
    public void onResume() {
        super.onResume();
        immersive();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    private void immersive() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }
}
""")
# rádio em segundo plano: serviço de mídia do Android + ponte com o jogo
pkg = os.path.join(A, 'java', 'com', 'pranchetafc', 'jogo')
open(os.path.join(pkg, 'RadioPlugin.java'), 'w', encoding='utf-8').write("""package com.pranchetafc.jogo;

import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PfcRadio")
public class RadioPlugin extends Plugin {
    public static volatile boolean playing = false;

    @PluginMethod
    public void start(PluginCall call) {
        playing = true;
        Intent i = new Intent(getContext(), RadioService.class);
        i.putExtra("title", call.getString("title", "Rádio Prancheta"));
        try { ContextCompat.startForegroundService(getContext(), i); } catch (Exception e) { /* sem serviço: toca só com o app aberto */ }
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        playing = false;
        getContext().stopService(new Intent(getContext(), RadioService.class));
        call.resolve();
    }
}
""")
open(os.path.join(pkg, 'RadioService.java'), 'w', encoding='utf-8').write("""package com.pranchetafc.jogo;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

public class RadioService extends Service {
    private static final String CH = "radio";
    private PowerManager.WakeLock lock;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String title = intent != null && intent.getStringExtra("title") != null ? intent.getStringExtra("title") : "Rádio Prancheta";
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel ch = new NotificationChannel(CH, "Rádio Prancheta", NotificationManager.IMPORTANCE_LOW);
            ch.setShowBadge(false);
            ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(ch);
        }
        Intent open = new Intent(this, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new NotificationCompat.Builder(this, CH)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle("Rádio Prancheta")
            .setContentText(title)
            .setContentIntent(pi)
            .setOngoing(true)
            .setSilent(true)
            .build();
        int type = Build.VERSION.SDK_INT >= 29 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
        ServiceCompat.startForeground(this, 1, n, type);
        if (lock == null) {
            lock = ((PowerManager) getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "PranchetaFC:radio");
            lock.setReferenceCounted(false);
        }
        lock.acquire(6 * 60 * 60 * 1000L);
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        if (lock != null && lock.isHeld()) lock.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
""")
m = open(man, encoding='utf-8').read()
for perm in ['FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_MEDIA_PLAYBACK', 'POST_NOTIFICATIONS', 'WAKE_LOCK']:
    tag = f'<uses-permission android:name="android.permission.{perm}" />'
    if tag not in m:
        m = m.replace('</manifest>', '    ' + tag + '\n</manifest>')
if 'RadioService' not in m:
    m = m.replace('</application>', '        <service android:name=".RadioService" android:exported="false" android:foregroundServiceType="mediaPlayback" />\n    </application>')
open(man, 'w', encoding='utf-8').write(m)
print('android ajustado')
