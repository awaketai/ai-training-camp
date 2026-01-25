import { create } from "zustand";
import type { Slide } from "../types";
import * as slidesApi from "../api/slides";
import * as imagesApi from "../api/images";
import * as styleApi from "../api/style";

interface SlidesState {
  sid: string;
  slides: Slide[];
  currentSlideIndex: number;
  isPlaying: boolean;
  styleImage: string | null;
  showStylePopup: boolean;
  styleOptions: string[];
  generatingSlides: Set<number>;
  styleGenerating: boolean;
  error: string | null;
}

interface SlidesActions {
  setSid: (sid: string) => void;
  loadSlides: (sid: string) => Promise<void>;
  selectSlide: (index: number) => void;
  updateSlideText: (index: number, text: string) => Promise<void>;
  reorderSlides: (order: number[]) => Promise<void>;
  addSlide: (text: string, position?: number) => Promise<void>;
  deleteSlide: (index: number) => Promise<void>;
  generateImage: (index: number) => Promise<void>;
  pollImageStatus: (index: number) => void;
  generateStyleOptions: (description: string) => Promise<void>;
  selectStyle: (imageIndex: number) => Promise<void>;
  dismissStylePopup: () => void;
  startPlayback: () => void;
  stopPlayback: () => void;
  nextSlide: () => void;
  prevSlide: () => void;
}

type SlidesStore = SlidesState & SlidesActions;

export const useSlidesStore = create<SlidesStore>((set, get) => ({
  sid: "",
  slides: [],
  currentSlideIndex: 0,
  isPlaying: false,
  styleImage: null,
  showStylePopup: false,
  styleOptions: [],
  generatingSlides: new Set(),
  styleGenerating: false,
  error: null,

  setSid: (sid: string) => set({ sid }),

  loadSlides: async (sid: string) => {
    try {
      const data = await slidesApi.fetchSlides(sid);
      if (import.meta.env.DEV) {
        console.log(`[SlidesStore] Loaded slides for ${sid}:`, data.slides.length, 'slides');
        console.log(`[SlidesStore] Current images:`, data.slides.map((s, i) => `${i}:${s.current_image || 'none'}`).join(', '));
      }
      set({
        sid: data.sid,
        slides: data.slides,
        styleImage: data.style_image,
        showStylePopup: data.style_image === null,
        error: null,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load slides";
      set({ error: message });
      if (import.meta.env.DEV) {
        console.error("[SlidesStore] loadSlides error:", e);
      }
    }
  },

  selectSlide: (index: number) => set({ currentSlideIndex: index }),

  updateSlideText: async (index: number, text: string) => {
    const { sid } = get();
    try {
      await slidesApi.updateSlideText(sid, index, text);
      await get().loadSlides(sid);
      set({ error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update text";
      set({ error: message });
      if (import.meta.env.DEV) {
        console.error("[SlidesStore] updateSlideText error:", e);
      }
    }
  },

  reorderSlides: async (order: number[]) => {
    const { sid } = get();
    try {
      await slidesApi.reorderSlides(sid, order);
      await get().loadSlides(sid);
      set({ error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to reorder slides";
      set({ error: message });
      if (import.meta.env.DEV) {
        console.error("[SlidesStore] reorderSlides error:", e);
      }
    }
  },

  addSlide: async (text: string, position?: number) => {
    const { sid } = get();
    try {
      await slidesApi.addSlide(sid, text, position);
      await get().loadSlides(sid);
      set({ error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to add slide";
      set({ error: message });
      if (import.meta.env.DEV) {
        console.error("[SlidesStore] addSlide error:", e);
      }
    }
  },

  deleteSlide: async (index: number) => {
    const { sid, currentSlideIndex, slides } = get();
    try {
      await slidesApi.deleteSlide(sid, index);
      // Adjust current slide index if needed
      let newIndex = currentSlideIndex;
      if (index === currentSlideIndex && slides.length > 1) {
        // If deleting current slide, move to previous or next
        newIndex = index > 0 ? index - 1 : 0;
      } else if (index < currentSlideIndex) {
        // If deleting before current, adjust index
        newIndex = currentSlideIndex - 1;
      }
      set({ currentSlideIndex: newIndex });
      await get().loadSlides(sid);
      set({ error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete slide";
      set({ error: message });
      if (import.meta.env.DEV) {
        console.error("[SlidesStore] deleteSlide error:", e);
      }
    }
  },

  generateImage: async (index: number) => {
    const { sid } = get();
    set((state) => {
      const generating = new Set(state.generatingSlides);
      generating.add(index);
      return { generatingSlides: generating, error: null };
    });
    try {
      await imagesApi.generateImage(sid, index);
      get().pollImageStatus(index);
    } catch (e) {
      set((state) => {
        const generating = new Set(state.generatingSlides);
        generating.delete(index);
        return { generatingSlides: generating };
      });
      const message = e instanceof Error ? e.message : "Failed to generate image";
      set({ error: message });
      if (import.meta.env.DEV) {
        console.error("[SlidesStore] generateImage error:", e);
      }
    }
  },

  pollImageStatus: (index: number) => {
    const { sid } = get();
    if (import.meta.env.DEV) {
      console.log(`[SlidesStore] Start polling image status for slide ${index}`);
    }
    const intervalId = setInterval(async () => {
      try {
        const status = await imagesApi.getImageStatus(sid, index);
        if (import.meta.env.DEV) {
          console.log(`[SlidesStore] Poll slide ${index}: generating=${status.generating}, latest_hash=${status.latest_hash}`);
        }
        if (!status.generating) {
          clearInterval(intervalId);
          set((state) => {
            const generating = new Set(state.generatingSlides);
            generating.delete(index);
            return { generatingSlides: generating };
          });
          if (import.meta.env.DEV) {
            console.log(`[SlidesStore] Image generation complete for slide ${index}, reloading slides...`);
          }
          await get().loadSlides(sid);
          if (import.meta.env.DEV) {
            console.log(`[SlidesStore] Slides reloaded after image generation`);
          }
        }
      } catch (e) {
        clearInterval(intervalId);
        set((state) => {
          const generating = new Set(state.generatingSlides);
          generating.delete(index);
          return { generatingSlides: generating };
        });
        if (import.meta.env.DEV) {
          console.error("[SlidesStore] pollImageStatus error:", e);
        }
      }
    }, 2000);
  },

  generateStyleOptions: async (description: string) => {
    const { sid } = get();
    set({ styleGenerating: true, error: null });
    try {
      const response = await styleApi.generateStyleOptions(sid, description);
      set({ styleOptions: response.images, styleGenerating: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to generate style";
      set({ styleGenerating: false, error: message });
      if (import.meta.env.DEV) {
        console.error("[SlidesStore] generateStyleOptions error:", e);
      }
    }
  },

  selectStyle: async (imageIndex: number) => {
    const { sid } = get();
    try {
      const response = await styleApi.selectStyle(sid, imageIndex);
      set({
        styleImage: response.style_image,
        showStylePopup: false,
        styleOptions: [],
        error: null,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to select style";
      set({ error: message });
      if (import.meta.env.DEV) {
        console.error("[SlidesStore] selectStyle error:", e);
      }
    }
  },

  dismissStylePopup: () => set({ showStylePopup: false }),

  startPlayback: () => set({ isPlaying: true }),

  stopPlayback: () => set({ isPlaying: false }),

  nextSlide: () =>
    set((state) => ({
      currentSlideIndex: (state.currentSlideIndex + 1) % state.slides.length,
    })),

  prevSlide: () =>
    set((state) => ({
      currentSlideIndex:
        (state.currentSlideIndex - 1 + state.slides.length) % state.slides.length,
    })),
}));
