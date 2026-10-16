package com.rinrintv.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import androidx.fragment.app.FragmentManager;
import androidx.mediarouter.app.MediaRouteChooserDialogFragment;
import androidx.mediarouter.app.MediaRouteControllerDialogFragment;
import androidx.mediarouter.media.MediaRouteSelector;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.cast.CastMediaControlIntent;
import com.google.android.gms.cast.MediaInfo;
import com.google.android.gms.cast.MediaLoadRequestData;
import com.google.android.gms.cast.MediaMetadata;
import com.google.android.gms.cast.framework.CastContext;
import com.google.android.gms.cast.framework.CastSession;
import com.google.android.gms.cast.framework.SessionManager;
import com.google.android.gms.cast.framework.SessionManagerListener;
import com.google.android.gms.cast.framework.media.RemoteMediaClient;
import com.google.android.gms.common.images.WebImage;

import java.util.concurrent.Executors;

@CapacitorPlugin(name = "NativeCast")
public class NativeCastPlugin extends Plugin {

    private static final String TAG = "NativeCastPlugin";
    private CastContext castContext;
    private SessionManager sessionManager;
    private CastSession currentCastSession;
    private SessionManagerListener<CastSession> sessionManagerListener;
    private RemoteMediaClient.Callback remoteMediaClientCallback;
    private WifiManager.MulticastLock multicastLock;

    @Override
    public void load() {
        super.load();

        // 1. MulticastLock con protección total contra excepciones para mDNS
        try {
            Context ctx = getContext();
            if (ctx != null) {
                WifiManager wifi = (WifiManager) ctx.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wifi != null) {
                    multicastLock = wifi.createMulticastLock("rinrintv_cast_multicast_lock");
                    multicastLock.setReferenceCounted(true);
                    multicastLock.acquire();
                    Log.d(TAG, "MulticastLock adquirido para mDNS/Cast.");
                }
            }
        } catch (Throwable t) {
            Log.w(TAG, "No se pudo adquirir MulticastLock: " + t.getMessage());
        }

        // 2. Inicialización segura y asíncrona de Google Cast SDK
        try {
            initCastFramework();
        } catch (Throwable t) {
            Log.w(TAG, "Error iniciando CastFramework: " + t.getMessage());
        }
    }

    private void initCastFramework() {
        getActivity().runOnUiThread(() -> {
            try {
                remoteMediaClientCallback = new RemoteMediaClient.Callback() {
                    @Override
                    public void onStatusUpdated() {
                        try {
                            if (currentCastSession != null && currentCastSession.getRemoteMediaClient() != null) {
                                boolean isPaused = currentCastSession.getRemoteMediaClient().isPaused();
                                JSObject ret = new JSObject();
                                ret.put("isConnected", true);
                                if (currentCastSession.getCastDevice() != null) {
                                    ret.put("deviceName", currentCastSession.getCastDevice().getFriendlyName());
                                }
                                ret.put("isPaused", isPaused);
                                notifyListeners("castStatusChanged", ret);
                            }
                        } catch (Throwable t) {
                            Log.w(TAG, "Error en onStatusUpdated: " + t.getMessage());
                        }
                    }
                };

                sessionManagerListener = new SessionManagerListener<CastSession>() {
                    @Override
                    public void onSessionStarting(@NonNull CastSession session) {
                        Log.d(TAG, "Iniciando sesión Cast...");
                    }

                    @Override
                    public void onSessionStarted(@NonNull CastSession session, @NonNull String sessionId) {
                        Log.d(TAG, "Sesión Cast iniciada exitosamente con: " + 
                            (session.getCastDevice() != null ? session.getCastDevice().getFriendlyName() : "dispositivo"));
                        currentCastSession = session;
                        try {
                            if (session.getRemoteMediaClient() != null) {
                                session.getRemoteMediaClient().registerCallback(remoteMediaClientCallback);
                            }
                        } catch (Throwable ignored) {}

                        JSObject ret = new JSObject();
                        ret.put("isConnected", true);
                        if (session.getCastDevice() != null) {
                            ret.put("deviceName", session.getCastDevice().getFriendlyName());
                        }
                        ret.put("isPaused", false);
                        notifyListeners("castStatusChanged", ret);
                    }

                    @Override
                    public void onSessionStartFailed(@NonNull CastSession session, int error) {
                        Log.w(TAG, "Fallo al iniciar sesión Cast. Código de error: " + error);
                        currentCastSession = null;
                        JSObject ret = new JSObject();
                        ret.put("isConnected", false);
                        ret.put("deviceName", null);
                        ret.put("isPaused", false);
                        notifyListeners("castStatusChanged", ret);
                    }

                    @Override
                    public void onSessionEnding(@NonNull CastSession session) {}

                    @Override
                    public void onSessionEnded(@NonNull CastSession session, int error) {
                        Log.d(TAG, "Sesión Cast finalizada.");
                        currentCastSession = null;
                        JSObject ret = new JSObject();
                        ret.put("isConnected", false);
                        ret.put("deviceName", null);
                        ret.put("isPaused", false);
                        notifyListeners("castStatusChanged", ret);
                    }

                    @Override
                    public void onSessionResuming(@NonNull CastSession session, @NonNull String sessionId) {}

                    @Override
                    public void onSessionResumed(@NonNull CastSession session, boolean wasSuspended) {
                        Log.d(TAG, "Sesión Cast reanudada.");
                        currentCastSession = session;
                        try {
                            if (session.getRemoteMediaClient() != null) {
                                session.getRemoteMediaClient().registerCallback(remoteMediaClientCallback);
                            }
                        } catch (Throwable ignored) {}

                        JSObject ret = new JSObject();
                        ret.put("isConnected", true);
                        if (session.getCastDevice() != null) {
                            ret.put("deviceName", session.getCastDevice().getFriendlyName());
                        }
                        ret.put("isPaused", false);
                        notifyListeners("castStatusChanged", ret);
                    }

                    @Override
                    public void onSessionResumeFailed(@NonNull CastSession session, int error) {
                        currentCastSession = null;
                        JSObject ret = new JSObject();
                        ret.put("isConnected", false);
                        ret.put("deviceName", null);
                        ret.put("isPaused", false);
                        notifyListeners("castStatusChanged", ret);
                    }

                    @Override
                    public void onSessionSuspended(@NonNull CastSession session, int reason) {}
                };

                // Inicialización asíncrona segura mediante Task API (play-services-cast-framework 22.0.0+)
                CastContext.getSharedInstance(getContext(), Executors.newSingleThreadExecutor())
                    .addOnSuccessListener(getActivity(), cast -> {
                        castContext = cast;
                        try {
                            sessionManager = castContext.getSessionManager();
                            sessionManager.addSessionManagerListener(sessionManagerListener, CastSession.class);
                            Log.d(TAG, "CastContext inicializado exitosamente.");
                        } catch (Throwable t) {
                            Log.w(TAG, "Error configurando SessionManager: " + t.getMessage());
                        }
                    })
                    .addOnFailureListener(getActivity(), e -> {
                        Log.w(TAG, "Google Play Services Cast unavailable: " + e.getMessage());
                    });
            } catch (Throwable t) {
                Log.w(TAG, "Error en initCastFramework: " + t.getMessage());
            }
        });
    }

    private void ensurePermissions() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.NEARBY_WIFI_DEVICES) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.NEARBY_WIFI_DEVICES}, 2001);
                }
            } else {
                if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(getActivity(), new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, 2002);
                }
            }
        } catch (Throwable t) {
            Log.w(TAG, "Error verificando permisos: " + t.getMessage());
        }
    }

    @PluginMethod
    public void requestSession(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                ensurePermissions();

                MediaRouteSelector selector = new MediaRouteSelector.Builder()
                    .addControlCategory(CastMediaControlIntent.categoryForCast(CastMediaControlIntent.DEFAULT_MEDIA_RECEIVER_APPLICATION_ID))
                    .build();

                if (getActivity() instanceof FragmentActivity) {
                    FragmentManager fm = ((FragmentActivity) getActivity()).getSupportFragmentManager();
                    boolean isConnected = sessionManager != null 
                        && sessionManager.getCurrentCastSession() != null 
                        && sessionManager.getCurrentCastSession().isConnected();

                    if (isConnected) {
                        if (fm.findFragmentByTag("rinrin_cast_controller_dialog") == null) {
                            MediaRouteControllerDialogFragment controllerDialog = new MediaRouteControllerDialogFragment();
                            controllerDialog.show(fm, "rinrin_cast_controller_dialog");
                        }
                    } else {
                        if (fm.findFragmentByTag("rinrin_cast_chooser_dialog") == null) {
                            MediaRouteChooserDialogFragment chooserDialog = new MediaRouteChooserDialogFragment();
                            chooserDialog.setRouteSelector(selector);
                            chooserDialog.show(fm, "rinrin_cast_chooser_dialog");
                        }
                    }
                    call.resolve();
                } else {
                    call.reject("El Activity no es FragmentActivity.");
                }
            } catch (Throwable t) {
                Log.e(TAG, "Error abriendo selector de Cast: " + t.getMessage(), t);
                call.reject("Error abriendo selector de Cast: " + t.getMessage());
            }
        });
    }

    @PluginMethod
    public void loadMedia(PluginCall call) {
        String url = call.getString("url");
        String title = call.getString("title", "Canal RinRinTV");
        String logo = call.getString("logo");

        if (url == null || url.isEmpty()) {
            call.reject("URL no especificada");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                if (sessionManager != null) {
                    CastSession session = sessionManager.getCurrentCastSession();
                    if (session != null && session.getRemoteMediaClient() != null) {
                        MediaMetadata metadata = new MediaMetadata(MediaMetadata.MEDIA_TYPE_GENERIC);
                        metadata.putString(MediaMetadata.KEY_TITLE, title);
                        metadata.putString(MediaMetadata.KEY_SUBTITLE, "RinRinTV En Vivo");
                        if (logo != null && !logo.isEmpty()) {
                            metadata.addImage(new WebImage(Uri.parse(logo)));
                        }

                        boolean isHls = url.contains(".m3u8") || url.contains("/hls/");
                        MediaInfo mediaInfo = new MediaInfo.Builder(url)
                            .setStreamType(MediaInfo.STREAM_TYPE_LIVE)
                            .setContentType(isHls ? "application/x-mpegurl" : "video/mp4")
                            .setMetadata(metadata)
                            .build();

                        MediaLoadRequestData requestData = new MediaLoadRequestData.Builder()
                            .setMediaInfo(mediaInfo)
                            .setAutoplay(true)
                            .build();

                        session.getRemoteMediaClient().load(requestData);
                        call.resolve();
                        return;
                    }
                }
                call.reject("No hay sesión activa de Chromecast");
            } catch (Throwable t) {
                call.reject("Error al cargar stream en Cast: " + t.getMessage());
            }
        });
    }

    @PluginMethod
    public void play(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (sessionManager != null && sessionManager.getCurrentCastSession() != null && sessionManager.getCurrentCastSession().getRemoteMediaClient() != null) {
                    sessionManager.getCurrentCastSession().getRemoteMediaClient().play();
                }
            } catch (Throwable ignored) {}
            call.resolve();
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (sessionManager != null && sessionManager.getCurrentCastSession() != null && sessionManager.getCurrentCastSession().getRemoteMediaClient() != null) {
                    sessionManager.getCurrentCastSession().getRemoteMediaClient().pause();
                }
            } catch (Throwable ignored) {}
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (sessionManager != null) {
                    sessionManager.endCurrentSession(true);
                }
            } catch (Throwable ignored) {}
            call.resolve();
        });
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        boolean isConnected = false;
        String deviceName = null;
        boolean isPaused = false;

        try {
            if (sessionManager != null && sessionManager.getCurrentCastSession() != null) {
                CastSession session = sessionManager.getCurrentCastSession();
                isConnected = session.isConnected();
                if (isConnected && session.getCastDevice() != null) {
                    deviceName = session.getCastDevice().getFriendlyName();
                }
                if (session.getRemoteMediaClient() != null) {
                    isPaused = session.getRemoteMediaClient().isPaused();
                }
            }
        } catch (Throwable ignored) {}

        ret.put("isConnected", isConnected);
        if (isConnected) {
            ret.put("deviceName", deviceName != null ? deviceName : "Smart TV");
            ret.put("isPaused", isPaused);
        }
        call.resolve(ret);
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        try {
            if (sessionManager != null && sessionManagerListener != null) {
                sessionManager.removeSessionManagerListener(sessionManagerListener, CastSession.class);
            }
            if (multicastLock != null && multicastLock.isHeld()) {
                multicastLock.release();
            }
        } catch (Throwable ignored) {}
    }
}
