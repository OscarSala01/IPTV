package com.rinrintv.app;

import android.net.Uri;
import androidx.mediarouter.app.MediaRouteButton;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
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

    private CastContext castContext;
    private SessionManager sessionManager;
    private CastSession currentCastSession;
    private SessionManagerListener<CastSession> sessionManagerListener;
    private RemoteMediaClient.Callback remoteMediaClientCallback;

    @Override
    public void load() {
        super.load();
        getActivity().runOnUiThread(() -> {
            try {
                castContext = CastContext.getSharedInstance(getContext());
                sessionManager = castContext.getSessionManager();

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

                sessionManagerListener = new SessionManagerListener<CastSession>() {
                    @Override
                    public void onSessionStarting(CastSession session) {}

                    @Override
                    public void onSessionStarted(CastSession session, String sessionId) {
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
                e.printStackTrace();
            }
        });
    }

    @PluginMethod
    public void requestSession(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                MediaRouteButton button = new MediaRouteButton(getActivity());
                CastButtonFactory.setUpMediaRouteButton(getContext(), button);
                button.performClick();
                call.resolve();
            } catch (Exception e) {
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
}
