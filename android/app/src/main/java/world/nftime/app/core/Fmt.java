package world.nftime.app.core;

import java.text.NumberFormat;
import java.util.Locale;

public final class Fmt {
    public static String won(int v) { return NumberFormat.getNumberInstance(Locale.KOREA).format(v) + "원"; }
    public static String shortAddr(String a) {
        if (a == null || a.length() < 12) return a == null ? "" : a;
        return a.substring(0, 6) + "…" + a.substring(a.length() - 4);
    }
}
