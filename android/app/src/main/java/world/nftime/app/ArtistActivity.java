package world.nftime.app;

import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import org.json.JSONArray;

import world.nftime.app.core.Api;
import world.nftime.app.core.ArtLoader;
import world.nftime.app.core.WorkAdapter;

/** 아티스트 페이지 */
public class ArtistActivity extends AppCompatActivity {
    private final WorkAdapter adapter = new WorkAdapter(R.layout.item_work_grid, true);

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_artist);
        findViewById(R.id.btnBack).setOnClickListener(v -> finish());
        RecyclerView grid = findViewById(R.id.grid);
        grid.setLayoutManager(new GridLayoutManager(this, 2));
        grid.setAdapter(adapter);
        int id = getIntent().getIntExtra("artistId", 1);
        Api.get(this, "/api/artists/" + id, (res, err) -> {
            if (res == null) return;
            ((TextView) findViewById(R.id.name)).setText(res.optString("name"));
            ((TextView) findViewById(R.id.followers)).setText("팔로워 " + res.optInt("followers") + "명");
            ((TextView) findViewById(R.id.bio)).setText(res.optString("bio"));
            JSONArray works = res.optJSONArray("works");
            adapter.set(works);
            if (works != null && works.length() > 0)
                ArtLoader.load(findViewById(R.id.cover), works.optJSONObject(0).optString("image"), 720);
        });
    }
}
