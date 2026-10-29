package world.nftime.app.ui;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import world.nftime.app.OnboardingActivity;
import world.nftime.app.R;
import world.nftime.app.core.Api;
import world.nftime.app.core.Fmt;
import world.nftime.app.core.Session;

/** 마이페이지: 지갑 정보, 보유/좋아요 수, 네트워크 정보 */
public class MyFragment extends Fragment {
    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inf, @Nullable ViewGroup c, @Nullable Bundle b) {
        View v = inf.inflate(R.layout.fragment_my, c, false);
        String addr = Session.address(requireContext());
        ((TextView) v.findViewById(R.id.addr)).setText(addr);
        v.findViewById(R.id.btnExplorer).setOnClickListener(x ->
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://kairos.kaiascan.io/account/" + addr))));
        v.findViewById(R.id.btnLogout).setOnClickListener(x -> {
            Session.clear(requireContext());
            Intent i = new Intent(getContext(), OnboardingActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(i);
        });
        Api.get(requireContext(), "/api/me", (res, err) -> {
            if (!isAdded() || res == null) return;
            ((TextView) v.findViewById(R.id.nick)).setText(res.optString("nickname"));
            ((TextView) v.findViewById(R.id.owned)).setText(String.valueOf(res.optInt("owned")));
            ((TextView) v.findViewById(R.id.liked)).setText(String.valueOf(res.optInt("liked")));
        });
        Api.get(requireContext(), "/api/chain/status", (res, err) -> {
            if (!isAdded() || res == null) return;
            String s = "지갑: " + Session.wallet(requireContext()) + " (" + Fmt.shortAddr(addr) + ")\n"
                    + "네트워크: " + res.optString("network") + " · Chain ID " + res.optInt("chainId") + "\n"
                    + "NFT 컨트랙트: " + Fmt.shortAddr(res.optString("contract")) + "\n"
                    + "가스비: 서비스가 부담 (구매자는 원화 결제만)";
            ((TextView) v.findViewById(R.id.chainInfo)).setText(s);
        });
        return v;
    }
}
