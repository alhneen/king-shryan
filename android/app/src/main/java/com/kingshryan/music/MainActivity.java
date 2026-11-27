
package com.kingshryan.music;

import android.Manifest;
import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import org.json.JSONArray;
import org.json.JSONObject;

public class MainActivity extends Activity {

    private WebView webView;
    private static final int MUSIC_PERMISSION = 100;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);

        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new MusicBridge(), "AndroidMusic");

        webView.loadUrl("https://alhneen.github.io/king-shryan/");
    }

    private String musicPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            return Manifest.permission.READ_MEDIA_AUDIO;
        }
        return Manifest.permission.READ_EXTERNAL_STORAGE;
    }

    public class MusicBridge {

        @JavascriptInterface
        public void requestMusicPermission() {
            runOnUiThread(() -> {
                String permission = musicPermission();

                if (checkSelfPermission(permission)
                        != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(
                        new String[]{permission},
                        MUSIC_PERMISSION
                    );
                } else {
                    sendMusicToPage();
                }
            });
        }

        @JavascriptInterface
        public String getMusic() {
            if (checkSelfPermission(musicPermission())
                    != PackageManager.PERMISSION_GRANTED) {
                return "[]";
            }

            JSONArray songs = new JSONArray();

            String[] projection = {
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST
            };

            try (Cursor cursor = getContentResolver().query(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    projection,
                    MediaStore.Audio.Media.IS_MUSIC + "!= 0",
                    null,
                    MediaStore.Audio.Media.TITLE + " ASC")) {

                if (cursor != null) {
                    while (cursor.moveToNext()) {
                        JSONObject song = new JSONObject();

                        long id = cursor.getLong(0);
                        song.put("id", id);
                        song.put("title", cursor.getString(1));
                        song.put("artist", cursor.getString(2));
                        song.put("url",
                            "content://media/external/audio/media/" + id);

                        songs.put(song);
                    }
                }
            } catch (Exception e) {
                return "[]";
            }

            return songs.toString();
        }
    }

    private void sendMusicToPage() {
        webView.evaluateJavascript(
            "if(window.onNativeMusicPermission){window.onNativeMusicPermission();}",
            null
        );
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            String[] permissions,
            int[] grantResults) {
        super.onRequestPermissionsResult(
            requestCode, permissions, grantResults
        );

        if (requestCode == MUSIC_PERMISSION
                && grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            sendMusicToPage();
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
