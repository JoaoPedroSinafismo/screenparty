import React from 'react';
import { Users, Tv, UserCheck } from 'lucide-react';
import { ParticipantInfo } from '../hooks/useLiveKitRoom';

interface ParticipantListProps {
  participants: ParticipantInfo[];
}

export const ParticipantList: React.FC<ParticipantListProps> = ({ participants }) => {
  return (
    <div className="bg-surface rounded-2xl border border-surface-border p-4 flex flex-col h-full shadow-lg">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-surface-border">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-400" />
          <h3 className="text-sm font-semibold text-white">Participantes</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-elevated text-gray-300 font-medium">
          {participants.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {participants.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-6">
            Nenhum outro participante conectado.
          </div>
        ) : (
          participants.map((p) => {
            const initials = p.name
              ? p.name.substring(0, 2).toUpperCase()
              : p.identity.substring(0, 2).toUpperCase();

            return (
              <div
                key={p.identity}
                className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated/60 hover:bg-surface-elevated border border-surface-border/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600/40 to-surface-border flex items-center justify-center font-bold text-xs text-brand-300 border border-brand-500/30 flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium text-gray-200 truncate">{p.name}</p>
                      {p.isLocal && (
                        <span className="text-[10px] bg-brand-500/20 text-brand-400 px-1 rounded flex-shrink-0">
                          você
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono truncate block">
                      ID: {p.identity.slice(0, 10)}...
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {p.isSharingScreen && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      <Tv className="w-3 h-3 animate-pulse" />
                      <span className="hidden sm:inline">Ao vivo</span>
                    </span>
                  )}
                  {p.isLocal && <UserCheck className="w-3.5 h-3.5 text-gray-500" />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

