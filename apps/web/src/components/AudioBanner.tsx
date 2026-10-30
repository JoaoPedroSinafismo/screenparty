import React from 'react';
import { Volume2, AlertTriangle, VolumeX } from 'lucide-react';

interface AudioBannerProps {
  isSharing: boolean;
  hasAudio: boolean;
  audioStatusMessage: string | null;
  autoplayBlocked: boolean;
  onUnlockAutoplay: () => void;
}

export const AudioBanner: React.FC<AudioBannerProps> = ({
  isSharing,
  hasAudio,
  audioStatusMessage,
  autoplayBlocked,
  onUnlockAutoplay,
}) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Alerta de Autoplay bloqueado pelo navegador */}
      {autoplayBlocked && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs shadow-md animate-bounce-subtle">
          <div className="flex items-center gap-2.5">
            <VolumeX className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              O navegador bloqueou a reprodução automática de som dos outros participantes.
            </span>
          </div>
          <button
            onClick={onUnlockAutoplay}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg text-xs transition-colors shadow-sm ml-2 flex-shrink-0"
          >
            Ouvir Áudio
          </button>
        </div>
      )}

      {/* Banner de status do áudio da tela compartilhada localmente */}
      {isSharing && (
        <div>
          {hasAudio ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
              <Volume2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                <strong>Áudio detectado:</strong> {audioStatusMessage || 'Faixa de som da tela/janela transmitida com sucesso.'}
              </span>
            </div>
          ) : (
            <div className="flex items-start sm:items-center gap-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="leading-relaxed">
                <strong>Sem áudio na captura:</strong> O navegador não detectou faixa de áudio. Caso queira transmitir som de vídeos ou jogos, verifique se a opção <em>&quot;Compartilhar áudio&quot;</em> foi marcada ao selecionar a tela/aba no Chrome ou Edge.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

