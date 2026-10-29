package world.nftime.app.core;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;

import world.nftime.app.R;

/** 리스트 행 (썸네일 + 제목 + 부제 + 우측 아이콘) */
public class RowAdapter extends RecyclerView.Adapter<RowAdapter.VH> {
    public static class Row {
        public String image, title, sub;
        public int iconRes = 0, trailRes = 0;
        public Runnable onClick, onTrail;
        public Row(String image, String title, String sub) { this.image = image; this.title = title; this.sub = sub; }
    }

    private final List<Row> rows = new ArrayList<>();

    public void set(List<Row> r) { rows.clear(); rows.addAll(r); notifyDataSetChanged(); }

    @NonNull @Override
    public VH onCreateViewHolder(@NonNull ViewGroup p, int t) {
        return new VH(LayoutInflater.from(p.getContext()).inflate(R.layout.item_row, p, false));
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int pos) {
        Row r = rows.get(pos);
        h.title.setText(r.title);
        h.sub.setText(r.sub);
        h.sub.setVisibility(r.sub == null || r.sub.isEmpty() ? View.GONE : View.VISIBLE);
        if (r.image != null) { h.icon.setVisibility(View.GONE); ArtLoader.load(h.img, r.image, 160); }
        else { h.img.setImageDrawable(null); }
        if (r.iconRes != 0) { h.icon.setVisibility(View.VISIBLE); h.icon.setImageResource(r.iconRes); }
        else h.icon.setVisibility(View.GONE);
        if (r.trailRes != 0) {
            h.trail.setVisibility(View.VISIBLE); h.trail.setImageResource(r.trailRes);
            h.trail.setOnClickListener(v -> { if (r.onTrail != null) r.onTrail.run(); });
        } else h.trail.setVisibility(View.GONE);
        h.itemView.setOnClickListener(v -> { if (r.onClick != null) r.onClick.run(); });
    }

    @Override public int getItemCount() { return rows.size(); }

    static class VH extends RecyclerView.ViewHolder {
        ImageView img, icon, trail; TextView title, sub;
        VH(View v) {
            super(v);
            img = v.findViewById(R.id.img); icon = v.findViewById(R.id.imgIcon); trail = v.findViewById(R.id.trail);
            title = v.findViewById(R.id.title); sub = v.findViewById(R.id.sub);
        }
    }
}
