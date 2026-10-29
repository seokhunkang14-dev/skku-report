package world.nftime.app.core;

import android.content.Context;
import android.content.SharedPreferences;

/** 로그인 세션(토큰 + 지갑 주소) 저장 */
public final class Session {
    private static SharedPreferences sp(Context c) {
        return c.getApplicationContext().getSharedPreferences("session", Context.MODE_PRIVATE);
    }
    public static String token(Context c) { return sp(c).getString("token", null); }
    public static String address(Context c) { return sp(c).getString("address", null); }
    public static String wallet(Context c) { return sp(c).getString("wallet", "MetaMask"); }
    public static boolean loggedIn(Context c) { return token(c) != null; }
    public static void save(Context c, String token, String address, String wallet) {
        sp(c).edit().putString("token", token).putString("address", address).putString("wallet", wallet).apply();
    }
    public static void pendingAuth(Context c, String s) { sp(c).edit().putString("pending", s).apply(); }
    public static String pendingAuth(Context c) { return sp(c).getString("pending", null); }
    public static void clear(Context c) { sp(c).edit().clear().apply(); }
}
