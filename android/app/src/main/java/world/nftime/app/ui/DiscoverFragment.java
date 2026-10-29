package world.nftime.app.ui;

import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;

import world.nftime.app.R;
import world.nftime.app.core.Api;
import world.nftime.app.core.WorkAdapter;

/** 탐색: 검색 + 스타일 필터 + 작품 그리드 */
public class DiscoverFragment extends Fragment {
    private static final String[][] STYLES = {
            {"전체", ""}, {"빛", "orbs"}, {"파도", "waves"}, {"기하학", "bauhaus"},
            {"풍경", "mountains"}, {"흐름", "flow"}, {"원", "rings"}};
    private final WorkAdapter adapter = new WorkAdapter(R.layout.item_work_grid, true);
    private String style = "";
    private EditText query;

    @Nullable @Override
    public View onCreateView(@NonNull LayoutInflater inf, @Nullable ViewGroup c, @Nullable Bundle b) {
        View v = inf.inflate(R.layout.fragment_discover, c, false);
        RecyclerView grid = v.findViewById(R.id.grid);
        grid.setLayoutManager(new GridLayoutManager(getContext(), 2));
        grid.setAdapter(adapter);
        query = v.findViewById(R.id.query);
        query.setOnEditorActionListener((tv, id, ev) -> {
            if (id == EditorInfo.IME_ACTION_SEARCH) { load(); return true; }
            return false;
        });
        ChipGroup chips = v.findViewById(R.id.chips);
        for (int i = 0; i < STYLES.length; i++) {
            Chip chip = new Chip(requireContext());
            chip.setText(STYLES[i][0]);
            chip.setCheckable(true);
            chip.setId(View.generateViewId());
            final String st = STYLES[i][1];
            chip.setOnCheckedChangeListener((cb, checked) -> { if (checked) { style = st; load(); } });
            chips.addView(chip);
            if (i == 0) chip.setChecked(true);
        }
        load();
        return v;
    }

    private void load() {
        String q = query.getText().toString().trim();
        String path = "/api/works?q=" + Uri.encode(q) + (style.isEmpty() ? "" : "&style=" + style);
        Api.get(requireContext(), path, (res, err) -> {
            if (!isAdded()) return;
            if (err != null) { Toast.makeText(getContext(), err, Toast.LENGTH_SHORT).show(); return; }
            adapter.set(res.optJSONArray("works"));
        });
    }
}
