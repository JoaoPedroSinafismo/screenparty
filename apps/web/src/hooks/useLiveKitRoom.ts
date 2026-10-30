import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  DisconnectReason,
  ConnectionState,
} from 'livekit-client';

export interface ParticipantInfo {
  identity: string;
  name: string;
  isLocal: boolean;
  isSharingScreen: boolean;
}

export interface RemoteMediaTrack {
  participantIdentity: string;
  participantName: string;
  track: RemoteTrack;
  kind: 'video' | 'audio';
  source: Track.Source;
}

export type LiveKitConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export interface UseLiveKitRoomOptions {
  serverUrl?: string;
  token?: string;
  roomName: string;
  onDisconnected?: (reason?: DisconnectReason) => void;
}

let globalHookIdCounter = 0;

function formatDisconnectReason(reason?: DisconnectReason): string {
  if (reason === undefined) {
    return 'Não especificado (undefined)';
  }
  const reasonName = DisconnectReason[reason] || 'DESCONHECIDO';
  return `${reasonName} (código ${reason})`;
}

export function useLiveKitRoom({ serverUrl, token, roomName, onDisconnected }: UseLiveKitRoomOptions) {
  // 1. Identificador único local para esta instância do hook
  const hookIdRef = useRef<number>(0);
  if (hookIdRef.current === 0) {
    globalHookIdCounter += 1;
    hookIdRef.current = globalHookIdCounter;
  }
  const hookId = hookIdRef.current;

  // Estados reativos da sala
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<LiveKitConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [activeScreenVideoTrack, setActiveScreenVideoTrack] = useState<{
    participantIdentity: string;
    participantName: string;
    mediaStreamTrack: MediaStreamTrack;
    isLocal: boolean;
  } | null>(null);

  const [activeAudioTracks, setActiveAudioTracks] = useState<{
    id: string;
    mediaStreamTrack: MediaStreamTrack;
    participantName: string;
  }[]>([]);

  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // 2. Instância estável da Room do LiveKit e fila sequencial de operações
  const roomRef = useRef<Room | null>(null);
  const localPublicationsRef = useRef<Map<string, string>>(new Map());
  const sequenceQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastConnectedTokenRef = useRef<string | null>(null);

  // Referência estável para o callback onDisconnected
  const onDisconnectedRef = useRef(onDisconnected);
  useEffect(() => {
    onDisconnectedRef.current = onDisconnected;
  }, [onDisconnected]);

  // Função para registrar stack trace de chamadas de disconnect iniciadas pela aplicação em dev
  const logAppDisconnect = useCallback(
    (origin: string, detail?: string) => {
      const msg = `[ScreenParty][Hook #${hookId}] disconnect() disparado pela aplicação via [${origin}]${
        detail ? `: ${detail}` : ''
      }`;
      if (import.meta.env.DEV) {
        const stack = new Error().stack;
        console.warn(`${msg}\nStack trace:\n${stack}`);
      } else {
        console.log(msg);
      }
    },
    [hookId]
  );

  // Enfileira operações assíncronas para garantir execução estritamente sequencial (evita sobreposição)
  const queueOperation = useCallback(
    (opName: string, op: () => Promise<void>) => {
      const queued = sequenceQueueRef.current.then(async () => {
        console.log(`[ScreenParty][Hook #${hookId}][Fila] Executando: ${opName}`);
        await op();
      }).catch((err) => {
        console.error(`[ScreenParty][Hook #${hookId}][Fila] Erro em ${opName}:`, err);
      });
      sequenceQueueRef.current = queued;
      return queued;
    },
    [hookId]
  );

  // Inicialização e obtenção da instância única e estável do Room
  const getOrCreateRoom = useCallback((): Room => {
    if (!roomRef.current) {
      console.log(`[ScreenParty][Hook #${hookId}] Criando instância Room LiveKit estável.`);
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: false,
          noiseSuppression: false,
        },
      });

      // Registra os listeners de eventos uma única vez na instância estável
      room.on(RoomEvent.Connected, () => {
        console.log(`[ScreenParty][Hook #${hookId}] Evento RoomEvent.Connected recebido.`);
        setIsConnecting(false);
        setIsConnected(true);
        setConnectionStatus('connected');
        updateParticipantsList();
      });

      room.on(RoomEvent.Reconnecting, () => {
        console.log(`[ScreenParty][Hook #${hookId}] Evento RoomEvent.Reconnecting recebido.`);
        setConnectionStatus('reconnecting');
      });

      room.on(RoomEvent.Reconnected, () => {
        console.log(`[ScreenParty][Hook #${hookId}] Evento RoomEvent.Reconnected recebido.`);
        setConnectionStatus('connected');
        setIsConnected(true);
        setIsConnecting(false);
        updateParticipantsList();
      });

      room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        const formatted = formatDisconnectReason(reason);
        console.log(`[ScreenParty][Hook #${hookId}] Evento RoomEvent.Disconnected recebido. Motivo: ${formatted}`);

        setIsConnected(false);
        setIsConnecting(false);
        setConnectionStatus('disconnected');
        setActiveScreenVideoTrack(null);
        setActiveAudioTracks([]);

        if (reason === DisconnectReason.DUPLICATE_IDENTITY) {
          console.warn(`[ScreenParty][Hook #${hookId}] Conexão derrubada por identidade duplicada (DUPLICATE_IDENTITY).`);
          setError('Conexão encerrada: outra sessão conectou com o mesmo identificador nesta sala.');
        }

        if (onDisconnectedRef.current) {
          onDisconnectedRef.current(reason);
        }
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        console.log(`[ScreenParty][Hook #${hookId}] Participante entrou.`);
        updateParticipantsList();
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        console.log(`[ScreenParty][Hook #${hookId}] Participante saiu.`);
        updateParticipantsList();
      });

      room.on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
          console.log(`[ScreenParty][Hook #${hookId}] TrackSubscribed: ${track.kind} (${publication.source})`);

          if (track.kind === Track.Kind.Video && publication.source === Track.Source.ScreenShare) {
            setActiveScreenVideoTrack({
              participantIdentity: participant.identity,
              participantName: participant.name || participant.identity,
              mediaStreamTrack: track.mediaStreamTrack,
              isLocal: false,
            });
          }

          if (track.kind === Track.Kind.Audio) {
            setActiveAudioTracks((prev) => {
              const filtered = prev.filter((t) => t.id !== track.sid);
              return [
                ...filtered,
                {
                  id: track.sid || Math.random().toString(),
                  mediaStreamTrack: track.mediaStreamTrack,
                  participantName: participant.name || participant.identity,
                },
              ];
            });
          }

          updateParticipantsList();
        }
      );

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        console.log(`[ScreenParty][Hook #${hookId}] TrackUnsubscribed: ${track.kind}`);

        if (track.kind === Track.Kind.Video) {
          setActiveScreenVideoTrack((current) => {
            if (current && current.mediaStreamTrack.id === track.mediaStreamTrack.id) {
              return null;
            }
            return current;
          });
        }

        if (track.kind === Track.Kind.Audio) {
          setActiveAudioTracks((prev) => prev.filter((t) => t.id !== track.sid));
        }

        updateParticipantsList();
      });

      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        if (!room.canPlaybackAudio) {
          console.log(`[ScreenParty][Hook #${hookId}] Autoplay de áudio bloqueado pelo navegador.`);
          setAutoplayBlocked(true);
        } else {
          setAutoplayBlocked(false);
        }
      });

      roomRef.current = room;
    }

    return roomRef.current;
  }, [hookId]);

  // Atualiza lista legível de participantes
  const updateParticipantsList = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    const list: ParticipantInfo[] = [];

    // Local
    if (room.localParticipant) {
      const local = room.localParticipant;
      const isSharing = Array.from(local.trackPublications.values()).some(
        (pub) => pub.source === Track.Source.ScreenShare
      );
      list.push({
        identity: local.identity,
        name: local.name || local.identity,
        isLocal: true,
        isSharingScreen: isSharing,
      });
    }

    // Remotos
    room.remoteParticipants.forEach((p) => {
      const isSharing = Array.from(p.trackPublications.values()).some(
        (pub) => pub.source === Track.Source.ScreenShare
      );
      list.push({
        identity: p.identity,
        name: p.name || p.identity,
        isLocal: false,
        isSharingScreen: isSharing,
      });
    });

    setParticipants(list);
  }, []);

  // Log do ciclo de vida geral do hook (Montagem / Desmontagem)
  useEffect(() => {
    console.log(`[ScreenParty][Hook #${hookId}] [Mount] Hook useLiveKitRoom montado.`);
    return () => {
      console.log(`[ScreenParty][Hook #${hookId}] [Unmount] Hook useLiveKitRoom desmontado.`);
      logAppDisconnect('useEffect unmount global', 'Componente que utiliza useLiveKitRoom foi desmontado');
      const room = roomRef.current;
      if (room) {
        room.disconnect();
        roomRef.current = null;
      }
    };
  }, [hookId, logAppDisconnect]);

  // Conectar à sala de forma sequencial e protegida contra dependências instáveis
  useEffect(() => {
    if (!serverUrl || !token) {
      return;
    }

    let isEffectCancelled = false;
    const currentToken = token;
    const currentUrl = serverUrl;

    console.log(`[ScreenParty][Hook #${hookId}] Effect de conexão acionado para sala "${roomName}" (server: ${currentUrl}).`);

    queueOperation(`connect-to-room(${roomName})`, async () => {
      if (isEffectCancelled) {
        console.log(`[ScreenParty][Hook #${hookId}] Operação de conexão cancelada antes de iniciar.`);
        return;
      }

      const room = getOrCreateRoom();

      // Se já estiver conectado ou conectando com o mesmo token e servidor, não recria
      if (
        lastConnectedTokenRef.current === currentToken &&
        (room.state === ConnectionState.Connected || room.state === ConnectionState.Connecting)
      ) {
        console.log(`[ScreenParty][Hook #${hookId}] Sala já conectada ou em conexão com os mesmos parâmetros. Ignorando chamada duplicada.`);
        return;
      }

      // Se havia outra conexão anterior ativa, desconecta primeiro
      if (room.state !== ConnectionState.Disconnected) {
        logAppDisconnect('pre-connect reset', 'Fechando conexão anterior antes de iniciar nova');
        await room.disconnect();
      }

      setIsConnecting(true);
      setConnectionStatus('connecting');
      setError(null);
      lastConnectedTokenRef.current = currentToken;

      console.log(`[ScreenParty][Hook #${hookId}] Iniciando handshake WebRTC com LiveKit...`);

      try {
        await room.connect(currentUrl, currentToken);

        if (isEffectCancelled) {
          logAppDisconnect('post-connect cancellation', 'Effect foi cancelado durante o handshake assíncrono');
          await room.disconnect();
          setConnectionStatus('disconnected');
          return;
        }

        console.log(`[ScreenParty][Hook #${hookId}] Handshake concluído. Conectado com sucesso.`);
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionStatus('connected');
        updateParticipantsList();
      } catch (err: unknown) {
        if (isEffectCancelled) return;

        console.error(`[ScreenParty][Hook #${hookId}] Erro ao conectar ao LiveKit:`, err);
        setIsConnecting(false);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setError(`Falha ao conectar ao servidor de vídeo (${currentUrl}). Certifique-se de que o LiveKit está em execução.`);
      }
    });

    return () => {
      isEffectCancelled = true;
      console.log(`[ScreenParty][Hook #${hookId}] Cleanup do effect de conexão acionado.`);

      queueOperation('cleanup-disconnect', async () => {
        const room = roomRef.current;
        if (room && (room.state === ConnectionState.Connected || room.state === ConnectionState.Connecting)) {
          logAppDisconnect('cleanup-disconnect', 'Desmontagem ou alteração de credenciais');
          await room.disconnect();
          setIsConnected(false);
          setIsConnecting(false);
          setConnectionStatus('disconnected');
          setActiveScreenVideoTrack(null);
          setActiveAudioTracks([]);
        }
      });
    };
  }, [serverUrl, token, roomName, hookId, getOrCreateRoom, queueOperation, logAppDisconnect, updateParticipantsList]);

  // Publicar faixas de tela e áudio
  const publishScreenTracks = useCallback(
    async (videoTrack: MediaStreamTrack, audioTrack: MediaStreamTrack | null) => {
      const room = roomRef.current;
      if (!room || !room.localParticipant) {
        throw new Error('Não há conexão ativa com a sala para publicar o compartilhamento.');
      }

      try {
        const localPart = room.localParticipant;

        // Publica vídeo de tela
        const videoPub = await localPart.publishTrack(videoTrack, {
          name: 'screen-video',
          source: Track.Source.ScreenShare,
        });

        if (videoPub && videoPub.trackSid) {
          localPublicationsRef.current.set('video', videoPub.trackSid);
        }

        // Se houver faixa de áudio do sistema/tela, publica vinculada
        if (audioTrack) {
          const audioPub = await localPart.publishTrack(audioTrack, {
            name: 'screen-audio',
            source: Track.Source.ScreenShareAudio,
          });
          if (audioPub && audioPub.trackSid) {
            localPublicationsRef.current.set('audio', audioPub.trackSid);
          }
        }

        // Atualiza a exibição local da tela compartilhada no próprio player
        setActiveScreenVideoTrack({
          participantIdentity: localPart.identity,
          participantName: 'Você (Sua Tela)',
          mediaStreamTrack: videoTrack,
          isLocal: true,
        });

        updateParticipantsList();
      } catch (err) {
        console.error(`[ScreenParty][Hook #${hookId}] Erro ao publicar faixas de tela no LiveKit:`, err);
        throw new Error('Falha ao transmitir o compartilhamento de tela para a sala.');
      }
    },
    [hookId, updateParticipantsList]
  );

  // Despublicar faixas de tela
  const unpublishScreenTracks = useCallback(async () => {
    const room = roomRef.current;
    if (!room || !room.localParticipant) return;

    try {
      const localPart = room.localParticipant;
      const promises: Promise<unknown>[] = [];

      localPart.trackPublications.forEach((publication) => {
        if (
          publication.source === Track.Source.ScreenShare ||
          publication.source === Track.Source.ScreenShareAudio
        ) {
          if (publication.track) {
            promises.push(localPart.unpublishTrack(publication.track));
          }
        }
      });

      await Promise.all(promises);

      setActiveScreenVideoTrack((curr) => (curr?.isLocal ? null : curr));
      localPublicationsRef.current.clear();
      updateParticipantsList();
    } catch (err) {
      console.warn(`[ScreenParty][Hook #${hookId}] Erro ao despublicar faixas:`, err);
    }
  }, [hookId, updateParticipantsList]);

  // Função para destravar autoplay de áudio
  const unlockAudioPlayback = useCallback(async () => {
    const room = roomRef.current;
    if (room) {
      await room.startAudio();
      setAutoplayBlocked(false);
    }
  }, []);

  // Sair da sala
  const leaveRoom = useCallback(() => {
    logAppDisconnect('leaveRoom', 'Ação explícita do usuário');
    queueOperation('leaveRoom', async () => {
      const room = roomRef.current;
      if (room) {
        await room.disconnect();
      }
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionStatus('disconnected');
      setActiveScreenVideoTrack(null);
      setActiveAudioTracks([]);
    });
  }, [logAppDisconnect, queueOperation]);

  return {
    isConnected,
    isConnecting,
    connectionStatus,
    error,
    participants,
    activeScreenVideoTrack,
    activeAudioTracks,
    autoplayBlocked,
    publishScreenTracks,
    unpublishScreenTracks,
    unlockAudioPlayback,
    leaveRoom,
  };
}
