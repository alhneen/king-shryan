
package com.kingshryan.music;

import android.Manifest;
import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.content.pm.PackageManager;
import android.content.res.AssetFileDescriptor;
import android.database.Cursor;
import android.net.Uri;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.InputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {

    private WebView webView;
    private static final int MUSIC_PERMISSION = 100;
    private static final String MUSIC_HOST = "king-shryan.local";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient() {

            @Override
            public WebResourceResponse shouldInterceptRequest(
                    WebView view, WebResourceRequest request) {
                return handleMusicRequest(
                    request.getUrl(),
                    request.getRequestHeaders().get("Range")
                );
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(
                    WebView view, String url) {
                return handleMusicRequest(Uri.parse(url), null);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);

                if (hasMusicPermission()) {
                    sendMusicToPage();
                }
            }
        });

        webView.addJavascriptInterface(new MusicBridge(), "AndroidMusic");

        webView.loadUrl("https://alhneen.github.io/king-shryan/");
    }

    private boolean hasMusicPermission() {
        return checkSelfPermission(musicPermission())
                == PackageManager.PERMISSION_GRANTED;
    }

    private String musicPermission() {
        if (Build.VERSION.SDK_INT >= 33) {
            return Manifest.permission.READ_MEDIA_AUDIO;
        }
        return Manifest.permission.READ_EXTERNAL_STORAGE;
    }

    private WebResourceResponse handleMusicRequest(
            Uri uri, String rangeHeader) {

        if (!MUSIC_HOST.equals(uri.getHost())) {
            return null;
        }

        AssetFileDescriptor afd = null;

        try {
            long id = Long.parseLong(uri.getLastPathSegment());

            Uri musicUri = Uri.withAppendedPath(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                String.valueOf(id)
            );

            afd = getContentResolver().openAssetFileDescriptor(
                musicUri, "r"
            );

            if (afd == null) return null;

            long fileSize = afd.getLength();

            
            
            if (fileSize < 0) {
    fileSize = afd.getParcelFileDescriptor().getStatSize();
            }

            long start = 0;
            long end = fileSize - 1;
            boolean partial = false;

            if (rangeHeader != null && fileSize > 0) {
                try {
                    String value = rangeHeader.replace("bytes=", "").trim();
                    String[] parts = value.split("-", 2);

                    if (parts.length == 2) {
                        if (parts[0].isEmpty()) {
                            long suffix = Long.parseLong(parts[1]);
                            start = Math.max(0, fileSize - suffix);
                        } else {
                            start = Long.parseLong(parts[0]);
                        }

                        if (!parts[1].isEmpty() && !parts[0].isEmpty()) {
                            end = Math.min(
                                Long.parseLong(parts[1]),
                                fileSize - 1
                            );
                        }

                        if (start > end || start >= fileSize) {
                            afd.close();
                            return new WebResourceResponse(
                                "text/plain", null, 416,
                                "Range Not Satisfiable",
                                new HashMap<String, String>(),
                                null
                            );
                        }

                        partial = true;
                    }
                } catch (Exception ignored) {
                    start = 0;
                    end = fileSize - 1;
                    partial = false;
                }
            }

            InputStream stream = afd.createInputStream();

            long skipped = 0;
            while (skipped < start) {
                long count = stream.skip(start - skipped);
                if (count <= 0) break;
                skipped += count;
            }

            String mime = getContentResolver().getType(musicUri);
            if (mime == null) mime = "audio/mpeg";

            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Accept-Ranges", "bytes");
            headers.put("Cache-Control", "no-cache");

            if (fileSize > 0) {
                long length = end - start + 1;
                headers.put("Content-Length", String.valueOf(length));

                if (partial) {
                    headers.put(
                        "Content-Range",
                        "bytes " + start + "-" + end + "/" + fileSize
                    );
                }
            }

            if (partial) {
                return new WebResourceResponse(
                    mime, null, 206, "Partial Content",
                    headers, stream
                );
            }

            return new WebResourceResponse(
                mime, null, 200, "OK", headers, stream
            );

        } catch (Exception e) {
            try {
                if (afd != null) afd.close();
            } catch (Exception ignored) {
            }
            return null;
        }
    }

    public class MusicBridge {

        @JavascriptInterface
        public void requestMusicPermission() {
            runOnUiThread(() -> {
                if (!hasMusicPermission()) {
                    requestPermissions(
                        new String[]{musicPermission()},
                        MUSIC_PERMISSION
                    );
                } else {
                    sendMusicToPage();
                }
            });
        }

        @JavascriptInterface
        public String getMusic() {
            if (!hasMusicPermission()) return "[]";

            JSONArray songs = new JSONArray();

            String[] projection = {
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.ARTIST
            };

            try (Cursor cursor = getContentResolver().query(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    projection,
                    MediaStore.Audio.Media.IS_MUSIC + " != 0",
                    null,
                    MediaStore.Audio.Media.TITLE + " ASC")) {

                if (cursor != null) {
                    while (cursor.moveToNext()) {
                        long id = cursor.getLong(0);

                        JSONObject song = new JSONObject();
                        song.put("id", id);
                        song.put("title", cursor.getString(1));
                        song.put("artist", cursor.getString(2));
                        song.put(
                            "url",
                            "https://" + MUSIC_HOST + "/music/" + id
                        );

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
        if (webView == null) return;

        webView.post(() -> webView.evaluateJavascript(
            "if(window.onNativeMusicPermission){" +
            "window.onNativeMusicPermission();}",
            null
        ));
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
