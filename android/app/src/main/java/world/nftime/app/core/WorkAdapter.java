package world.nftime.app.core;

import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

import world.nftime.app.R;
import world.nftime.app.WorkDetailActivity;

/** 작품 카드 목록 (그리드 / 가로 스크롤 공용) */
public class WorkAdapter extends RecyclerView.Adapter<WorkAdapter.VH> {
    private final int layout;
    private final List<JSONObject> items = new ArrayList<>();
    private final boolean showPrice;

    public WorkAdapter(int layout, boolean showPrice) { this.layout = layout; this.showPrice = showPrice; }

    public void set(JSONArray arr) {
        items.clear();
        if (arr != null) for (int i = 0; i < arr.length(); i++) items.add(arr.optJSONObject(i));
        notifyDataSetChanged();
    }

    @NonNull @Override
    public VH onCreateViewHolder(@NonNull ViewGroup p, int vt) {
        return new VH(LayoutInflater.from(p.getContext()).inflate(layout, p, false));
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int pos) {
        JSONObject w = items.get(pos);
        h.title.setText(w.optString("title"));
        h.sub.setText(w.optString("artist_name"));
        if (showPrice) {
            h.price.setVisibility(View.VISIBLE);
            int remain = w.optInt("remaining", 0);
            h.price.setText(remain > 0 ? Fmt.won(w.optInt("price")) + " · " + remain + "개 남음" : "SOLD OUT");
        }
        ArtLoader.load(h.img, w.optString("image"), 360);
        h.itemView.setOnClickListener(v -> {
            Intent i = new Intent(v.getContext(), WorkDetailActivity.class);
            i.putExtra("workId", w.optInt("id"));
            v.getContext().startActivity(i);
        });
    }

    @Override public int getItemCount() { return items.size(); }

    static class VH extends RecyclerView.ViewHolder {
        ImageView img; TextView title, sub, price;
        VH(View v) {
            super(v);
            img = v.findViewById(R.id.img); title = v.findViewById(R.id.title);
            sub = v.findViewById(R.id.sub); price = v.findViewById(R.id.price);
        }
    }
}
