package io.github.qwekurasa.kesh;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;

// Оболочка над PWA: данные живут внутри WebView (IndexedDB, localStorage)
public class MainActivity extends Activity {
    private static final String URL = "https://qwekurasa.github.io/kesh/";
    private static final String HOST = "qwekurasa.github.io";
    private static final int PICK = 1;
    private WebView web;
    private ValueCallback<Uri[]> pick;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(0xFF09090A);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        web.addJavascriptInterface(new Bridge(), "KeshAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (pick != null) pick.onReceiveValue(null);
                pick = cb;
                try { startActivityForResult(p.createIntent(), PICK); } catch (Exception e) { pick = null; return false; }
                return true;
            }
        });
        setContentView(web);
        if (state != null) web.restoreState(state); else web.loadUrl(URL);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == PICK && pick != null) {
            pick.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            pick = null;
        } else super.onActivityResult(req, res, data);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.keshBack ? window.keshBack() : false", (r) -> {
            if (!"true".equals(r)) moveTaskToBack(true);
        });
    }

    // Резервная копия и Excel: веб-код передаёт файл, показываем «Поделиться»
    private class Bridge {
        @JavascriptInterface
        public void share(String name, String mime, String b64) {
            try {
                File dir = new File(getCacheDir(), "share");
                dir.mkdirs();
                File f = new File(dir, new File(name).getName());
                try (FileOutputStream o = new FileOutputStream(f)) { o.write(Base64.decode(b64, Base64.DEFAULT)); }
                Uri u = FileProvider.getUriForFile(MainActivity.this, "io.github.qwekurasa.kesh.files", f);
                Intent i = new Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM, u)
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                runOnUiThread(() -> startActivity(Intent.createChooser(i, name)));
            } catch (Exception ignored) {}
        }
    }
}
