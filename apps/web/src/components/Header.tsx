import React, { useState } from 'react';
import { Tv, Copy, Check, LogOut, Users, Loader2 } from 'lucide-react';
import { LiveKitConnectionStatus } from '../hooks/useLiveKitRoom';

interface HeaderProps {
  roomName?: string;
  connectionStatus?: LiveKitConnectionStatus;
  participantCount?: number;
  onLeave?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomName,
  connectionStatus = 'connected',
  participantCount,
  onLeave,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!roomName) return;
    try {
      await navigator.clipboard.writeText(roomName);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const renderStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">Conectado</span>
          </span>
        );
      case 'reconnecting':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[11px] font-medium">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            <span>Reconectando...</span>
          </span>
        );
      case 'connecting':
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 text-[11px] font-medium">
            <Loader2 className="w-3 h-3 animate-spin text-brand-400" />
            <span>Conectando...</span>
          </span>
        );
      case 'disconnected':
      default:
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Desconectado</span>
          </span>
        );
    }
  };

  return (
    <header className="border-b border-surface-border bg-surface/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Tv className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base sm:text-lg text-white tracking-tight">ScreenParty</span>
            <span className="text-[10px] font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30 px-1.5 py-0.5 rounded-full uppercase">
              V0.2
            </span>
            {renderStatusBadge()}
          </div>
          <p className="text-xs text-gray-400 hidden sm:block">Compartilhamento de tela e áudio em tempo real</p>
        </div>
      </div>

      {roomName && (
        <div className="flex items-center gap-2 sm:gap-3">
          {participantCount !== undefined && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-surface-elevated/70 border border-surface-border rounded-lg text-xs text-gray-300">
              <Users className="w-3.5 h-3.5 text-brand-400" />
              <span>{participantCount} {participantCount === 1 ? 'amigo' : 'amigos'}</span>
            </div>
          )}

          <div className="flex items-center bg-surface-elevated border border-surface-border rounded-lg px-2.5 sm:px-3 py-1.5 gap-2 text-xs">
            <span className="text-gray-400 hidden sm:inline">Sala:</span>
            <span className="font-mono font-medium text-brand-400">{roomName}</span>
            <button
              onClick={handleCopyCode}
              className="ml-1 p-1 text-gray-400 hover:text-white transition-colors"
              title="Copiar código da sala"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {onLeave && (
            <button
              onClick={onLeave}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair da Sala</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
