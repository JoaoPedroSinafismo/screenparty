import React, { useState } from 'react';
import {
  ScreenShare,
  StopCircle,
  Share2,
  Check,
  Loader2,
  Settings2,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  ResolutionProfile,
  FpsProfile,
  ActualTrackSettings,
} from '../hooks/useScreenShare';

interface ControlsProps {
  isSharing: boolean;
  isLoading?: boolean;
  preferredResolution: ResolutionProfile;
  preferredFps: FpsProfile;
  actualSettings?: ActualTrackSettings | null;
  onStartShare: () => void;
  onStopShare: () => void;
  onChangeQuality: (res?: ResolutionProfile, fps?: FpsProfile) => void;
  roomName: string;
}

export const Controls: React.FC<ControlsProps> = ({
  isSharing,
  isLoading,
  preferredResolution,
  preferredFps,
  actualSettings,
  onStartShare,
  onStopShare,
  onChangeQuality,
  roomName,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleCopyInvite = async () => {
    try {
      const fullUrl = window.location.href;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-surface rounded-2xl border border-surface-border shadow-xl">
      {/* Linha Principal de Ações */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isSharing ? (
            <button
              onClick={onStopShare}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <StopCircle className="w-4 h-4" />
              )}
              <span>Parar Compartilhamento</span>
            </button>
          ) : (
            <button
              onClick={onStartShare}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-brand-600/25 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ScreenShare className="w-4 h-4" />
              )}
              <span>Compartilhar Tela com Áudio</span>
            </button>
          )}

          {/* Botão de Abrir Painel de Qualidade */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-colors ${
              showSettings
                ? 'bg-brand-600/20 text-brand-300 border-brand-500/40'
                : 'bg-surface-elevated hover:bg-surface-border text-gray-300 border-surface-border'
            }`}
            title="Configurações de resolução e taxa de quadros (FPS)"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Qualidade:</span>
            <span className="font-mono text-white">{preferredResolution}</span>
            <span className="text-gray-500">&bull;</span>
            <span className="font-mono text-white">{preferredFps}fps</span>
          </button>
        </div>

        {/* Botão de Convidar Amigos */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyInvite}
            className="flex items-center gap-2 px-3 py-2 bg-surface-elevated hover:bg-surface-border text-gray-200 text-xs sm:text-sm font-medium rounded-xl border border-surface-border transition-colors"
            title={`Copiar link da sala ${roomName} para convidar amigos`}
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Link Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-brand-400" />
                <span>Convidar Amigos</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Painel Expansível de Configurações de Qualidade de Vídeo */}
      {showSettings && (
        <div className="p-3.5 bg-surface-elevated/70 border border-surface-border rounded-xl flex flex-col gap-3 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Seletor de Resolução */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Resolução:</span>
              <div className="flex rounded-lg bg-surface border border-surface-border p-0.5">
                {(['720p', '1080p', '1440p'] as ResolutionProfile[]).map((res) => (
                  <button
                    key={res}
                    onClick={() => onChangeQuality(res, undefined)}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                      preferredResolution === res
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {res}
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor de Taxa de Quadros (FPS) */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Taxa de Quadros:</span>
              <div className="flex rounded-lg bg-surface border border-surface-border p-0.5">
                {([30, 60] as FpsProfile[]).map((fps) => (
                  <button
                    key={fps}
                    onClick={() => onChangeQuality(undefined, fps)}
                    className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-colors ${
                      preferredFps === fps
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {fps} FPS
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Nota técnica transparente */}
          <div className="flex items-start gap-2 pt-2 border-t border-surface-border/40 text-[11px] text-gray-400">
            <Sparkles className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span>
                As preferências acima orientam o navegador via WebRTC. A resolução e taxa efetivas dependem das dimensões nativas da tela ou janela capturada e da capacidade do hardware.
              </span>
              {isSharing && actualSettings && (
                <div className="mt-1 flex items-center gap-2 font-mono text-emerald-400 font-semibold">
                  <Sliders className="w-3 h-3" />
                  <span>
                    Medição real efetiva: {actualSettings.width}x{actualSettings.height} @ {actualSettings.frameRate || '-'} FPS
                    {actualSettings.displaySurface && ` (superfície: ${actualSettings.displaySurface})`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
