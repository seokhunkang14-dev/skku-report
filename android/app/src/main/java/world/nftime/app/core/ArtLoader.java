package world.nftime.app.core;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.os.Handler;
import android.os.Looper;
import android.util.LruCache;
import android.widget.ImageView;

import com.caverock.androidsvg.RenderOptions;
import com.caverock.androidsvg.SVG;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import okhttp3.Request;
import okhttp3.Response;
import world.nftime.app.R;

/**
 * 서버에서 받은 SVG 아트를 내부 저장소에 캐시하고 Bitmap 으로 렌더링한다.
 * (NFT 이미지는 1080x1920 세로형 SVG)
 */
public final class ArtLoader {
    public static final int ART_W = 1080, ART_H = 1920;
    private static final LruCache<String, Bitmap> mem = new LruCache<String, Bitmap>(48 * 1024 * 1024) {
        @Override protected int sizeOf(String k, Bitmap b) { return b.getByteCount(); }
    };
    private static final ExecutorService pool = Executors.newFixedThreadPool(3);
    private static final Handler main = new Handler(Looper.getMainLooper());

    public static File artFile(Context c, String url) {
        File dir = new File(c.getFilesDir(), "art");
        if (!dir.exists()) dir.mkdirs();
        return new File(dir, Integer.toHexString(url.hashCode()) + ".svg");
    }

    /** 내부 저장소에 SVG 를 다운로드 (이미 있으면 그대로 사용) */
    public static File download(Context c, String url) throws Exception {
        File f = artFile(c, url);
        if (f.exists() && f.length() > 0) return f;
        Request req = new Request.Builder().url(url).build();
        try (Response r = Api.http().newCall(req).execute()) {
            if (!r.isSuccessful() || r.body() == null) throw new Exception("HTTP " + r.code());
            byte[] data = r.body().bytes();
            File tmp = new File(f.getPath() + ".tmp");
            try (FileOutputStream out = new FileOutputStream(tmp)) { out.write(data); }
            tmp.renameTo(f);
        }
        return f;
    }

    /** SVG 파일을 width 기준으로 렌더링 (세로 비율 유지) */
    public static Bitmap render(File f, int width) throws Exception {
        byte[] bytes = java.nio.file.Files.readAllBytes(f.toPath());
        SVG svg = SVG.getFromString(new String(bytes, StandardCharsets.UTF_8));
        int w = Math.max(64, width);
        int h = Math.round(w * (ART_H / (float) ART_W));
        Bitmap bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);
        svg.renderToCanvas(canvas, RenderOptions.create().viewPort(0, 0, w, h));
        return bmp;
    }

    public static void load(ImageView iv, String url, int width) {
        if (url == null) return;
        final String key = url + "@" + width;
        iv.setTag(R.id.tag_art_url, key);
        Bitmap cached = mem.get(key);
        if (cached != null) { iv.setImageBitmap(cached); return; }
        iv.setImageDrawable(null);
        final Context app = iv.getContext().getApplicationContext();
        pool.execute(() -> {
            try {
                File f = download(app, url);
                Bitmap b = render(f, width);
                mem.put(key, b);
                main.post(() -> {
                    if (key.equals(iv.getTag(R.id.tag_art_url))) iv.setImageBitmap(b);
                });
            } catch (Exception ignored) { }
        });
    }
}
