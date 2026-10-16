import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativeCastPluginInterface {
  requestSession(): Promise<any>;
  loadMedia(options: { url: string; title: string; logo?: string }): Promise<any>;
  play(): Promise<any>;
  pause(): Promise<any>;
  stop(): Promise<any>;
  getStatus(): Promise<{ isConnected: boolean; deviceName?: string; isPaused?: boolean }>;
  addListener(
    eventName: 'castStatusChanged',
    listenerFunc: (status: { isConnected: boolean; deviceName?: string | null; isPaused?: boolean }) => void
  ): Promise<any>;
}

const NativeCast = registerPlugin<NativeCastPluginInterface>('NativeCast');

export interface CastStatus {
  isAvailable: boolean;
  isConnected: boolean;
  deviceName: string | null;
  currentTitle: string | null;
  isPaused: boolean;
}

type CastListener = (status: CastStatus) => void;

class CastService {
  private status: CastStatus = {
    isAvailable: true,
    isConnected: false,
    deviceName: null,
    currentTitle: null,
    isPaused: false
  };

  private listeners: Set<CastListener> = new Set();
  private castContext: any = null;
  private currentSession: any = null;
  private presentationConnection: any = null;
  private activeVideoElement: HTMLVideoElement | null = null;
  private lastChannelList: { name: string; url: string; logo?: string }[] = [];

  constructor() {
    if (Capacitor.isNativePlatform()) {
      this.initNativeCast();
    } else {
      this.initCastApi();
    }
  }

  private initNativeCast() {
    this.status.isAvailable = true;
    this.notify();

    try {
      NativeCast.addListener('castStatusChanged', (data) => {
        this.status.isConnected = data.isConnected;
        this.status.deviceName = data.deviceName || (data.isConnected ? 'Smart TV' : null);
        if (typeof data.isPaused === 'boolean') {
          this.status.isPaused = data.isPaused;
        }
        if (!data.isConnected) {
          this.status.currentTitle = null;
        }
        this.notify();
      });

      NativeCast.getStatus()
        .then((data) => {
          if (data && data.isConnected) {
            this.status.isConnected = true;
            this.status.deviceName = data.deviceName || 'Smart TV';
            if (typeof data.isPaused === 'boolean') {
              this.status.isPaused = data.isPaused;
            }
            this.notify();
          }
        })
        .catch(() => {});
    } catch (e) {
      console.warn('NativeCast init error:', e);
    }
  }

  public registerActiveVideo(video: HTMLVideoElement | null) {
    this.activeVideoElement = video;
  }

  private initCastApi() {
    const tryInitialize = () => {
      const cast = (window as any).cast;
      const chrome = (window as any).chrome;

      if (cast && cast.framework && chrome && chrome.cast) {
        try {
          if (!this.castContext) {
            this.castContext = cast.framework.CastContext.getInstance();
            this.castContext.setOptions({
              receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID || 'CC1AD845',
              autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
            });

            this.status.isAvailable = true;
            this.notify();

            // Escuchar cambios de sesión de Cast
            this.castContext.addEventListener(
              cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
              (event: any) => {
                this.handleSessionChange(event);
              }
            );
          }
          return true;
        } catch (e) {
          console.warn('CastContext init error:', e);
        }
      }
      return false;
    };

    if (tryInitialize()) return;

    (window as any)['__onGCastApiAvailable'] = (isAvailable: boolean) => {
      if (isAvailable) tryInitialize();
    };

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tryInitialize() || attempts > 20) {
        clearInterval(interval);
      }
    }, 200);
  }

  private handleSessionChange(event: any) {
    if (!this.castContext) return;
    const session = this.castContext.getCurrentSession();
    this.currentSession = session;

    if (session) {
      const device = session.getCastDevice();
      this.status.isConnected = true;
      this.status.deviceName = device?.friendlyName || 'Sony Bravia TV';

      this.attachMediaSessionListener(session);
    } else {
      this.status.isConnected = false;
      this.status.deviceName = null;
      this.status.currentTitle = null;
    }

    this.notify();
  }

  /**
   * Conecta un escucha de eventos multimedia para detectar cambios hechos con el control remoto físico de la TV
   */
  private attachMediaSessionListener(session: any) {
    const mediaSession = session.getMediaSession();
    if (mediaSession) {
      if (mediaSession.media && mediaSession.media.metadata) {
        this.status.currentTitle = mediaSession.media.metadata.title || 'Canal de TV';
        this.status.isPaused = mediaSession.playerState === 'PAUSED';
      }

      if (!mediaSession._hasRinRinUpdateListener) {
        mediaSession._hasRinRinUpdateListener = true;
        mediaSession.addUpdateListener((isAlive: boolean) => {
          if (isAlive && mediaSession.media && mediaSession.media.metadata) {
            const newTitle = mediaSession.media.metadata.title;
            const isPaused = mediaSession.playerState === 'PAUSED';

            let changed = false;
            if (newTitle && newTitle !== this.status.currentTitle) {
              console.log(`📺 Canal actualizado en la TV Sony: ${newTitle}`);
              this.status.currentTitle = newTitle;
              changed = true;
            }
            if (isPaused !== this.status.isPaused) {
              this.status.isPaused = isPaused;
              changed = true;
            }
            if (changed) {
              this.notify();
            }
          }
        });
      }
    }
  }

  public subscribe(listener: CastListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn({ ...this.status }));
  }

  /**
   * Abre el selector oficial de Google Cast en Android (Sony Bravia TV / Chromecast)
   */
  public async requestSession(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeCast.requestSession();
        return true;
      } catch (err) {
        console.warn('NativeCast requestSession error:', err);
        return false;
      }
    }

    if (!this.castContext) {
      this.initCastApi();
    }

    // 1. Google Cast SDK oficial (Default Media Receiver CC1AD845)
    if (this.castContext) {
      try {
        await this.castContext.requestSession();
        this.currentSession = this.castContext.getCurrentSession();
        if (this.currentSession) {
          const device = this.currentSession.getCastDevice();
          this.status.isConnected = true;
          this.status.deviceName = device?.friendlyName || 'Sony Bravia TV';
          this.attachMediaSessionListener(this.currentSession);
          this.notify();
          return true;
        }
      } catch (err: any) {
        console.log('Google Cast requestSession finalizado o cancelado:', err);
        return false;
      }
    }

    // 2. Presentation API (Protocolo nativo que usa Chrome si el SDK no cargó)
    const PresentationRequest = (window as any).PresentationRequest;
    if (PresentationRequest) {
      try {
        const presentationRequest = new PresentationRequest([
          'cast:CC1AD845',
          'https://www.gstatic.com/eureka/player/player.html'
        ]);

        const connection = await presentationRequest.start();
        if (connection) {
          this.presentationConnection = connection;
          this.status.isConnected = true;
          this.status.deviceName = 'Sony Bravia TV';
          this.notify();

          connection.onterminate = () => {
            this.status.isConnected = false;
            this.status.deviceName = null;
            this.notify();
          };
          return true;
        }
      } catch (e) {
        console.log('PresentationRequest dialog cerrado o cancelado...');
        return false;
      }
    }

    // 3. Fallback: API estándar de W3C Remote Playback del elemento <video>
    if (this.activeVideoElement && (this.activeVideoElement as any).remote) {
      try {
        await (this.activeVideoElement as any).remote.prompt();
        return true;
      } catch (err) {
        console.warn('Remote Playback error:', err);
      }
    }

    return false;
  }

  /**
   * Envía un stream HLS a la TV con soporte de cola (Queue) para navegación con el control remoto CEC
   */
  public castMedia(
    url: string,
    title: string,
    logoUrl?: string,
    channelList?: { name: string; url: string; logo?: string }[]
  ) {
    if (channelList && channelList.length > 0) {
      this.lastChannelList = channelList;
    }

    this.status.currentTitle = title;
    this.status.isPaused = false;
    this.notify();

    const doLoad = () => {
      this.loadMedia(url, title, logoUrl, channelList || this.lastChannelList);
    };

    if (!this.status.isConnected) {
      this.requestSession().then((connected) => {
        if (connected) {
          setTimeout(doLoad, 500);
        }
      });
    } else {
      doLoad();
    }
  }

  public loadMedia(
    url: string,
    title: string,
    logoUrl?: string,
    channelList?: { name: string; url: string; logo?: string }[]
  ) {
    if (channelList && channelList.length > 0) {
      this.lastChannelList = channelList;
    }

    this.status.currentTitle = title;
    this.status.isPaused = false;
    this.notify();

    console.log(`📡 Enviando señal a la TV: ${title} (${url})`);

    // 1. Si estamos en la app nativa (APK Android)
    if (Capacitor.isNativePlatform()) {
      NativeCast.loadMedia({
        url,
        title,
        logo: logoUrl
      })
        .then(() => {
          console.log(`✅ Canal cambiado en la TV (NativeCast): ${title}`);
          this.status.isPaused = false;
          this.status.currentTitle = title;
          this.notify();
        })
        .catch((err) => {
          console.error('❌ Error NativeCast.loadMedia:', err);
        });
      return;
    }

    const session = this.currentSession || (this.castContext && this.castContext.getCurrentSession());
    const chrome = (window as any).chrome;

    if (session && chrome && chrome.cast && chrome.cast.media) {
      this.attachMediaSessionListener(session);
      this.loadSingleMedia(session, chrome, url, title, logoUrl);
      return;
    }

    // 2. Si está conectado mediante Presentation API (Android Chrome fallback)
    if (this.presentationConnection) {
      this.sendPresentationMedia(url, title, logoUrl);
    }
  }

  private loadSingleMedia(session: any, chrome: any, url: string, title: string, logoUrl?: string) {
    try {
      const isHls = url.includes('.m3u8') || url.includes('/hls/');
      const contentType = isHls ? 'application/x-mpegurl' : 'video/mp4';

      const mediaInfo = new chrome.cast.media.MediaInfo(url, contentType);
      mediaInfo.streamType = chrome.cast.media.StreamType.LIVE;

      const metadata = new chrome.cast.media.GenericMediaMetadata();
      metadata.title = title;
      metadata.subtitle = 'RinRinTV En Vivo';
      if (logoUrl) {
        metadata.images = [new chrome.cast.Image(logoUrl)];
      }
      mediaInfo.metadata = metadata;

      const request = new chrome.cast.media.LoadRequest(mediaInfo);
      request.autoplay = true;

      session.loadMedia(request).then(
        () => {
          console.log(`✅ Canal cambiado exitosamente en la TV: ${title}`);
          this.status.isPaused = false;
          this.status.currentTitle = title;
          this.notify();
        },
        (err: any) => {
          console.error('❌ Error loadMedia en Chromecast:', err);
        }
      );
    } catch (e) {
      console.error('Excepción al cargar media en Chromecast:', e);
    }
  }

  private sendPresentationMedia(url: string, title: string, logoUrl?: string) {
    if (!this.presentationConnection) return;

    const send = () => {
      try {
        const isHls = url.includes('.m3u8') || url.includes('/hls/');
        const message = {
          type: 'LOAD',
          requestId: Date.now(),
          media: {
            contentId: url,
            streamType: 'LIVE',
            contentType: isHls ? 'application/x-mpegurl' : 'video/mp4',
            metadata: {
              metadataType: 0,
              type: 0,
              title: title,
              subtitle: 'RinRinTV En Vivo',
              images: logoUrl ? [{ url: logoUrl }] : []
            }
          },
          autoplay: true,
          currentTime: 0
        };

        this.presentationConnection.send(JSON.stringify(message));
        console.log(`✅ Canal enviado vía PresentationConnection: ${title}`);
        this.status.isPaused = false;
        this.status.currentTitle = title;
        this.notify();
      } catch (e) {
        console.warn('Error enviando a PresentationConnection:', e);
      }
    };

    if (this.presentationConnection.state === 'connected') {
      send();
    } else {
      this.presentationConnection.onconnect = () => {
        send();
      };
    }
  }

  public nextChannel() {
    if (!this.lastChannelList || this.lastChannelList.length === 0) return;
    const currentIdx = this.lastChannelList.findIndex((ch) => ch.name === this.status.currentTitle);
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % this.lastChannelList.length;
    const nextCh = this.lastChannelList[nextIdx];
    this.loadMedia(nextCh.url, nextCh.name, nextCh.logo);
  }

  public prevChannel() {
    if (!this.lastChannelList || this.lastChannelList.length === 0) return;
    const currentIdx = this.lastChannelList.findIndex((ch) => ch.name === this.status.currentTitle);
    const prevIdx = currentIdx === -1 ? 0 : (currentIdx - 1 + this.lastChannelList.length) % this.lastChannelList.length;
    const prevCh = this.lastChannelList[prevIdx];
    this.loadMedia(prevCh.url, prevCh.name, prevCh.logo);
  }

  public play() {
    if (Capacitor.isNativePlatform()) {
      NativeCast.play();
      this.status.isPaused = false;
      this.notify();
      return;
    }
    const session = this.currentSession || (this.castContext && this.castContext.getCurrentSession());
    if (session) {
      const media = session.getMediaSession();
      if (media) {
        media.play(null, () => {
          this.status.isPaused = false;
          this.notify();
        }, null);
      }
    }
  }

  public pause() {
    if (Capacitor.isNativePlatform()) {
      NativeCast.pause();
      this.status.isPaused = true;
      this.notify();
      return;
    }
    const session = this.currentSession || (this.castContext && this.castContext.getCurrentSession());
    if (session) {
      const media = session.getMediaSession();
      if (media) {
        media.pause(null, () => {
          this.status.isPaused = true;
          this.notify();
        }, null);
      }
    }
  }

  public stop() {
    if (Capacitor.isNativePlatform()) {
      NativeCast.stop();
      this.status.isConnected = false;
      this.status.deviceName = null;
      this.status.currentTitle = null;
      this.notify();
      return;
    }
    const session = this.currentSession || (this.castContext && this.castContext.getCurrentSession());
    if (session) {
      session.endSession(true);
    }
    if (this.presentationConnection) {
      try {
        this.presentationConnection.terminate();
      } catch (e) {}
    }
    this.status.isConnected = false;
    this.status.deviceName = null;
    this.status.currentTitle = null;
    this.notify();
  }
}

export const castService = new CastService();
