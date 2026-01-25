import { useEffect } from "react";
import { useSlidesStore } from "./stores/slidesStore";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { PreviewArea } from "./components/PreviewArea";
import { StylePopup } from "./components/StylePopup";
import { Carousel } from "./components/Carousel";

function getSidFromPath(): string {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[0] || "";
}

export default function App() {
  const sid = useSlidesStore((s) => s.sid);
  const slides = useSlidesStore((s) => s.slides);
  const currentSlideIndex = useSlidesStore((s) => s.currentSlideIndex);
  const isPlaying = useSlidesStore((s) => s.isPlaying);
  const showStylePopup = useSlidesStore((s) => s.showStylePopup);
  const styleOptions = useSlidesStore((s) => s.styleOptions);
  const styleGenerating = useSlidesStore((s) => s.styleGenerating);
  const generatingSlides = useSlidesStore((s) => s.generatingSlides);
  const error = useSlidesStore((s) => s.error);

  const loadSlides = useSlidesStore((s) => s.loadSlides);
  const selectSlide = useSlidesStore((s) => s.selectSlide);
  const updateSlideText = useSlidesStore((s) => s.updateSlideText);
  const reorderSlides = useSlidesStore((s) => s.reorderSlides);
  const generateImage = useSlidesStore((s) => s.generateImage);
  const generateStyleOptions = useSlidesStore((s) => s.generateStyleOptions);
  const selectStyle = useSlidesStore((s) => s.selectStyle);
  const dismissStylePopup = useSlidesStore((s) => s.dismissStylePopup);
  const startPlayback = useSlidesStore((s) => s.startPlayback);
  const stopPlayback = useSlidesStore((s) => s.stopPlayback);

  useEffect(() => {
    const pathSid = getSidFromPath();
    if (pathSid) {
      loadSlides(pathSid);
    }
  }, [loadSlides]);

  const currentSlide = slides[currentSlideIndex];
  const isCurrentGenerating = generatingSlides.has(currentSlideIndex);

  if (!sid) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            欢迎使用 GenSlides
          </h1>
          <p className="text-gray-600 mb-6">
            GenSlides 是一个 AI 驱动的演示文稿生成工具。请在 URL 中指定项目 ID 来访问您的演示文稿。
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">使用方法</h2>
            <p className="text-blue-700 mb-2">
              在浏览器地址栏中输入：
            </p>
            <code className="block bg-white px-3 py-2 rounded text-sm text-gray-800 border">
              http://localhost:5175/your-project-name
            </code>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">快速开始</h2>
            <p className="text-gray-600 mb-3">试试这个示例项目：</p>
            <a
              href="/demo-project"
              className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              打开示例项目 (demo-project)
            </a>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              提示：每个项目 ID 对应一个独立的演示文稿，您可以创建多个不同的项目。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <Header onPlay={startPlayback} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          slides={slides}
          currentIndex={currentSlideIndex}
          sid={sid}
          onSelect={selectSlide}
          onReorder={reorderSlides}
          onTextUpdate={updateSlideText}
        />
        <PreviewArea
          slide={currentSlide}
          sid={sid}
          isGenerating={isCurrentGenerating}
          onGenerate={() => generateImage(currentSlideIndex)}
        />
      </div>

      <StylePopup
        visible={showStylePopup}
        styleOptions={styleOptions}
        isGenerating={styleGenerating}
        onGenerate={generateStyleOptions}
        onSelect={selectStyle}
        onDismiss={dismissStylePopup}
      />

      {isPlaying && slides.length > 0 && (
        <Carousel
          slides={slides}
          startIndex={currentSlideIndex}
          sid={sid}
          onExit={stopPlayback}
        />
      )}
    </div>
  );
}
