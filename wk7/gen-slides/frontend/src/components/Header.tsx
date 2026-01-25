interface HeaderProps {
  onPlay: () => void;
}

export function Header({ onPlay }: HeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <h1 className="text-xl font-bold text-gray-800">GenSlides</h1>
      <button
        onClick={onPlay}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        播放
      </button>
    </header>
  );
}
