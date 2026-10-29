package world.nftime.app;

import android.os.Bundle;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import world.nftime.app.core.Api;
import world.nftime.app.core.ArtLoader;
import world.nftime.app.core.RowAdapter;
import world.nftime.app.wallpaper.WallpaperStore;

/** 배경화면 플레이리스트: 작품 추가/삭제, 변경 간격, 재생(라이브 배경화면 적용) */
public class PlaylistActivity extends AppCompatActivity {
    private static final int[] INTERVALS = {1, 5, 15, 30, 60};
    private int playlistId;
    private JSONObject playlist;
    private final RowAdapter adapter = new RowAdapter();
    private boolean bindingIntervals = false;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_playlist);
        playlistId = getIntent().getIntExtra("playlistId", 0);
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
        findViewById(R.id.btnPlay).setOnClickListener(v -> play());
        findViewById(R.id.btnAdd).setOnClickListener(v -> addItem());
        RecyclerView list = findViewById(R.id.list);
        list.setLayoutManager(new LinearLayoutManager(this));
        list.setAdapter(adapter);
        ChipGroup g = findViewById(R.id.intervals);
        for (int m : INTERVALS) {
            Chip c = new Chip(this);
            c.setText(m < 60 ? m + "분" : "1시간");
            c.setCheckable(true);
            c.setId(View.generateViewId());
            c.setTag(m);
            c.setOnCheckedChangeListener((cb, checked) -> { if (checked && !bindingIntervals) updateInterval(m); });
            g.addView(c);
        }
        load(getIntent().getBooleanExtra("autoplay", false));
    }

    private void load(boolean autoplay) {
        Api.get(this, "/api/playlists/" + playlistId, (res, err) -> {
            if (err != null) { Toast.makeText(this, err, Toast.LENGTH_SHORT).show(); return; }
            playlist = res;
            JSONArray items = res.optJSONArray("items");
            int n = items != null ? items.length() : 0;
            ((TextView) findViewById(R.id.name)).setText(res.optString("name"));
            ((TextView) findViewById(R.id.meta)).setText(n + "개 작품 · " + res.optInt("interval_min") + "분마다 변경");
            if (n > 0) ArtLoader.load(findViewById(R.id.cover), items.optJSONObject(0).optString("image"), 720);
            ChipGroup g = findViewById(R.id.intervals);
            bindingIntervals = true;
            for (int i = 0; i < g.getChildCount(); i++) {
                Chip c = (Chip) g.getChildAt(i);
                c.setChecked(((Integer) c.getTag()) == res.optInt("interval_min"));
            }
            bindingIntervals = false;
            List<RowAdapter.Row> rows = new ArrayList<>();
            for (int i = 0; i < n; i++) {
                JSONObject w = items.optJSONObject(i);
                RowAdapter.Row r = new RowAdapter.Row(w.optString("image"), w.optString("title"),
                        w.optString("artist_name") + " · Token #" + w.optInt("token_id"));
                r.trailRes = R.drawable.ic_close;
                r.onTrail = () -> Api.delete(this, "/api/playlists/" + playlistId + "/items/" + w.optInt("nft_id"), (a, e) -> load(false));
                rows.add(r);
            }
            adapter.set(rows);
            findViewById(R.id.empty).setVisibility(n == 0 ? View.VISIBLE : View.GONE);
            if (autoplay) play();
        });
    }

    private void updateInterval(int m) {
        JSONObject body = new JSONObject();
        try { body.put("intervalMin", m); } catch (Exception ignored) { }
        Api.call(this, "PUT", "/api/playlists/" + playlistId, body, (res, err) -> load(false));
    }

    private void play() {
        if (playlist == null) return;
        JSONArray items = playlist.optJSONArray("items");
        if (items == null || items.length() == 0) { Toast.makeText(this, "먼저 작품을 추가해 주세요", Toast.LENGTH_SHORT).show(); return; }
        List<String> urls = new ArrayList<>();
        for (int i = 0; i < items.length(); i++) urls.add(items.optJSONObject(i).optString("image"));
        WallpaperStore.apply(this, playlist.optString("name"), urls, playlist.optInt("interval_min", 15));
    }

    private void addItem() {
        Api.get(this, "/api/my/nfts", (res, err) -> {
            JSONArray arr = res != null ? res.optJSONArray("nfts") : null;
            if (arr == null || arr.length() == 0) { Toast.makeText(this, "보유한 NFT가 없어요", Toast.LENGTH_SHORT).show(); return; }
            String[] names = new String[arr.length()];
            for (int i = 0; i < arr.length(); i++) {
                JSONObject n = arr.optJSONObject(i);
                names[i] = n.optString("title") + "  (#" + n.optInt("token_id") + ")";
            }
            new AlertDialog.Builder(this).setTitle("보유 NFT에서 추가").setItems(names, (d, which) -> {
                JSONObject body = new JSONObject();
                try { body.put("nftId", arr.optJSONObject(which).optInt("nft_id")); } catch (Exception ignored) { }
                Api.post(this, "/api/playlists/" + playlistId + "/items", body, (r2, e2) -> load(false));
            }).show();
        });
    }
}
