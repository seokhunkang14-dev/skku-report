package world.nftime.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import world.nftime.app.core.ArtLoader;
import world.nftime.app.core.Fmt;
import world.nftime.app.core.Session;
import world.nftime.app.wallpaper.WallpaperStore;

/** 결제 완료 → NFT 발행 결과 */
public class MintResultActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_mint_result);
        JSONObject r;
        try { r = new JSONObject(getIntent().getStringExtra("result")); } catch (Exception e) { r = new JSONObject(); }
        JSONObject w = r.optJSONObject("work");
        if (w == null) w = new JSONObject();
        final JSONObject work = w;
        final JSONObject res = r;
        ArtLoader.load(findViewById(R.id.art), work.optString("image"), 420);

        String status = r.optString("status");
        boolean minted = "MINTED".equals(status);
        ((TextView) findViewById(R.id.headline)).setText(minted
                ? "구매하신 NFT가\n지갑으로 발행되었어요"
                : "결제가 완료되었어요\nNFT를 발행하고 있어요");
        ((TextView) findViewById(R.id.subline)).setText(work.optString("title") + " · " + work.optString("artist_name"));

        String tokenId = r.isNull("tokenId") ? "확인 중" : "#" + r.optInt("tokenId");
        String d = "주문번호   " + r.optString("orderId") + "\n"
                + "결제금액   " + Fmt.won(work.optInt("price")) + "\n"
                + "네트워크   Kaia Kairos (1001)\n"
                + "컨트랙트   " + Fmt.shortAddr(r.optString("contract")) + "\n"
                + "Token ID   " + tokenId + "\n"
                + "받는 지갑  " + Fmt.shortAddr(Session.address(this)) + "\n"
                + "Tx Hash    " + Fmt.shortAddr(r.optString("txHash"));
        ((TextView) findViewById(R.id.details)).setText(d);

        findViewById(R.id.btnExplorer).setOnClickListener(v -> {
            String url = res.optString("explorerTx", "");
            if (!url.isEmpty()) startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
        });
        findViewById(R.id.btnWallpaper).setOnClickListener(v -> {
            List<String> one = new ArrayList<>();
            one.add(work.optString("image"));
            WallpaperStore.apply(this, work.optString("title"), one, 15);
        });
        findViewById(R.id.btnDone).setOnClickListener(v -> {
            Intent i = new Intent(this, MainActivity.class);
            i.putExtra("tab", "library");
            i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(i);
            finish();
        });
    }
}
