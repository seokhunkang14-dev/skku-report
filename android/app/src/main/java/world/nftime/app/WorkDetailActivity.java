package world.nftime.app;

import android.app.ProgressDialog;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.ImageView;
import android.widget.RadioGroup;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.bottomsheet.BottomSheetDialog;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import world.nftime.app.core.Api;
import world.nftime.app.core.ArtLoader;
import world.nftime.app.core.Fmt;
import world.nftime.app.core.Session;
import world.nftime.app.core.WorkAdapter;
import world.nftime.app.wallpaper.WallpaperStore;

/** 작품 상세: 정보 / 좋아요 / 원화 결제 → NFT 발행 / 배경화면 설정 / 리스트 담기 */
public class WorkDetailActivity extends AppCompatActivity {
    private int workId;
    private JSONObject work;
    private boolean liked;
    private int ownedNftId = -1;
    private final WorkAdapter moreAdapter = new WorkAdapter(R.layout.item_work_h, false);

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_work_detail);
        workId = getIntent().getIntExtra("workId", 1);
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
        findViewById(R.id.btnLike).setOnClickListener(v -> toggleLike());
        findViewById(R.id.btnBuy).setOnClickListener(v -> showPayment());
        findViewById(R.id.btnWallpaper).setOnClickListener(v -> setWallpaper());
        findViewById(R.id.btnAddList).setOnClickListener(v -> addToPlaylist());
        RecyclerView more = findViewById(R.id.more);
        more.setLayoutManager(new LinearLayoutManager(this, RecyclerView.HORIZONTAL, false));
        more.setAdapter(moreAdapter);
        load();
    }

    @Override protected void onResume() { super.onResume(); if (work != null) load(); }

    private void load() {
        Api.get(this, "/api/works/" + workId, (res, err) -> {
            if (err != null) { Toast.makeText(this, err, Toast.LENGTH_SHORT).show(); return; }
            work = res;
            bind();
            if (getIntent().getBooleanExtra("openPay", false)) { getIntent().removeExtra("openPay"); showPayment(); }
        });
        Api.get(this, "/api/my/nfts", (res, err) -> {
            if (res == null) return;
            JSONArray arr = res.optJSONArray("nfts");
            for (int i = 0; arr != null && i < arr.length(); i++) {
                JSONObject n = arr.optJSONObject(i);
                if (n.optInt("id") == workId) { ownedNftId = n.optInt("nft_id"); break; }
            }
        });
    }

    private void bind() {
        ImageView hero = findViewById(R.id.hero);
        ArtLoader.load(hero, work.optString("image"), 720);
        ((TextView) findViewById(R.id.artist)).setText(work.optString("artist_name") + "  ›");
        findViewById(R.id.artist).setOnClickListener(v -> {
            Intent i = new Intent(this, ArtistActivity.class);
            i.putExtra("artistId", work.optInt("artist_id"));
            startActivity(i);
        });
        ((TextView) findViewById(R.id.title)).setText(work.optString("title"));
        ((TextView) findViewById(R.id.desc)).setText(work.optString("description"));
        ((TextView) findViewById(R.id.price)).setText(Fmt.won(work.optInt("price")));
        String info = "에디션        " + work.optInt("edition") + "개 중 " + work.optInt("minted") + "개 발행\n"
                + "네트워크      Kaia Kairos (KIP-17 / ERC-721)\n"
                + "결제 방식     원화 결제 → 내 지갑으로 즉시 발행\n"
                + "좋아요        " + work.optInt("likes");
        ((TextView) findViewById(R.id.info)).setText(info);
        liked = work.optBoolean("liked");
        ((ImageView) findViewById(R.id.btnLike)).setColorFilter(
                ContextCompat.getColor(this, liked ? R.color.danger : R.color.text3));
        int owned = work.optInt("owned");
        TextView badge = findViewById(R.id.ownedBadge);
        badge.setVisibility(owned > 0 ? View.VISIBLE : View.GONE);
        badge.setText("✓ 보유 중인 작품 (" + owned + ")");
        findViewById(R.id.ownBar).setVisibility(owned > 0 ? View.VISIBLE : View.GONE);
        findViewById(R.id.buyBar).setVisibility(owned > 0 ? View.GONE : View.VISIBLE);
        boolean soldOut = work.optInt("remaining") <= 0;
        findViewById(R.id.btnBuy).setEnabled(!soldOut);
        ((TextView) findViewById(R.id.btnBuy)).setText(soldOut ? "SOLD OUT" : "작품 구매하기");
        JSONArray more = work.optJSONArray("moreFromArtist");
        moreAdapter.set(more);
        findViewById(R.id.moreTitle).setVisibility(more != null && more.length() > 0 ? View.VISIBLE : View.GONE);
    }

    private void toggleLike() {
        Api.post(this, "/api/likes/" + workId, null, (res, err) -> {
            if (res == null) return;
            liked = res.optBoolean("liked");
            ((ImageView) findViewById(R.id.btnLike)).setColorFilter(
                    ContextCompat.getColor(this, liked ? R.color.danger : R.color.text3));
            Toast.makeText(this, liked ? "좋아요한 작품에 추가했어요" : "좋아요를 취소했어요", Toast.LENGTH_SHORT).show();
        });
    }

    // ---------- 원화 결제 (모의 PG) ----------
    private void showPayment() {
        if (work == null) return;
        BottomSheetDialog sheet = new BottomSheetDialog(this);
        View v = getLayoutInflater().inflate(R.layout.sheet_payment, null);
        sheet.setContentView(v);
        ArtLoader.load(v.findViewById(R.id.thumb), work.optString("image"), 160);
        ((TextView) v.findViewById(R.id.pTitle)).setText(work.optString("title"));
        ((TextView) v.findViewById(R.id.pArtist)).setText(work.optString("artist_name"));
        int price = work.optInt("price");
        ((TextView) v.findViewById(R.id.summary)).setText(
                "작품 가격                      " + Fmt.won(price) + "\n"
                        + "NFT 발행 수수료 (가스비)   0원 (NFTime 부담)\n"
                        + "총 결제금액                  " + Fmt.won(price));
        ((TextView) v.findViewById(R.id.notice)).setText(
                "결제가 완료되면 연결된 지갑 " + Fmt.shortAddr(Session.address(this)) + " 으로 NFT가 바로 발행됩니다. (테스트 결제 · 실제 청구 없음)");
        ((TextView) v.findViewById(R.id.btnPay)).setText(Fmt.won(price) + " 결제하기");
        v.findViewById(R.id.btnPay).setOnClickListener(x -> {
            RadioGroup g = v.findViewById(R.id.methods);
            int id = g.getCheckedRadioButtonId();
            String method = id == R.id.mKakao ? "KAKAOPAY" : id == R.id.mNaver ? "NAVERPAY" : id == R.id.mToss ? "TOSSPAY" : "CARD";
            sheet.dismiss();
            purchase(method);
        });
        sheet.show();
    }

    @SuppressWarnings("deprecation")
    private void purchase(String method) {
        ProgressDialog pd = new ProgressDialog(this);
        pd.setCancelable(false);
        pd.setMessage("결제를 승인하고 있어요…");
        pd.show();
        Handler h = new Handler(Looper.getMainLooper());
        h.postDelayed(() -> pd.setMessage("Kaia 네트워크에 NFT를 발행하고 있어요…"), 900);
        JSONObject body = new JSONObject();
        try { body.put("workId", workId); body.put("method", method); } catch (Exception ignored) { }
        Api.post(this, "/api/purchase", body, (res, err) -> {
            h.removeCallbacksAndMessages(null);
            pd.dismiss();
            if (err != null && (res == null || !res.has("orderId"))) {
                Toast.makeText(this, "구매 실패: " + err, Toast.LENGTH_LONG).show();
                return;
            }
            Intent i = new Intent(this, MintResultActivity.class);
            i.putExtra("result", res.toString());
            startActivity(i);
        });
    }

    private void setWallpaper() {
        List<String> one = new ArrayList<>();
        one.add(work.optString("image"));
        WallpaperStore.apply(this, work.optString("title"), one, 15);
    }

    private void addToPlaylist() {
        if (ownedNftId < 0) { Toast.makeText(this, "보유 정보를 불러오는 중이에요", Toast.LENGTH_SHORT).show(); return; }
        Api.get(this, "/api/playlists", (res, err) -> {
            JSONArray arr = res != null ? res.optJSONArray("playlists") : null;
            if (arr == null || arr.length() == 0) {
                Toast.makeText(this, "라이브러리에서 플레이리스트를 먼저 만들어 주세요", Toast.LENGTH_SHORT).show();
                return;
            }
            String[] names = new String[arr.length()];
            for (int i = 0; i < arr.length(); i++) names[i] = arr.optJSONObject(i).optString("name");
            new AlertDialog.Builder(this).setTitle("리스트 담기").setItems(names, (d, which) -> {
                JSONObject body = new JSONObject();
                try { body.put("nftId", ownedNftId); } catch (Exception ignored) { }
                Api.post(this, "/api/playlists/" + arr.optJSONObject(which).optInt("id") + "/items", body, (r2, e2) ->
                        Toast.makeText(this, e2 == null ? "'" + names[which] + "'에 담았어요" : e2, Toast.LENGTH_SHORT).show());
            }).show();
        });
    }
}
