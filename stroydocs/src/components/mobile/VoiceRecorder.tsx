'use client';

import { useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { transcribeAudio } from '@/lib/voice/yandex-speechkit';

interface Props {
  onTranscript: (text: string) => void;
  className?: string;
}

type State = 'idle' | 'recording' | 'processing';

export function VoiceRecorder({ onTranscript, className }: Props) {
  const [state, setState] = useState<State>('idle');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState('processing');
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const text = await transcribeAudio(blob);
          if (text) onTranscript(text);
        } catch {
          // молча игнорируем ошибку транскрипции
        } finally {
          setState('idle');
        }
      };

      mediaRef.current = recorder;
      recorder.start();
      setState('recording');
    } catch {
      alert('Нет доступа к микрофону');
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    mediaRef.current = null;
  };

  const colorClass =
    state === 'recording' ? 'bg-red-500' : state === 'processing' ? 'bg-yellow-500' : 'bg-primary';

  return (
    <button
      type="button"
      onClick={state === 'recording' ? stop : state === 'idle' ? start : undefined}
      disabled={state === 'processing'}
      className={`rounded-full p-3 text-white ${colorClass} disabled:opacity-70 ${className ?? ''}`}
      aria-label={
        state === 'recording'
          ? 'Остановить запись'
          : state === 'processing'
          ? 'Обработка...'
          : 'Начать запись'
      }
    >
      {state === 'processing' ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : state === 'recording' ? (
        <Square className="h-5 w-5" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </button>
  );
}
