package com.rinrintv.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.util.Log;
import android.view.ViewGroup;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import androidx.fragment.app.FragmentManager;
import androidx.mediarouter.app.MediaRouteButton;
import androidx.mediarouter.app.MediaRouteChooserDialogFragment;
import androidx.mediarouter.app.MediaRouteControllerDialogFragment;
import androidx.mediarouter.media.MediaRouteSelector;
import androidx.mediarouter.media.MediaRouter;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.gms.cast.CastMediaControlIntent;
import com.google.android.gms.cast.MediaInfo;
import com.google.android.gms.cast.MediaLoadRequestData;
import com.google.android.gms.cast.MediaMetadata;
import com.google.android.gms.cast.framework.CastButtonFactory;
import com.google.android.gms.cast.framework.CastContext;
import com.google.android.gms.cast.framework.CastSession;
import com.google.android.gms.cast.framework.SessionManager;
import com.google.android.gms.cast.framework.SessionManagerListener;
import com.google.android.gms.cast.framework.media.RemoteMediaClient;
import com.google.android.gms.common.images.WebImage;

@CapacitorPlugin(name = "NativeCast")
public class NativeCastPlugin extends Plugin {

    private static final String TAG = "NativeCastPlugin";
    private CastContext castContext;
    private SessionManager sessionManager;
    private CastSession currentCastSession;
    private SessionManagerListener<CastSession> sessionManagerListener;
    private RemoteMediaClient.Callback remoteMediaClientCallback;
    private WifiManager.MulticastLock multicastLock;
    private MediaRouter mediaRouter;
    private MediaRouter.Callback mediaRouterCallback;
    private MediaRouteButton hiddenMediaRouteButton;

    @Override
    public void load() {
        super.load();

        // 1. Adquirir MulticastLock para permitir el descubrimiento mDNS (Chromecast / Sony TV)
        try {
            WifiManager wifi = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wifi != null) {
                multicastLock = wifi.createMulticastLock("rinrintv_cast_multicast_lock");
                multicastLock.setReferenceCounted(true);
                multicastLock.acquire();
                Log.d(TAG, "MulticastLock adquirido con éxito.");
            }
        } catch (Exception e) {
            Log.w(TAG, "No se pudo adquirir MulticastLock: " + e.getMessage());
        }

        // 2. Inicializar CastContext y MediaRouter en el hilo UI
        getActivity().runOnUiThread(() -> {
            try {
                castContext = CastContext.getSharedInstance(getContext());
                sessionManager = castContext.getSessionManager();

                // Montar un MediaRouteButton invisible en la jerarquía para sincronizar el estado
                try {
                    ViewGroup rootView = (ViewGroup) getActivity().findViewById(android.R.id.content);
                    if (rootView != null && hiddenMediaRouteButton == null) {
                        hiddenMediaRouteButton = new MediaRouteButton(getActivity());
                        hiddenMediaRouteButton.setAlpha(0f);
                        hiddenMediaRouteButton.setClickable(false);
                        hiddenMediaRouteButton.setFocusable(false);
                        rootView.addView(hiddenMediaRouteButton, new ViewGroup.LayoutParams(1, 1));
                        CastButtonFactory.setUpMediaRouteButton(getContext(), hiddenMediaRouteButton);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "No se pudo enlazar hiddenMediaRouteButton: " + e.getMessage());
                }

                // Configurar escaneo pasivo de MediaRouter para que los dispositivos aparezcan de inmediato
                MediaRouteSelector selector = getCastSelector();
                mediaRouter = MediaRouter.getInstance(getContext());
                mediaRouterCallback = new MediaRouter.Callback() {
                    @Override
                    public void onRouteAdded(MediaRouter router, MediaRouter.RouteInfo route) {
                        Log.d(TAG, "Ruta Cast detectada: " + route.getName());
                    }
                };
                mediaRouter.addCallback(selector, mediaRouterCallback, MediaRouter.CALLBACK_FLAG_REQUEST_DISCOVERY);

                // Configurar callbacks de reproducción de medios
                remoteMediaClientCallback = new RemoteMediaClient.Callback() {
                    @Override
                    public void onStatusUpdated() {
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
                    }
                };

                // Configurar listener de sesiones de Cast
                sessionManagerListener = new SessionManagerListener<CastSession>() {
                    @Override
                    public void onSessionStarting(CastSession session) {
                        Log.d(TAG, "Iniciando sesión Cast...");
                    }

                    @Override
                    public void onSessionStarted(CastSession session, String sessionId) {
                        Log.d(TAG, "Sesión Cast iniciada exitosamente con: " + 
                            (session.getCastDevice() != null ? session.getCastDevice().getFriendlyName() : "dispositivo"));
                        currentCastSession = session;
                        if (session.getRemoteMediaClient() != null) {
                            session.getRemoteMediaClient().registerCallback(remoteMediaClientCallback);
                        }
                        JSObject ret = new JSObject();
                        ret.put("isConnected", true);
                        if (session.getCastDevice() != null) {
                            ret.put("deviceName", session.getCastDevice().getFriendlyName());
                        }
                        ret.put("isPaused", false);
                        notifyListeners("castStatusChanged", ret);
                    }

                    @Override
                    public void onSessionStartFailed(CastSession session, int error) {
                        Log.w(TAG, "Fallo al iniciar sesión Cast. Código de error: " + error);
                        currentCastSession = null;
                        JSObject ret = new JSObject();
                        ret.put("isConnected", false);
                        ret.put("deviceName", null);
                        ret.put("isPaused", false);
                        notifyListeners("castStatusChanged", ret);
                    }

                    @Override
                    public void onSessionEnding(CastSession session) {}

                    @Override
                    public void onSessionEnded(CastSession session, int error) {
                        Log.d(TAG, "Sesión Cast finalizada.");
                        currentCastSession = null;
                        JSObject ret = new JSObject();
                        ret.put("isConnected", false);
                        ret.put("deviceName", null);
                        ret.put("isPaused", false);
                        notifyListeners("castStatusChanged", ret);
                    }

                    @Override
                    public void onSessionResuming(CastSession session, String sessionId) {}

                    @Override
                    public void onSessionResumed(CastSession session, boolean wasSuspended) {
                        Log.d(TAG, "Sesión Cast reanudada.");
                        currentCastSession = session;
                        if (session.getRemoteMediaClient() != null) {
                            session.getRemoteMediaClient().registerCallback(remoteMediaClientCallback);
                        }
                        JSObject ret = new JSObject();
                        ret.put("isConnected", true);
                        if (session.getCastDevice() != null) {
                            ret.put("deviceName", session.getCastDevice().getFriendlyName());
                        }
                        ret.put("isPaused", false);
                        notifyListeners("castStatusChanged", ret);
                    }

                    @Override
                    public void onSessionResumeFailed(CastSession session, int error) {
                        currentCastSession = null;
                        JSObject ret = new JSObject();
                        ret.put("isConnected", false);
                        ret.put("deviceName", null);
                        ret.put("isPaused", false);
                        notifyListeners("castStatusChanged", ret);
                    }

                    @Override
                    public void onSessionSuspended(CastSession session, int reason) {}
                };

                sessionManager.addSessionManagerListener(sessionManagerListener, CastSession.class);
            } catch (Exception e) {
                Log.e(TAG, "Error inicializando CastContext", e);
            }
        });
    }

    private MediaRouteSelector getCastSelector() {
        if (castContext != null && castContext.getMergedSelector() != null) {
            return castContext.getMergedSelector();
        }
        return new MediaRouteSelector.Builder()
            .addControlCategory(CastMediaControlIntent.categoryForCast(CastMediaControlIntent.DEFAULT_MEDIA_RECEIVER_APPLICATION_ID))
            .build();
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
        } catch (Exception e) {
            Log.w(TAG, "Error verificando permisos: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestSession(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                ensurePermissions();

                if (castContext == null) {
                    castContext = CastContext.getSharedInstance(getContext());
                    sessionManager = castContext.getSessionManager();
                }

                MediaRouteSelector selector = getCastSelector();

                // Activar escaneo activo inmediato en MediaRouter
                if (mediaRouter != null && mediaRouterCallback != null) {
                    mediaRouter.removeCallback(mediaRouterCallback);
                    mediaRouter.addCallback(selector, mediaRouterCallback, MediaRouter.CALLBACK_FLAG_PERFORM_ACTIVE_SCAN);
                }

                if (getActivity() instanceof FragmentActivity) {
                    FragmentManager fm = ((FragmentActivity) getActivity()).getSupportFragmentManager();
                    boolean isConnected = sessionManager != null 
                        && sessionManager.getCurrentCastSession() != null 
                        && sessionManager.getCurrentCastSession().isConnected();

                    if (isConnected) {
                        if (fm.findFragmentByTag("androidx.mediarouter.app.MediaRouteControllerDialogFragment") == null) {
                            MediaRouteControllerDialogFragment controllerDialog = new MediaRouteControllerDialogFragment();
                            controllerDialog.show(fm, "androidx.mediarouter.app.MediaRouteControllerDialogFragment");
                        }
                    } else {
                        if (fm.findFragmentByTag("androidx.mediarouter.app.MediaRouteChooserDialogFragment") == null) {
                            MediaRouteChooserDialogFragment chooserDialog = new MediaRouteChooserDialogFragment();
                            chooserDialog.setRouteSelector(selector);
                            chooserDialog.show(fm, "androidx.mediarouter.app.MediaRouteChooserDialogFragment");
                        }
                    }
                    call.resolve();
                } else if (hiddenMediaRouteButton != null) {
                    hiddenMediaRouteButton.showDialog();
                    call.resolve();
                } else {
                    call.reject("No se encontró FragmentManager para mostrar el selector de Cast.");
                }
            } catch (Exception e) {
                Log.e(TAG, "Error abriendo selector de Cast", e);
                call.reject("Error abriendo diálogo de Cast: " + e.getMessage());
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
                if (sessionManager == null) {
                    sessionManager = CastContext.getSharedInstance(getContext()).getSessionManager();
                }
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
                } else {
                    call.reject("No hay sesión activa de Chromecast");
                }
            } catch (Exception e) {
                call.reject("Error al cargar stream en Cast: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void play(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (sessionManager != null && sessionManager.getCurrentCastSession() != null && sessionManager.getCurrentCastSession().getRemoteMediaClient() != null) {
                sessionManager.getCurrentCastSession().getRemoteMediaClient().play();
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void pause(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (sessionManager != null && sessionManager.getCurrentCastSession() != null && sessionManager.getCurrentCastSession().getRemoteMediaClient() != null) {
                sessionManager.getCurrentCastSession().getRemoteMediaClient().pause();
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (sessionManager != null) {
                sessionManager.endCurrentSession(true);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        boolean isConnected = sessionManager != null && sessionManager.getCurrentCastSession() != null && sessionManager.getCurrentCastSession().isConnected();
        ret.put("isConnected", isConnected);
        if (isConnected && sessionManager.getCurrentCastSession().getCastDevice() != null) {
            ret.put("deviceName", sessionManager.getCurrentCastSession().getCastDevice().getFriendlyName());
            if (sessionManager.getCurrentCastSession().getRemoteMediaClient() != null) {
                ret.put("isPaused", sessionManager.getCurrentCastSession().getRemoteMediaClient().isPaused());
            }
        }
        call.resolve(ret);
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        try {
            if (mediaRouter != null && mediaRouterCallback != null) {
                mediaRouter.removeCallback(mediaRouterCallback);
            }
            if (sessionManager != null && sessionManagerListener != null) {
                sessionManager.removeSessionManagerListener(sessionManagerListener, CastSession.class);
            }
            if (multicastLock != null && multicastLock.isHeld()) {
                multicastLock.release();
            }
        } catch (Exception ignored) {}
    }
}
