package world.nftime.app.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import org.json.JSONArray;
import org.json.JSONObject;

import world.nftime.app.ArtistActivity;
import world.nftime.app.R;
import world.nftime.app.WorkDetailActivity;
import world.nftime.app.core.Api;
import world.nftime.app.core.ArtLoader;
import world.nftime.app.core.WorkAdapter;

/** 홈: 오늘의 큐레이션 + 신규/인기 작품 + 아티스트 */
public class HomeFragment extends Fragment {
    private View root;
    private final WorkAdapter newAdapter = new WorkAdapter(R.layout.item_work_h, false);
    private final WorkAdapter popAdapter = new WorkAdapter(R.layout.item_work_h, false);

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inf, @Nullable ViewGroup c, @Nullable Bundle b) {
        root = inf.inflate(R.layout.fragment_home, c, false);
        RecyclerView ln = root.findViewById(R.id.listNew);
        ln.setLayoutManager(new LinearLayoutManager(getContext(), RecyclerView.HORIZONTAL, false));
        ln.setAdapter(newAdapter);
        RecyclerView lp = root.findViewById(R.id.listPopular);
        lp.setLayoutManager(new LinearLayoutManager(getContext(), RecyclerView.HORIZONTAL, false));
        lp.setAdapter(popAdapter);
        SwipeRefreshLayout sr = root.findViewById(R.id.refresh);
        sr.setOnRefreshListener(this::load);
        load();
        return root;
    }

    private void load() {
        Api.get(requireContext(), "/api/home", (res, err) -> {
            if (!isAdded()) return;
            ((SwipeRefreshLayout) root.findViewById(R.id.refresh)).setRefreshing(false);
            if (err != null) { Toast.makeText(getContext(), err, Toast.LENGTH_SHORT).show(); return; }
            JSONObject cur = res.optJSONObject("curated");
            if (cur != null) {
                ((TextView) root.findViewById(R.id.curatedTitle)).setText(cur.optString("title"));
                ((TextView) root.findViewById(R.id.curatedSub)).setText(cur.optString("artist_name") + " · " + cur.optString("description"));
                ArtLoader.load(root.findViewById(R.id.curatedImg), cur.optString("image"), 720);
                root.findViewById(R.id.curatedCard).setOnClickListener(v -> {
                    Intent i = new Intent(getContext(), WorkDetailActivity.class);
                    i.putExtra("workId", cur.optInt("id"));
                    startActivity(i);
                });
            }
            newAdapter.set(res.optJSONArray("newArrivals"));
            popAdapter.set(res.optJSONArray("popular"));
            LinearLayout box = root.findViewById(R.id.artists);
            box.removeAllViews();
            JSONArray arts = res.optJSONArray("artists");
            for (int i = 0; arts != null && i < arts.length(); i++) {
                JSONObject a = arts.optJSONObject(i);
                View v = LayoutInflater.from(getContext()).inflate(R.layout.item_artist_chip, box, false);
                ((TextView) v.findViewById(R.id.title)).setText(a.optString("name"));
                ArtLoader.load((ImageView) v.findViewById(R.id.img), a.optString("cover"), 200);
                v.setOnClickListener(x -> {
                    Intent it = new Intent(getContext(), ArtistActivity.class);
                    it.putExtra("artistId", a.optInt("id"));
                    startActivity(it);
                });
                box.addView(v);
            }
        });
    }
}
