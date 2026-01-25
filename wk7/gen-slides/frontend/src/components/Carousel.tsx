import { useEffect, useCallback, useRef, useState } from "react";
import { imageUrl } from "../api/client";
import type { Slide } from "../types";

interface CarouselProps {
  slides: Slide[];
  startIndex: number;
  sid: string;
  onExit: () => void;
}

export function Carousel({ slides, startIndex, sid, onExit }: CarouselProps) {
  const currentIndexRef = useRef(startIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);
  const indexStateRef = useRef(startIndex);
  const progressIntervalRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const autoPlayDuration = 5000; // 5 seconds

  const updateDisplay = useCallback((index: number) => {
    indexStateRef.current = index;
    currentIndexRef.current = index;
    const container = containerRef.current;
    if (!container) return;

    const images = container.querySelectorAll("[data-slide-image]");
    images.forEach((img, i) => {
      (img as HTMLElement).style.display = i === index ? "flex" : "none";
    });

    const counter = container.querySelector("[data-slide-counter]");
    if (counter) {
      counter.textContent = `${index + 1} / ${slides.length}`;
    }

    // Reset progress bar when changing slides
    setProgress(0);

    // Restart progress interval
    if (progressIntervalRef.current !== null) {
      clearInterval(progressIntervalRef.current);
    }
    const progressUpdateInterval = 50;
    const progressStep = (100 / autoPlayDuration) * progressUpdateInterval;
    progressIntervalRef.current = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + progressStep;
        return next >= 100 ? 100 : next;
      });
    }, progressUpdateInterval);
  }, [slides.length, autoPlayDuration]);

  const goNext = useCallback(() => {
    const nextIndex = (indexStateRef.current + 1) % slides.length;
    updateDisplay(nextIndex);
  }, [slides.length, updateDisplay]);

  const goPrev = useCallback(() => {
    const prevIndex = (indexStateRef.current - 1 + slides.length) % slides.length;
    updateDisplay(prevIndex);
  }, [slides.length, updateDisplay]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
      } else if (e.key === "ArrowRight") {
        goNext();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onExit, goNext, goPrev]);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      goNext();
    }, autoPlayDuration);

    // Initialize progress on mount
    const progressUpdateInterval = 50;
    const progressStep = (100 / autoPlayDuration) * progressUpdateInterval;
    progressIntervalRef.current = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + progressStep;
        return next >= 100 ? 100 : next;
      });
    }, progressUpdateInterval);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      if (progressIntervalRef.current !== null) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [goNext, autoPlayDuration]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.requestFullscreen?.().catch(() => {
        // Fullscreen may not be available in all contexts
      });
    }

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        onExit();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [onExit]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
    >
      {slides.map((slide, i) => (
        <div
          key={slide.index}
          data-slide-image
          className="absolute inset-0 items-center justify-center"
          style={{ display: i === startIndex ? "flex" : "none" }}
        >
          {slide.current_image ? (
            <img
              src={imageUrl(sid, slide.current_image)}
              alt={`Slide ${slide.index + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="text-white text-2xl text-center p-8">
              {slide.text}
            </div>
          )}
        </div>
      ))}

      <div
        data-slide-counter
        className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full"
      >
        {startIndex + 1} / {slides.length}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div
          className="h-full bg-white transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <button
        onClick={goPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>

      <button
        onClick={goNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2"
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
      </button>

      <button
        onClick={onExit}
        className="absolute top-4 right-4 text-white/70 hover:text-white p-2"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </div>
  );
}
