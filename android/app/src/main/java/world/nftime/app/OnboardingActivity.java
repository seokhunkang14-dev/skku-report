package world.nftime.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONObject;

import world.nftime.app.core.Api;
import world.nftime.app.core.ArtLoader;
import world.nftime.app.core.Session;

/**
 * 온보딩 + 지갑 연결.
 * 1) 서버에 인증 세션 생성  2) MetaMask 딥링크로 지갑 앱의 브라우저에서 /connect 페이지 실행
 * 3) 사용자가 지갑 연결 + 서명  4) nftime://auth 로 복귀하거나, 앱이 세션 상태를 폴링해 로그인 완료
 */
public class OnboardingActivity extends AppCompatActivity {
    private TextView status;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private int polls = 0;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        // 테스트 자동화용: 토큰 주입
        String injected = getIntent().getStringExtra("demo_token");
        if (injected != null) {
            Session.save(this, injected, getIntent().getStringExtra("demo_address"), "MetaMask");
        }
        if (Session.loggedIn(this)) { goMain(); return; }

        setContentView(R.layout.activity_onboarding);
        status = findViewById(R.id.status);
        ImageView hero = findViewById(R.id.hero);
        hero.post(() -> ArtLoader.load(hero, Api.BASE + "/art/1.jpg", Math.max(540, hero.getWidth() / 2)));

        findViewById(R.id.btnConnect).setOnClickListener(v -> startConnect());
        findViewById(R.id.btnDemo).setOnClickListener(v -> demoLogin());
        handleDeepLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleDeepLink(intent);
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (Session.pendingAuth(this) != null && !Session.loggedIn(this)) { polls = 0; poll(); }
    }

    private void handleDeepLink(Intent i) {
        Uri d = i != null ? i.getData() : null;
        if (d != null && "nftime".equals(d.getScheme())) {
            String s = d.getQueryParameter("s");
            if (s != null) { Session.pendingAuth(this, s); polls = 0; poll(); }
        }
    }

    private boolean metamaskInstalled() {
        try { getPackageManager().getPackageInfo("io.metamask", 0); return true; }
        catch (PackageManager.NameNotFoundException e) { return false; }
    }

    private void startConnect() {
        if (!metamaskInstalled()) {
            new AlertDialog.Builder(this)
                    .setTitle("MetaMask 앱이 필요해요")
                    .setMessage("NFT를 보관할 지갑으로 MetaMask를 사용합니다. 설치 후 지갑을 만들고 다시 시도해 주세요.")
                    .setPositiveButton("설치하기", (d, w) -> startActivity(new Intent(Intent.ACTION_VIEW,
                            Uri.parse("https://play.google.com/store/apps/details?id=io.metamask"))))
                    .setNegativeButton("취소", null).show();
            return;
        }
        showStatus("지갑 연결 요청을 준비하고 있어요…");
        Api.post(this, "/api/auth/request", new JSONObject(), (res, err) -> {
            if (err != null) { showStatus("오류: " + err); return; }
            Session.pendingAuth(this, res.optString("session"));
            showStatus("MetaMask에서 연결과 서명을 완료한 뒤 돌아와 주세요.");
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(res.optString("metamaskDeeplink")));
            i.setPackage("io.metamask");
            try { startActivity(i); }
            catch (Exception e) {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(res.optString("metamaskDeeplink"))));
            }
        });
    }

    private void poll() {
        String s = Session.pendingAuth(this);
        if (s == null || polls++ > 40) return;
        Api.get(this, "/api/auth/session/" + s, (res, err) -> {
            if (res != null && "DONE".equals(res.optString("status"))) {
                Session.save(this, res.optString("token"), res.optString("address"), "MetaMask");
                Session.pendingAuth(this, null);
                Toast.makeText(this, "지갑이 연결되었어요", Toast.LENGTH_SHORT).show();
                goMain();
            } else {
                handler.postDelayed(this::poll, 1500);
            }
        });
    }

    private void demoLogin() {
        showStatus("테스트 계정을 만드는 중…");
        Api.post(this, "/api/auth/demo", new JSONObject(), (res, err) -> {
            if (err != null) { showStatus("오류: " + err); return; }
            Session.save(this, res.optString("token"), res.optString("address"), "Demo");
            goMain();
        });
    }

    private void showStatus(String s) { status.setVisibility(View.VISIBLE); status.setText(s); }

    private void goMain() {
        Intent i = new Intent(this, MainActivity.class);
        if (getIntent().hasExtra("tab")) i.putExtra("tab", getIntent().getStringExtra("tab"));
        startActivity(i);
        finish();
    }

    @Override protected void onDestroy() { handler.removeCallbacksAndMessages(null); super.onDestroy(); }
}
