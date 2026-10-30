import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw, ArrowLeft, UserPlus, KeyRound } from 'lucide-react';
import { DisconnectReason } from 'livekit-client';
import { Header } from '../components/Header';
import { VideoPlayer } from '../components/VideoPlayer';
import { AudioPlayer } from '../components/AudioPlayer';
import { ParticipantList } from '../components/ParticipantList';
import { AudioBanner } from '../components/AudioBanner';
import { Controls } from '../components/Controls';
import { useLiveKitRoom } from '../hooks/useLiveKitRoom';
import { useScreenShare } from '../hooks/useScreenShare';
import { requestRoomToken, TokenResponse } from '../services/api';
import { sanitizeRoomCode } from '../services/roomCode';

export const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const sanitizedRoomId = useMemo(() => (roomId ? sanitizeRoomCode(roomId) : ''), [roomId]);

  // Extrai chave de convite ou senha da URL e do router state
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlPasscode = searchParams.get('key') || searchParams.get('passcode') || '';

  const [passcode, setPasscode] = useState<string>(() => {
    const fromState = (location.state as { passcode?: string })?.passcode;
    return fromState || urlPasscode || '';
  });

  const [promptPasscode, setPromptPasscode] = useState<string>('');
  const [needsAuthPrompt, setNeedsAuthPrompt] = useState<boolean>(false);

  // Identificação do participante
  const [nickname, setNickname] = useState<string>(() => {
    const fromState = (location.state as { nickname?: string })?.nickname;
    if (fromState) return fromState;
    return localStorage.getItem('screenparty_nickname') || '';
  });

  const [promptNickname, setPromptNickname] = useState<string>('');
  const [identity] = useState<string>(() => {
    const randomHex = Math.random().toString(36).substring(2, 9);
    return `user_${randomHex}`;
  });

  // Controle de reprodução de áudio local do espectador
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const handleVolumeChange = useCallback((newVol: number) => {
    setVolume(newVol);
    if (newVol > 0) {
      setIsMuted(false);
    }
  }, []);

  // Estado do Token LiveKit
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Hook de compartilhamento de tela com captura nativa e preferências de qualidade
  const screenShare = useScreenShare();

  // Referência estável para a função de parar compartilhamento
  const stopSharingRef = useRef(screenShare.stopSharing);
  stopSharingRef.current = screenShare.stopSharing;

  // Callback de desconexão da sala 100% ESTÁVEL
  const handleDisconnected = useCallback((reason?: DisconnectReason) => {
    console.log('[ScreenParty][RoomPage] Callback handleDisconnected acionado. Reason:', reason);
    stopSharingRef.current();
  }, []);

  // Hook de conexão e WebRTC do LiveKit
  const livekit = useLiveKitRoom({
    serverUrl: tokenData?.serverUrl,
    token: tokenData?.token,
    roomName: sanitizedRoomId,
    onDisconnected: handleDisconnected,
  });

  // Função para buscar token do backend com suporte a autorização
  const fetchToken = useCallback(
    async (nickToUse: string, passcodeToUse?: string) => {
      if (!sanitizedRoomId) return;

      setTokenLoading(true);
      setTokenError(null);

      try {
        const response = await requestRoomToken({
          roomName: sanitizedRoomId,
          identity,
          name: nickToUse,
          passcode: passcodeToUse || passcode || undefined,
        });
        setTokenData(response);
        setNeedsAuthPrompt(false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Falha ao autenticar na sala.';
        const status = (err as { status?: number }).status;

        // Se for 401 ou erro de autorização, exibe o formulário de senha/chave
        if (status === 401 || status === 403 || message.includes('autorizado') || message.includes('senha') || message.includes('chave')) {
          setNeedsAuthPrompt(true);
        }
        setTokenError(message);
      } finally {
        setTokenLoading(false);
      }
    },
    [sanitizedRoomId, identity, passcode]
  );

  // Dispara busca do token assim que tiver apelido e roomId
  useEffect(() => {
    if (nickname && sanitizedRoomId && !tokenData && !tokenLoading && !tokenError && !needsAuthPrompt) {
      fetchToken(nickname, passcode);
    }
  }, [nickname, sanitizedRoomId, tokenData, tokenLoading, tokenError, needsAuthPrompt, passcode, fetchToken]);

  // Tratamento de envio de apelido se entrou via link direto sem apelido prévio
  const handleSetNickname = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNick = promptNickname.trim();
    if (!cleanNick) return;
    localStorage.setItem('screenparty_nickname', cleanNick);
    setNickname(cleanNick);
    fetchToken(cleanNick, passcode);
  };

  // Tratamento de envio de senha/chave de acesso caso a sala requeira autorização
  const handleSetPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = promptPasscode.trim();
    if (!cleanKey) return;
    setPasscode(cleanKey);
    setNeedsAuthPrompt(false);
    fetchToken(nickname, cleanKey);
  };

  // Iniciar compartilhamento de tela
  const handleStartSharing = async () => {
    try {
      const stream = await screenShare.startSharing(async () => {
        // Callback acionado se a tela parar pelo navegador nativo
        await livekit.unpublishScreenTracks();
      });

      if (!stream) return;

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks().length > 0 ? stream.getAudioTracks()[0] : null;

      await livekit.publishScreenTracks(videoTrack, audioTrack);
    } catch (err) {
      console.error('Erro ao iniciar compartilhamento na sala:', err);
      screenShare.stopSharing();
    }
  };

  // Parar compartilhamento de tela
  const handleStopSharing = async () => {
    await livekit.unpublishScreenTracks();
    screenShare.stopSharing();
  };

  // Sair da sala
  const handleLeaveRoom = () => {
    screenShare.stopSharing();
    livekit.leaveRoom();
    navigate('/');
  };

  // Caso não tenhamos apelido, solicita antes de conectar
  if (!nickname) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-surface max-w-md w-full rounded-2xl border border-surface-border p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-600/20 text-brand-400 flex items-center justify-center border border-brand-500/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Como podemos te chamar?</h2>
              <p className="text-xs text-gray-400">Você está prestes a entrar na sala {sanitizedRoomId}</p>
            </div>
          </div>

          <form onSubmit={handleSetNickname} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Seu Apelido</label>
              <input
                type="text"
                autoFocus
                required
                value={promptNickname}
                onChange={(e) => setPromptNickname(e.target.value)}
                placeholder="Ex: Carlos"
                maxLength={32}
                className="w-full bg-surface-elevated border border-surface-border rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-brand-600/25"
            >
              Entrar na Sala
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Se a sala requerer autorização (chave de convite ou senha)
  if (needsAuthPrompt) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="bg-surface max-w-md w-full rounded-2xl border border-surface-border p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Autorização da Sala</h2>
              <p className="text-xs text-gray-400">A sala {sanitizedRoomId} requer senha ou chave de convite</p>
            </div>
          </div>

          {tokenError && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
              {tokenError}
            </div>
          )}

          <form onSubmit={handleSetPasscode} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Senha ou Chave de Convite
              </label>
              <input
                type="password"
                autoFocus
                required
                value={promptPasscode}
                onChange={(e) => setPromptPasscode(e.target.value)}
                placeholder="Digite a senha ou cole a chave de convite"
                className="w-full bg-surface-elevated border border-surface-border rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-brand-600/25"
              >
                Autorizar e Entrar
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2.5 bg-surface-elevated hover:bg-surface-border text-gray-300 text-sm font-medium rounded-xl border border-surface-border transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Estado de Carregamento inicial do Token
  if (tokenLoading || (livekit.isConnecting && !livekit.error)) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header
          roomName={sanitizedRoomId}
          connectionStatus={livekit.connectionStatus}
          participantCount={livekit.participants.length}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
          <h2 className="text-base font-semibold text-white mb-1">
            {tokenLoading ? 'Autenticando na sala...' : 'Conectando ao LiveKit Cloud...'}
          </h2>
          <p className="text-xs text-gray-400 max-w-sm">
            Estabelecendo canais seguros de áudio e vídeo de baixa latência para {sanitizedRoomId}.
          </p>
        </div>
      </div>
    );
  }

  // Estado de Erro de Conexão ou Token
  const activeError = tokenError || livekit.error;
  if (activeError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header
          roomName={sanitizedRoomId}
          connectionStatus="disconnected"
          participantCount={0}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Não foi possível conectar</h2>
          <p className="text-xs text-rose-300/90 leading-relaxed mb-6 bg-rose-500/5 p-3 rounded-xl border border-rose-500/20">
            {activeError}
          </p>
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={() => fetchToken(nickname, passcode)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-surface-elevated hover:bg-surface-border text-gray-300 rounded-xl text-xs font-semibold border border-surface-border transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Cabeçalho */}
      <Header
        roomName={sanitizedRoomId}
        connectionStatus={livekit.connectionStatus}
        participantCount={livekit.participants.length}
        onLeave={handleLeaveRoom}
      />

      {/* Áudio Player invisível para reprodução de faixas remotas sincronizadas */}
      <AudioPlayer
        tracks={livekit.activeAudioTracks}
        volume={volume}
        isMuted={isMuted}
        onAutoplayBlocked={() => livekit.unlockAudioPlayback()}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col gap-4">
        {/* Banner de status do áudio e de bloqueio de autoplay */}
        <AudioBanner
          isSharing={screenShare.isSharing}
          hasAudio={screenShare.hasAudio}
          audioStatusMessage={screenShare.audioStatusMessage}
          autoplayBlocked={livekit.autoplayBlocked}
          onUnlockAutoplay={livekit.unlockAudioPlayback}
        />

        {/* Erro de captura de tela se houver */}
        {screenShare.error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{screenShare.error}</span>
          </div>
        )}

        {/* Layout do Player e Lista de Participantes */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
          {/* Coluna Principal: Player de Vídeo e Controles */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <VideoPlayer
              mediaStreamTrack={livekit.activeScreenVideoTrack?.mediaStreamTrack || null}
              participantName={livekit.activeScreenVideoTrack?.participantName}
              isLocal={livekit.activeScreenVideoTrack?.isLocal}
              hasAudio={
                livekit.activeScreenVideoTrack?.isLocal
                  ? screenShare.hasAudio
                  : livekit.activeAudioTracks.length > 0
              }
              actualSettings={
                livekit.activeScreenVideoTrack?.isLocal ? screenShare.actualSettings : null
              }
              volume={volume}
              isMuted={isMuted}
              onVolumeChange={handleVolumeChange}
              onToggleMute={handleToggleMute}
            />

            {/* Barra de Controles com Qualidade, FPS e Compartilhamento */}
            <Controls
              isSharing={screenShare.isSharing}
              preferredResolution={screenShare.preferredResolution}
              preferredFps={screenShare.preferredFps}
              actualSettings={screenShare.actualSettings}
              onStartShare={handleStartSharing}
              onStopShare={handleStopSharing}
              onChangeQuality={screenShare.changeQuality}
              roomName={sanitizedRoomId}
            />
          </div>

          {/* Coluna Lateral: Participantes Conectados */}
          <div className="lg:col-span-1 min-h-[220px] lg:min-h-0">
            <ParticipantList participants={livekit.participants} />
          </div>
        </div>
      </main>
    </div>
  );
};
