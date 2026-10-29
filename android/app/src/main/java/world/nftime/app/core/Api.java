package world.nftime.app.core;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONObject;

import java.io.IOException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import world.nftime.app.BuildConfig;

/** NFTime REST API 클라이언트 (Cloudflare Workers) */
public final class Api {
    public interface Callback {
        void onResult(JSONObject res, String error);
    }

    public static final String BASE = BuildConfig.API_BASE;
    private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
    private static final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(40, TimeUnit.SECONDS)
            .build();
    private static final ExecutorService io = Executors.newFixedThreadPool(4);
    private static final Handler main = new Handler(Looper.getMainLooper());

    private Api() {}

    public static OkHttpClient http() { return client; }

    public static void get(Context ctx, String path, Callback cb) { call(ctx, "GET", path, null, cb); }
    public static void post(Context ctx, String path, JSONObject body, Callback cb) { call(ctx, "POST", path, body, cb); }
    public static void delete(Context ctx, String path, Callback cb) { call(ctx, "DELETE", path, null, cb); }

    public static void call(Context ctx, String method, String path, JSONObject body, Callback cb) {
        final String token = Session.token(ctx);
        io.execute(() -> {
            JSONObject res = null;
            String error = null;
            try {
                Request.Builder b = new Request.Builder().url(BASE + path);
                if (token != null) b.header("Authorization", "Bearer " + token);
                RequestBody rb = body != null ? RequestBody.create(body.toString(), JSON)
                        : ("GET".equals(method) || "DELETE".equals(method) ? null : RequestBody.create("{}", JSON));
                b.method(method, rb);
                try (Response r = client.newCall(b.build()).execute()) {
                    String text = r.body() != null ? r.body().string() : "{}";
                    res = new JSONObject(text);
                    if (!r.isSuccessful() && res.has("error")) error = res.optString("error");
                    else if (!r.isSuccessful()) error = "HTTP " + r.code();
                }
            } catch (IOException e) {
                error = "네트워크 오류: " + e.getMessage();
            } catch (Exception e) {
                error = e.getMessage();
            }
            final JSONObject fr = res;
            final String fe = error;
            if (cb != null) main.post(() -> cb.onResult(fr, fe));
        });
    }
}
