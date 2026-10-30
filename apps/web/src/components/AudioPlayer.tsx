import React, { useEffect, useRef } from 'react';

export interface AudioTrackItem {
  id: string;
  mediaStreamTrack: MediaStreamTrack;
  participantName: string;
}

export interface AudioPlayerProps {
  tracks: AudioTrackItem[];
  volume?: number;      // 0.0 a 1.0 (controle de volume local do espectador)
  isMuted?: boolean;    // silenciamento local do espectador
  onAutoplayBlocked?: () => void;
}

const SingleAudioStream: React.FC<{
  track: MediaStreamTrack;
  volume: number;
  isMuted: boolean;
  onAutoplayBlocked?: () => void;
}> = ({ track, volume, isMuted, onAutoplayBlocked }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Vincula o MediaStreamTrack ao elemento de áudio
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const stream = new MediaStream([track]);
    audioEl.srcObject = stream;

    const playPromise = audioEl.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        // NotAllowedError ocorre quando a política de autoplay do navegador exige interação do usuário
        if (err.name === 'NotAllowedError' && onAutoplayBlocked) {
          onAutoplayBlocked();
        }
      });
    }

    return () => {
      if (audioEl) {
        audioEl.srcObject = null;
      }
    };
  }, [track, onAutoplayBlocked]);

  // Aplica volume e silenciamento no elemento de áudio de forma reativa
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const safeVolume = Math.max(0, Math.min(1, volume));
    audioEl.volume = isMuted ? 0 : safeVolume;
    audioEl.muted = isMuted;
  }, [volume, isMuted]);

  return <audio ref={audioRef} autoPlay playsInline />;
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  tracks,
  volume = 1,
  isMuted = false,
  onAutoplayBlocked,
}) => {
  return (
    <div className="hidden" aria-hidden="true">
      {tracks.map((item) => (
        <SingleAudioStream
          key={item.id}
          track={item.mediaStreamTrack}
          volume={volume}
          isMuted={isMuted}
          onAutoplayBlocked={onAutoplayBlocked}
        />
      ))}
    </div>
  );
};
