import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

interface TranscriptEvent {
  text: string;
  is_final: boolean;
}

export function useTranscript() {
  const [text, setText] = useState('');
  const [isFinal, setIsFinal] = useState(false);

  useEffect(() => {
    const unlisten = listen<TranscriptEvent>('transcript-update', (event) => {
      setText(event.payload.text);
      setIsFinal(event.payload.is_final);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return { text, isFinal };
}

export function useAudioLevel() {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const unlisten = listen<number>('audio-level', (event) => {
      setLevel(event.payload);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return level;
}
