package world.nftime.app.ui;

import android.content.Intent;
import android.os.Bundle;
import android.text.InputType;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.tabs.TabLayout;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import world.nftime.app.PlaylistActivity;
import world.nftime.app.R;
import world.nftime.app.WorkDetailActivity;
import world.nftime.app.core.Api;
import world.nftime.app.core.Fmt;
import world.nftime.app.core.RowAdapter;
import world.nftime.app.core.Session;
import world.nftime.app.wallpaper.WallpaperStore;

/** 라이브러리: 플레이리스트 / 보유 NFT / 좋아요 */
public class LibraryFragment extends Fragment {
    private final RowAdapter adapter = new RowAdapter();
    private TabLayout tabs;
    private TextView empty;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inf, @Nullable ViewGroup c, @Nullable Bundle b) {
        View v = inf.inflate(R.layout.fragment_library, c, false);
        ((TextView) v.findViewById(R.id.name)).setText(Fmt.shortAddr(Session.address(requireContext())));
        empty = v.findViewById(R.id.empty);
        RecyclerView list = v.findViewById(R.id.list);
        list.setLayoutManager(new LinearLayoutManager(getContext()));
        list.setAdapter(adapter);
        tabs = v.findViewById(R.id.tabs);
        tabs.addTab(tabs.newTab().setText("플레이리스트"));
        tabs.addTab(tabs.newTab().setText("보유 NFT"));
        tabs.addTab(tabs.newTab().setText("좋아요"));
        tabs.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override public void onTabSelected(TabLayout.Tab t) { load(); }
            @Override public void onTabUnselected(TabLayout.Tab t) { }
            @Override public void onTabReselected(TabLayout.Tab t) { load(); }
        });
        return v;
    }

    @Override public void onResume() { super.onResume(); load(); }

    private void load() {
        int t = tabs.getSelectedTabPosition();
        empty.setVisibility(View.GONE);
        if (t == 1) loadOwned(); else if (t == 2) loadLikes(); else loadPlaylists();
    }

    private void showEmpty(String s) { empty.setText(s); empty.setVisibility(View.VISIBLE); }

    private void loadPlaylists() {
        Api.get(requireContext(), "/api/playlists", (res, err) -> {
            if (!isAdded() || tabs.getSelectedTabPosition() != 0) return;
            List<RowAdapter.Row> rows = new ArrayList<>();
            RowAdapter.Row add = new RowAdapter.Row(null, "새로운 리스트 만들기", "보유한 작품으로 배경화면 플레이리스트를 만들어요");
            add.iconRes = R.drawable.ic_add;
            add.onClick = this::createPlaylist;
            rows.add(add);
            JSONArray arr = res != null ? res.optJSONArray("playlists") : null;
            for (int i = 0; arr != null && i < arr.length(); i++) {
                JSONObject p = arr.optJSONObject(i);
                String cover = p.isNull("cover") ? null : p.optString("cover");
                RowAdapter.Row r = new RowAdapter.Row(cover, p.optString("name"),
                        p.optInt("count") + "개 작품 · " + p.optInt("interval_min") + "분마다 변경");
                r.trailRes = R.drawable.ic_play;
                r.onClick = () -> openPlaylist(p.optInt("id"), false);
                r.onTrail = () -> openPlaylist(p.optInt("id"), true);
                rows.add(r);
            }
            adapter.set(rows);
        });
    }

    private void loadOwned() {
        Api.get(requireContext(), "/api/my/nfts", (res, err) -> {
            if (!isAdded() || tabs.getSelectedTabPosition() != 1) return;
            List<RowAdapter.Row> rows = new ArrayList<>();
            JSONArray arr = res != null ? res.optJSONArray("nfts") : null;
            for (int i = 0; arr != null && i < arr.length(); i++) {
                JSONObject n = arr.optJSONObject(i);
                String tid = n.isNull("token_id") ? "발행 중" : "Token #" + n.optInt("token_id");
                RowAdapter.Row r = new RowAdapter.Row(n.optString("image"), n.optString("title"), n.optString("artist_name") + " · " + tid);
                r.trailRes = R.drawable.ic_play;
                r.onClick = () -> openWork(n.optInt("id"));
                r.onTrail = () -> {
                    List<String> one = new ArrayList<>();
                    one.add(n.optString("image"));
                    WallpaperStore.apply(requireActivity(), n.optString("title"), one, 15);
                };
                rows.add(r);
            }
            adapter.set(rows);
            if (rows.isEmpty()) showEmpty("아직 보유한 NFT가 없어요.\n탐색 탭에서 마음에 드는 작품을 찾아보세요.");
        });
    }

    private void loadLikes() {
        Api.get(requireContext(), "/api/my/likes", (res, err) -> {
            if (!isAdded() || tabs.getSelectedTabPosition() != 2) return;
            List<RowAdapter.Row> rows = new ArrayList<>();
            JSONArray arr = res != null ? res.optJSONArray("works") : null;
            for (int i = 0; arr != null && i < arr.length(); i++) {
                JSONObject w = arr.optJSONObject(i);
                RowAdapter.Row r = new RowAdapter.Row(w.optString("image"), w.optString("title"),
                        w.optString("artist_name") + " · " + Fmt.won(w.optInt("price")));
                r.onClick = () -> openWork(w.optInt("id"));
                rows.add(r);
            }
            adapter.set(rows);
            if (rows.isEmpty()) showEmpty("좋아요한 작품이 없어요.");
        });
    }

    private void openWork(int id) {
        Intent i = new Intent(getContext(), WorkDetailActivity.class);
        i.putExtra("workId", id);
        startActivity(i);
    }

    private void openPlaylist(int id, boolean play) {
        Intent i = new Intent(getContext(), PlaylistActivity.class);
        i.putExtra("playlistId", id);
        i.putExtra("autoplay", play);
        startActivity(i);
    }

    private void createPlaylist() {
        EditText et = new EditText(requireContext());
        et.setHint("플레이리스트 이름");
        et.setInputType(InputType.TYPE_CLASS_TEXT);
        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        et.setPadding(pad, pad / 2, pad, pad / 2);
        new AlertDialog.Builder(requireContext())
                .setTitle("새로운 리스트")
                .setView(et)
                .setPositiveButton("만들기", (d, w) -> {
                    JSONObject body = new JSONObject();
                    try { body.put("name", et.getText().toString().trim().isEmpty() ? "배경화면 플리" : et.getText().toString().trim()); }
                    catch (Exception ignored) { }
                    Api.post(requireContext(), "/api/playlists", body, (res, err) -> {
                        if (err != null) { Toast.makeText(getContext(), err, Toast.LENGTH_SHORT).show(); return; }
                        openPlaylist(res.optInt("id"), false);
                    });
                })
                .setNegativeButton("취소", null).show();
    }
}
