package world.nftime.app.wallpaper;

import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.os.Handler;
import android.os.HandlerThread;
import android.service.wallpaper.WallpaperService;
import android.view.SurfaceHolder;

import java.io.File;
import java.util.List;

import world.nftime.app.core.ArtLoader;

/**
 * NFT 라이브 배경화면.
 * 앱이 종료되어도 시스템이 백그라운드로 실행하며, 플레이리스트의 작품을 설정된 간격마다 크로스페이드로 전환한다.
 */
public class NftWallpaperService extends WallpaperService {
    @Override
    public Engine onCreateEngine() { return new ArtEngine(); }

    class ArtEngine extends Engine implements SharedPreferences.OnSharedPreferenceChangeListener {
        private HandlerThread thread;
        private Handler handler;
        private boolean visible;
        private int width = 1080, height = 1920;
        private int shownIndex = -1;
        private String shownPath;
        private Bitmap current, previous;
        private long fadeStart;
        private static final long FADE_MS = 900;
        private final Paint paint = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.ANTI_ALIAS_FLAG);

        private final Runnable tick = new Runnable() {
            @Override public void run() {
                if (!visible) return;
                checkAdvance();
                handler.postDelayed(this, 5000);
            }
        };
        private final Runnable fade = new Runnable() {
            @Override public void run() {
                draw();
                if (System.currentTimeMillis() - fadeStart < FADE_MS) handler.postDelayed(this, 16);
            }
        };

        @Override
        public void onCreate(SurfaceHolder holder) {
            super.onCreate(holder);
            thread = new HandlerThread("nft-wallpaper");
            thread.start();
            handler = new Handler(thread.getLooper());
            WallpaperStore.prefs(NftWallpaperService.this).registerOnSharedPreferenceChangeListener(this);
        }

        @Override
        public void onDestroy() {
            WallpaperStore.prefs(NftWallpaperService.this).unregisterOnSharedPreferenceChangeListener(this);
            handler.removeCallbacksAndMessages(null);
            thread.quitSafely();
            super.onDestroy();
        }

        @Override
        public void onSurfaceChanged(SurfaceHolder holder, int format, int w, int h) {
            super.onSurfaceChanged(holder, format, w, h);
            width = w; height = h;
            handler.post(() -> { shownPath = null; checkAdvance(); draw(); });
        }

        @Override
        public void onVisibilityChanged(boolean v) {
            visible = v;
            handler.removeCallbacks(tick);
            if (v) handler.post(tick);
        }

        @Override
        public void onSharedPreferenceChanged(SharedPreferences sp, String key) {
            handler.post(() -> { shownPath = null; checkAdvance(); });
        }

        /** 현재 시각 기준으로 보여줄 작품 인덱스를 계산해 바뀌었으면 전환 */
        private void checkAdvance() {
            List<String> files = WallpaperStore.files(NftWallpaperService.this);
            if (files.isEmpty()) { draw(); return; }
            long intervalMs = Math.max(1, WallpaperStore.intervalMin(NftWallpaperService.this)) * 60_000L;
            int idx = (int) ((System.currentTimeMillis() / intervalMs) % files.size());
            String path = files.get(idx);
            if (path.equals(shownPath) && current != null) return;
            try {
                Bitmap b = ArtLoader.render(new File(path), Math.min(width, 1440));
                previous = current;
                current = b;
                shownIndex = idx;
                shownPath = path;
                fadeStart = System.currentTimeMillis();
                handler.removeCallbacks(fade);
                handler.post(fade);
            } catch (Exception e) {
                draw();
            }
        }

        private void drawCover(Canvas c, Bitmap b, int alpha) {
            float scale = Math.max(width / (float) b.getWidth(), height / (float) b.getHeight());
            int sw = Math.round(width / scale), sh = Math.round(height / scale);
            int sx = (b.getWidth() - sw) / 2, sy = (b.getHeight() - sh) / 2;
            paint.setAlpha(alpha);
            c.drawBitmap(b, new Rect(sx, sy, sx + sw, sy + sh), new Rect(0, 0, width, height), paint);
        }

        private void draw() {
            SurfaceHolder h = getSurfaceHolder();
            Canvas c = null;
            try {
                c = h.lockCanvas();
                if (c == null) return;
                c.drawColor(Color.BLACK);
                float t = Math.min(1f, (System.currentTimeMillis() - fadeStart) / (float) FADE_MS);
                if (previous != null && t < 1f) drawCover(c, previous, 255);
                if (current != null) drawCover(c, current, Math.round(255 * t));
                if (current == null) {
                    Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
                    p.setColor(Color.WHITE);
                    p.setTextSize(42);
                    p.setTextAlign(Paint.Align.CENTER);
                    c.drawText("NFTime 앱에서 작품을 선택하세요", width / 2f, height / 2f, p);
                }
            } finally {
                if (c != null) h.unlockCanvasAndPost(c);
            }
        }
    }
}
