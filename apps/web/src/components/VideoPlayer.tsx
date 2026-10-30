import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Maximize2,
  Minimize2,
  ScreenShare,
  Tv2,
  Volume2,
  Volume1,
  VolumeX,
  Scan,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { ActualTrackSettings } from '../hooks/useScreenShare';

interface VideoPlayerProps {
  mediaStreamTrack: MediaStreamTrack | null;
  participantName?: string;
  isLocal?: boolean;
  hasAudio?: boolean;
  actualSettings?: ActualTrackSettings | null;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (newVolume: number) => void;
  onToggleMute: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  mediaStreamTrack,
  participantName,
  isLocal,
  hasAudio,
  actualSettings,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimerRef = useRef<number | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [showControls, setShowControls] = useState(true);
  const [remoteSettings, setRemoteSettings] = useState<ActualTrackSettings | null>(null);

  // Monitora configurações reais do track (seja local ou recebido remotamente)
  useEffect(() => {
    if (!mediaStreamTrack) {
      setRemoteSettings(null);
      return;
    }

    const updateTrackMeasurements = () => {
      try {
        const s = mediaStreamTrack.getSettings();
        if (s.width || s.height || s.frameRate) {
          setRemoteSettings({
            width: s.width,
            height: s.height,
            frameRate: s.frameRate ? Math.round(s.frameRate) : undefined,
            displaySurface: (s as { displaySurface?: string }).displaySurface,
          });
        }
      } catch {
        // Ignora caso o navegador restrinja
      }
    };

    updateTrackMeasurements();
    // Reinspeciona após breve intervalo caso a resolução demore a negociar
    const timer = setTimeout(updateTrackMeasurements, 1500);

    return () => clearTimeout(timer);
  }, [mediaStreamTrack]);

  // Vincula o MediaStreamTrack ao elemento <video>
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    if (mediaStreamTrack) {
      const stream = new MediaStream([mediaStreamTrack]);
      videoEl.srcObject = stream;
      videoEl.play().catch((err) => {
        console.warn('Erro na reprodução automática do vídeo:', err);
      });
    } else {
      videoEl.srcObject = null;
    }

    return () => {
      if (videoEl) {
        videoEl.srcObject = null;
      }
    };
  }, [mediaStreamTrack]);

  // Gerenciamento de tela cheia nativa
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Alterna modo de ajuste (Ajustar vs Preencher)
  const toggleFitMode = () => {
    setFitMode((prev) => (prev === 'contain' ? 'cover' : 'contain'));
  };

  // Ocultar controles quando inativo por 3.5 segundos
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimerRef.current) {
      window.clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3500);
  }, []);

  const handleMouseMove = () => {
    resetHideTimer();
  };

  const handleMouseLeave = () => {
    setShowControls(false);
  };

  // Prioriza medições de hardware locais e depois as detectadas do track remoto
  const activeStats = actualSettings || remoteSettings;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex-1 w-full bg-black/95 rounded-2xl border border-surface-border overflow-hidden flex items-center justify-center min-h-[360px] sm:min-h-[480px] shadow-2xl group select-none"
    >
      {mediaStreamTrack ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal} // Sempre muta no transmissor para evitar microfonia/eco local
            className={`w-full h-full max-h-[82vh] transition-all duration-200 ${
              fitMode === 'contain' ? 'object-contain' : 'object-cover'
            }`}
          />

          {/* Overlay Superior: Status da transmissão e transmissor */}
          <div
            className={`absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="flex flex-wrap items-center gap-2 bg-surface/90 backdrop-blur-md border border-surface-border px-3 py-1.5 rounded-xl shadow-lg pointer-events-auto">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <Radio className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Ao Vivo:</span>
              </span>
              <span className="text-xs text-gray-200 font-medium truncate max-w-[180px]">
                {isLocal ? 'Você (Sua Tela)' : participantName || 'Participante'}
              </span>

              <div className="h-3 w-[1px] bg-surface-border mx-1" />

              {hasAudio ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <Volume2 className="w-3 h-3" /> Áudio Ativo
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                  <VolumeX className="w-3 h-3" /> Sem Áudio
                </span>
              )}
            </div>

            {/* Badges de Resolução e FPS medidos */}
            {activeStats && (activeStats.width || activeStats.frameRate) && (
              <div className="hidden sm:flex items-center gap-1.5 bg-surface/90 backdrop-blur-md border border-surface-border px-2.5 py-1 rounded-xl text-[11px] text-gray-300 font-mono shadow-lg pointer-events-auto">
                <SlidersHorizontal className="w-3 h-3 text-brand-400" />
                <span>
                  {activeStats.width && activeStats.height ? `${activeStats.width}x${activeStats.height}` : 'Resolução N/D'}
                </span>
                {activeStats.frameRate && (
                  <>
                    <span className="text-gray-600">&bull;</span>
                    <span className="text-brand-300">{activeStats.frameRate} FPS</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Overlay Inferior: Controles de Áudio, Ajuste e Tela Cheia */}
          <div
            className={`absolute bottom-4 left-4 right-4 flex items-center justify-between p-2.5 bg-surface/90 backdrop-blur-md border border-surface-border rounded-xl shadow-2xl transition-opacity duration-300 ${
              showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Lado Esquerdo: Controles de Áudio do Espectador */}
            <div className="flex items-center gap-3">
              {isLocal ? (
                <span className="text-[11px] text-gray-400 italic px-2">
                  (Áudio local silenciado para evitar eco acústico)
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onToggleMute}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-surface-elevated transition-colors"
                    title={isMuted ? 'Desmutar áudio' : 'Silenciar áudio'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4 text-brand-300" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                      className="w-18 sm:w-24 h-1.5 bg-surface-border rounded-lg appearance-none cursor-pointer accent-brand-500"
                      title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                    />
                    <span className="text-[10px] font-mono text-gray-400 w-7">
                      {Math.round((isMuted ? 0 : volume) * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Lado Direito: Ajuste de Imagem e Tela Cheia */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFitMode}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-surface-elevated rounded-lg transition-colors border border-surface-border/50"
                title={fitMode === 'contain' ? 'Alternar para preencher tela' : 'Alternar para ajustar proporção'}
              >
                <Scan className="w-3.5 h-3.5 text-brand-400" />
                <span className="hidden md:inline">
                  {fitMode === 'contain' ? 'Ajustar' : 'Preencher'}
                </span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 bg-surface-elevated hover:bg-surface-border text-gray-200 hover:text-white rounded-lg transition-colors border border-surface-border"
                title={isFullscreen ? 'Sair da tela cheia (Esc)' : 'Tela cheia (F)'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Estado Vazio */
        <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-surface-border flex items-center justify-center text-gray-500 mb-4 shadow-inner">
            <Tv2 className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-semibold text-gray-200 mb-1">Nenhuma transmissão em andamento</h3>
          <p className="text-xs text-gray-400 leading-relaxed mb-6">
            Aguardando algum participante iniciar o compartilhamento de tela. Você também pode compartilhar sua tela a qualquer momento clicando no botão abaixo.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-surface/60 border border-surface-border/50 px-3.5 py-1.5 rounded-full">
            <ScreenShare className="w-3.5 h-3.5 text-brand-400" />
            <span>Transmissão em até 1440p @ 60 FPS com áudio do sistema</span>
          </div>
        </div>
      )}
    </div>
  );
};
