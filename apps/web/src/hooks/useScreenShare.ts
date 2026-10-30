import { useState, useCallback, useRef } from 'react';

export type ResolutionProfile = '720p' | '1080p' | '1440p';
export type FpsProfile = 30 | 60;

export interface ActualTrackSettings {
  width?: number;
  height?: number;
  frameRate?: number;
  displaySurface?: string;
}

export interface ScreenShareState {
  isSharing: boolean;
  stream: MediaStream | null;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  hasAudio: boolean;
  audioStatusMessage: string | null;
  error: string | null;
  preferredResolution: ResolutionProfile;
  preferredFps: FpsProfile;
  actualSettings: ActualTrackSettings | null;
}

const RESOLUTION_PRESETS: Record<ResolutionProfile, { width: number; height: number }> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
};

export function useScreenShare() {
  const [preferredResolution, setPreferredResolution] = useState<ResolutionProfile>('1080p');
  const [preferredFps, setPreferredFps] = useState<FpsProfile>(60);

  const [state, setState] = useState<Omit<ScreenShareState, 'preferredResolution' | 'preferredFps'>>({
    isSharing: false,
    stream: null,
    videoTrack: null,
    audioTrack: null,
    hasAudio: false,
    audioStatusMessage: null,
    error: null,
    actualSettings: null,
  });

  const onStopCallbackRef = useRef<(() => void) | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const stopSharing = useCallback(() => {
    setState((prev) => {
      if (prev.stream) {
        prev.stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
      return {
        isSharing: false,
        stream: null,
        videoTrack: null,
        audioTrack: null,
        hasAudio: false,
        audioStatusMessage: null,
        error: null,
        actualSettings: null,
      };
    });

    videoTrackRef.current = null;

    if (onStopCallbackRef.current) {
      onStopCallbackRef.current();
    }
  }, []);

  // Extrai as configurações reais efetivamente aplicadas pelo navegador
  const extractTrackSettings = (track: MediaStreamTrack): ActualTrackSettings => {
    const s = track.getSettings();
    return {
      width: s.width,
      height: s.height,
      frameRate: s.frameRate ? Math.round(s.frameRate) : undefined,
      displaySurface: (s as { displaySurface?: string }).displaySurface,
    };
  };

  const startSharing = useCallback(
    async (onStop?: () => void): Promise<MediaStream | null> => {
      onStopCallbackRef.current = onStop || null;
      setState((prev) => ({ ...prev, error: null, audioStatusMessage: null }));

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          throw new Error('Seu navegador não suporta compartilhamento de tela via getDisplayMedia.');
        }

        const preset = RESOLUTION_PRESETS[preferredResolution];

        // Configuração de captura com preferências (não-garantidas, respeitando hardware/navegador)
        const displayMediaOptions: DisplayMediaStreamOptions = {
          video: {
            width: { ideal: preset.width, max: preset.width },
            height: { ideal: preset.height, max: preset.height },
            frameRate: { ideal: preferredFps, max: preferredFps },
          },
          audio: true,
          // @ts-expect-error - systemAudio é suportado por Chromium/Edge modernos
          systemAudio: 'include',
        };

        const mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

        const videoTracks = mediaStream.getVideoTracks();
        const audioTracks = mediaStream.getAudioTracks();

        if (videoTracks.length === 0) {
          throw new Error('Nenhuma faixa de vídeo foi capturada.');
        }

        const videoTrack = videoTracks[0];
        videoTrackRef.current = videoTrack;
        const audioTrack = audioTracks.length > 0 ? audioTracks[0] : null;
        const hasAudio = audioTrack !== null;

        const actual = extractTrackSettings(videoTrack);

        const audioMessage = hasAudio
          ? 'Áudio do sistema detectado e incluído na transmissão.'
          : 'Nenhuma faixa de áudio detectada nesta captura. Caso queira transmitir áudio, certifique-se de marcar "Compartilhar áudio" na janela de seleção do Chrome/Edge.';

        // Escutar quando o usuário interrompe pelo controle nativo do navegador
        videoTrack.onended = () => {
          stopSharing();
        };

        if (audioTrack) {
          audioTrack.onended = () => {
            setState((prev) => ({
              ...prev,
              audioTrack: null,
              hasAudio: false,
              audioStatusMessage: 'A faixa de áudio foi encerrada pelo navegador.',
            }));
          };
        }

        setState({
          isSharing: true,
          stream: mediaStream,
          videoTrack,
          audioTrack,
          hasAudio,
          audioStatusMessage: audioMessage,
          error: null,
          actualSettings: actual,
        });

        return mediaStream;
      } catch (err: unknown) {
        let errorMessage = 'Falha ao iniciar o compartilhamento de tela.';

        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') {
            errorMessage = 'Permissão de compartilhamento negada ou cancelada pelo usuário.';
          } else if (err.name === 'NotFoundError') {
            errorMessage = 'Nenhuma tela ou janela compatível encontrada para captura.';
          } else if (err.name === 'NotSupportedError') {
            errorMessage = 'Configuração de captura não suportada pelo navegador atual.';
          } else {
            errorMessage = `Erro do navegador ao capturar: ${err.message}`;
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        setState((prev) => ({
          ...prev,
          isSharing: false,
          error: errorMessage,
        }));

        return null;
      }
    },
    [preferredResolution, preferredFps, stopSharing]
  );

  // Alteração dinâmica de qualidade sem reiniciar a sala
  const changeQuality = useCallback(
    async (newResolution?: ResolutionProfile, newFps?: FpsProfile) => {
      const targetResolution = newResolution ?? preferredResolution;
      const targetFps = newFps ?? preferredFps;

      if (newResolution) setPreferredResolution(newResolution);
      if (newFps) setPreferredFps(newFps);

      const track = videoTrackRef.current;
      if (track && track.readyState === 'live') {
        const preset = RESOLUTION_PRESETS[targetResolution];
        try {
          // Aplica restrições de forma segura e não intrusiva
          await track.applyConstraints({
            width: { ideal: preset.width, max: preset.width },
            height: { ideal: preset.height, max: preset.height },
            frameRate: { ideal: targetFps, max: targetFps },
          });

          // Atualiza as medições efetivas confirmadas pelo track
          const actual = extractTrackSettings(track);
          setState((prev) => ({
            ...prev,
            actualSettings: actual,
          }));
        } catch (applyErr) {
          console.warn(
            'O navegador não permitiu reconfiguração dinâmica em tempo real para a tela capturada:',
            applyErr
          );
          // Mantém as medições vigentes
          const currentActual = extractTrackSettings(track);
          setState((prev) => ({
            ...prev,
            actualSettings: currentActual,
          }));
        }
      }
    },
    [preferredResolution, preferredFps]
  );

  return {
    ...state,
    preferredResolution,
    preferredFps,
    changeQuality,
    startSharing,
    stopSharing,
  };
}
