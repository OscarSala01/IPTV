// Integración robusta de Google Cast Web Sender SDK, Presentation API & HTML5 Remote Playback
// Compatible al 100% con Sony Bravia (Android TV / Google TV) y Chromecasts

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

  constructor() {
    this.initCastApi();
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

      const mediaSession = session.getMediaSession();
      if (mediaSession && mediaSession.media && mediaSession.media.metadata) {
        this.status.currentTitle = mediaSession.media.metadata.title || 'Canal de TV';
        this.status.isPaused = mediaSession.playerState === 'PAUSED';
      }
    } else {
      this.status.isConnected = false;
      this.status.deviceName = null;
      this.status.currentTitle = null;
    }

    this.notify();
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
    // 1. Google Cast SDK oficial (Default Media Receiver CC1AD845)
    if (this.castContext) {
      try {
        await this.castContext.requestSession();
        this.currentSession = this.castContext.getCurrentSession();
        if (this.currentSession) {
          const device = this.currentSession.getCastDevice();
          this.status.isConnected = true;
          this.status.deviceName = device?.friendlyName || 'Sony Bravia TV';
          this.notify();
          return true;
        }
      } catch (err: any) {
        console.log('Google Cast requestSession cancelado o probando Presentation...');
      }
    }

    // 2. Presentation API (Protocolo nativo que usa Chrome en Android)
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
        console.log('PresentationRequest dialog cerrado o fallback...');
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
   * Envía un stream HLS o MP4 a la TV
   */
  public castMedia(url: string, title: string, logoUrl?: string) {
    this.status.currentTitle = title;
    this.notify();

    const doLoad = () => {
      this.loadMedia(url, title, logoUrl);
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

  public loadMedia(url: string, title: string, logoUrl?: string) {
    this.status.currentTitle = title;
    this.notify();

    console.log(`📡 Enviando señal a la TV: ${title} (${url})`);

    // 1. Si está conectado mediante Google Cast SDK oficial
    const session = this.currentSession || (this.castContext && this.castContext.getCurrentSession());
    const chrome = (window as any).chrome;

    if (session && chrome && chrome.cast) {
      try {
        const isHls = url.includes('.m3u8') || url.includes('/hls/');
        const contentType = isHls ? 'application/x-mpegurl' : 'video/mp4';

        const mediaInfo = new chrome.cast.media.MediaInfo(url, contentType);
        mediaInfo.streamType = chrome.cast.media.StreamType.LIVE;

        const metadata = new chrome.cast.media.GenericMediaMetadata();
        metadata.title = title;
        metadata.subtitle = 'Transmitido desde RinRinTV';
        if (logoUrl) {
          metadata.images = [new chrome.cast.Image(logoUrl)];
        }
        mediaInfo.metadata = metadata;

        const request = new chrome.cast.media.LoadRequest(mediaInfo);
        request.autoplay = true;

        session.loadMedia(request).then(
          () => {
            console.log('✅ Canal cargado exitosamente en Sony TV / Chromecast');
            this.status.isPaused = false;
            this.notify();
          },
          (err: any) => {
            console.error('❌ Error loadMedia en Chromecast:', err);
          }
        );
      } catch (e) {
        console.error('Excepción al cargar media:', e);
      }
    }

    // 2. Si está conectado mediante Presentation API (Android Chrome)
    if (this.presentationConnection && this.presentationConnection.state === 'connected') {
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
        console.log('✅ Mensaje de reproducción enviado a PresentationConnection');
      } catch (e) {
        console.warn('Error enviando a PresentationConnection:', e);
      }
    }
  }

  public play() {
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
