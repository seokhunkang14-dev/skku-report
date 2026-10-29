package world.nftime.app.wallpaper;

import android.app.Activity;
import android.app.ProgressDialog;
import android.app.WallpaperInfo;
import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;

import world.nftime.app.core.ArtLoader;

/**
 * 배경화면 플레이리스트 저장소.
 * 작품 파일을 앱 내부 저장소(Internal Storage)에 내려받은 뒤 경로/간격을 저장하고,
 * Android 라이브 배경화면(WallpaperService)을 적용한다.
 */
public final class WallpaperStore {
    static final String PREF = "wallpaper";

    static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    static List<String> files(Context c) {
        String s = prefs(c).getString("files", "");
        List<String> out = new ArrayList<>();
        for (String p : s.split("\n")) if (!p.isEmpty() && new File(p).exists()) out.add(p);
        return out;
    }

    static int intervalMin(Context c) { return prefs(c).getInt("interval", 15); }

    @SuppressWarnings("deprecation")
    public static void apply(Activity a, String name, List<String> urls, int intervalMin) {
        ProgressDialog pd = new ProgressDialog(a);
        pd.setMessage("작품을 내려받는 중…");
        pd.setCancelable(false);
        pd.show();
        Context app = a.getApplicationContext();
        Handler main = new Handler(Looper.getMainLooper());
        Executors.newSingleThreadExecutor().execute(() -> {
            StringBuilder sb = new StringBuilder();
            String error = null;
            for (String u : urls) {
                try { sb.append(ArtLoader.download(app, u).getAbsolutePath()).append('\n'); }
                catch (Exception e) { error = e.getMessage(); }
            }
            final String err = error;
            prefs(app).edit()
                    .putString("files", sb.toString())
                    .putInt("interval", intervalMin)
                    .putString("name", name)
                    .putLong("updated", System.currentTimeMillis())
                    .apply();
            main.post(() -> {
                pd.dismiss();
                if (sb.length() == 0) { Toast.makeText(a, "다운로드 실패: " + err, Toast.LENGTH_LONG).show(); return; }
                launch(a, name);
            });
        });
    }

    static void launch(Activity a, String name) {
        WallpaperInfo info = WallpaperManager.getInstance(a).getWallpaperInfo();
        if (info != null && a.getPackageName().equals(info.getPackageName())) {
            Toast.makeText(a, "'" + name + "' 배경화면으로 변경했어요", Toast.LENGTH_SHORT).show();
            return;
        }
        Intent i = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
        i.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT, new ComponentName(a, NftWallpaperService.class));
        try {
            a.startActivity(i);
            Toast.makeText(a, "'배경화면 설정'을 눌러 적용해 주세요", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            try { a.startActivity(new Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER)); }
            catch (Exception e2) { Toast.makeText(a, "이 기기는 라이브 배경화면을 지원하지 않아요", Toast.LENGTH_LONG).show(); }
        }
    }
}
