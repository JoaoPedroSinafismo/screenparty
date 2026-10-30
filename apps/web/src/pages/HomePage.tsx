import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tv, Sparkles, LogIn, Plus, Shuffle, ArrowRight, ShieldCheck, Headphones, MonitorPlay } from 'lucide-react';
import { generateHighEntropyRoomCode, sanitizeRoomCode } from '../services/roomCode';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  // Estados dos formulários
  const [createNickname, setCreateNickname] = useState('');
  const [customRoomCode, setCustomRoomCode] = useState('');

  const [joinNickname, setJoinNickname] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Carrega apelido prévio caso exista
  useEffect(() => {
    const savedNick = localStorage.getItem('screenparty_nickname');
    if (savedNick) {
      setCreateNickname(savedNick);
      setJoinNickname(savedNick);
    }
  }, []);

  const handleGenerateRandomCode = () => {
    const code = generateHighEntropyRoomCode();
    setCustomRoomCode(code);
    setErrorMsg(null);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const nick = createNickname.trim();
    if (!nick) {
      setErrorMsg('Por favor, digite seu apelido para criar a sala.');
      return;
    }

    const room = customRoomCode.trim() ? sanitizeRoomCode(customRoomCode) : generateHighEntropyRoomCode();
    if (room.length < 3) {
      setErrorMsg('O código da sala deve ter pelo menos 3 caracteres.');
      return;
    }

    localStorage.setItem('screenparty_nickname', nick);
    navigate(`/room/${room}`, { state: { nickname: nick } });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const nick = joinNickname.trim();
    if (!nick) {
      setErrorMsg('Por favor, digite seu apelido para entrar na sala.');
      return;
    }

    const room = sanitizeRoomCode(joinRoomCode);
    if (!room || room.length < 3) {
      setErrorMsg('Informe um código de sala válido.');
      return;
    }

    localStorage.setItem('screenparty_nickname', nick);
    navigate(`/room/${room}`, { state: { nickname: nick } });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      {/* Barra de Navegação Simples */}
      <header className="px-6 py-4 border-b border-surface-border bg-surface/50 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-tight">ScreenParty</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
          <span>Etapa 2 (V0.2)</span>
        </div>
      </header>

      {/* Hero & Ações */}
      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-14 w-full">
        {/* Título de Apresentação */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Compartilhamento P2P ultrarrápido com LiveKit</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Assista e compartilhe telas com seus amigos
          </h1>
          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
            Transmita vídeos, apresentações e jogos com áudio sincronizado diretamente do navegador, sem downloads pesados.
          </p>
        </div>

        {/* Mensagem de Erro Geral */}
        {errorMsg && (
          <div className="max-w-md mx-auto mb-6 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Grade com Formulários de Criar e Entrar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Card: Criar Nova Sala */}
          <div className="bg-surface rounded-2xl border border-surface-border p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className="text-base font-semibold text-white">Criar Nova Sala</h2>
              </div>
              <p className="text-xs text-gray-400 mb-6">
                Inicie uma nova sala e convide amigos com um código seguro aleatório.
              </p>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Seu Apelido <span className="text-brand-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={createNickname}
                    onChange={(e) => setCreateNickname(e.target.value)}
                    placeholder="Ex: João"
                    maxLength={32}
                    className="w-full bg-surface-elevated border border-surface-border rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-300">
                      Código da Sala (Opcional)
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomCode}
                      className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
                    >
                      <Shuffle className="w-3 h-3" /> Gerar código aleatório
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customRoomCode}
                    onChange={(e) => setCustomRoomCode(e.target.value)}
                    placeholder="Ex: sp-9df8-k21p (em branco para aleatório)"
                    maxLength={48}
                    className="w-full bg-surface-elevated border border-surface-border rounded-xl px-3.5 py-2 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2"
                >
                  <span>Criar e Entrar na Sala</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-surface-border/50 text-[11px] text-gray-500">
              Códigos de sala são de alta entropia para conexões rápidas entre amigos.
            </div>
          </div>

          {/* Card: Entrar em Sala Existente */}
          <div className="bg-surface rounded-2xl border border-surface-border p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <LogIn className="w-4 h-4" />
                </div>
                <h2 className="text-base font-semibold text-white">Entrar em uma Sala</h2>
              </div>
              <p className="text-xs text-gray-400 mb-6">
                Recebeu um convite de um amigo? Digite o código e entre na transmissão.
              </p>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Seu Apelido <span className="text-brand-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={joinNickname}
                    onChange={(e) => setJoinNickname(e.target.value)}
                    placeholder="Ex: Maria"
                    maxLength={32}
                    className="w-full bg-surface-elevated border border-surface-border rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Código da Sala <span className="text-brand-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.target.value)}
                    placeholder="Ex: sp-7a9b-4k2x"
                    maxLength={48}
                    className="w-full bg-surface-elevated border border-surface-border rounded-xl px-3.5 py-2 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-brand-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 px-4 bg-surface-elevated hover:bg-surface-border border border-surface-border active:scale-[0.99] text-white font-medium text-sm rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <span>Entrar na Sala</span>
                  <LogIn className="w-4 h-4 text-indigo-400" />
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-surface-border/50 text-[11px] text-gray-500">
              Você pode testar abrindo outra aba do navegador neste mesmo computador.
            </div>
          </div>
        </div>

        {/* Recursos em Destaque */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 max-w-4xl mx-auto">
          <div className="p-4 rounded-xl bg-surface/40 border border-surface-border/60 flex items-start gap-3">
            <MonitorPlay className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-gray-200">Vídeo de Baixa Latência</h4>
              <p className="text-[11px] text-gray-400 mt-1">Transmissão WebRTC fluida através do LiveKit Media Server.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface/40 border border-surface-border/60 flex items-start gap-3">
            <Headphones className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-gray-200">Detecção Real de Áudio</h4>
              <p className="text-[11px] text-gray-400 mt-1">Verificação precisa de faixas de som do sistema no Chrome e Edge.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-surface/40 border border-surface-border/60 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-semibold text-gray-200">Segurança por Design</h4>
              <p className="text-[11px] text-gray-400 mt-1">Tokens com permissões mínimas e API secret isolada no backend.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-surface-border/50 text-center text-xs text-gray-500">
        ScreenParty &bull; Plataforma experimental V0.1 para testes locais
      </footer>
    </div>
  );
};

