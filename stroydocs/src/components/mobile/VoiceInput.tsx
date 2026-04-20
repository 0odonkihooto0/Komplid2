'use client';

import { useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

interface Props {
  onTranscript: (text: string) => void;
  className?: string;
}

export function VoiceInput({ onTranscript, className }: Props) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const start = () => {
    const SR =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) {
      alert('Голосовой ввод не поддерживается в этом браузере');
      return;
    }

    const rec = new SR();
    rec.lang = 'ru-RU';
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscript(transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={`rounded-full p-3 text-white ${listening ? 'bg-red-500' : 'bg-primary'} ${className ?? ''}`}
      aria-label={listening ? 'Остановить запись' : 'Начать голосовой ввод'}
    >
      {listening ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </button>
  );
}
