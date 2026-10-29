package world.nftime.app;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;

import com.google.android.material.bottomnavigation.BottomNavigationView;

import world.nftime.app.ui.DiscoverFragment;
import world.nftime.app.ui.HomeFragment;
import world.nftime.app.ui.LibraryFragment;
import world.nftime.app.ui.MyFragment;

/** 하단 탭: 홈 / 탐색 / 라이브러리 / 마이 */
public class MainActivity extends AppCompatActivity {
    private BottomNavigationView nav;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_main);
        nav = findViewById(R.id.nav);
        nav.setOnItemSelectedListener(item -> { load(item.getItemId()); return true; });
        nav.setOnItemReselectedListener(item -> { });
        if (b == null) select(getIntent().getStringExtra("tab"));
    }

    public void select(String tab) {
        int id = R.id.nav_home;
        if ("discover".equals(tab)) id = R.id.nav_discover;
        else if ("library".equals(tab)) id = R.id.nav_library;
        else if ("my".equals(tab)) id = R.id.nav_my;
        if (nav.getSelectedItemId() == id) load(id);
        else nav.setSelectedItemId(id);
    }

    private void load(int id) {
        Fragment f;
        if (id == R.id.nav_discover) f = new DiscoverFragment();
        else if (id == R.id.nav_library) f = new LibraryFragment();
        else if (id == R.id.nav_my) f = new MyFragment();
        else f = new HomeFragment();
        getSupportFragmentManager().beginTransaction().replace(R.id.container, f).commit();
    }

    @Override
    protected void onNewIntent(android.content.Intent intent) {
        super.onNewIntent(intent);
        if (intent.hasExtra("tab")) select(intent.getStringExtra("tab"));
    }
}
