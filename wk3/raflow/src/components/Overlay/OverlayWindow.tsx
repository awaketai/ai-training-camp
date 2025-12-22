import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

interface TranscriptEvent {
  text: string;
  is_final: boolean;
}

export function OverlayWindow() {
  const [text, setText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isFinal, setIsFinal] = useState(false);

  useEffect(() => {
    const unlistenTranscript = listen<TranscriptEvent>(
      'transcript-update',
      (event) => {
        setText(event.payload.text);
        setIsFinal(event.payload.is_final);
      }
    );

    const unlistenAudio = listen<number>(
      'audio-level',
      (event) => {
        setAudioLevel(event.payload);
      }
    );

    return () => {
      unlistenTranscript.then((f) => f());
      unlistenAudio.then((f) => f());
    };
  }, []);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4">
      <div className="bg-black/80 backdrop-blur-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Audio Level Indicator */}
        <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-150"
          style={{ width: `${audioLevel * 100}%` }}
        />

        {/* Transcript Display */}
        <div className="p-6">
          {text ? (
            <div className={`text-white text-lg transition-opacity ${isFinal ? 'opacity-100' : 'opacity-70'}`}>
              {text}
            </div>
          ) : (
            <div className="text-gray-400 text-center text-sm">
              正在听...
            </div>
          )}
        </div>

        {/* Status Indicator */}
        <div className="px-6 pb-4 flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${audioLevel > 0.1 ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-xs text-gray-400">
            {audioLevel > 0.1 ? '正在说话' : '等待输入'}
          </span>
        </div>
      </div>
    </div>
  );
}
