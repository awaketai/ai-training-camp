import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Settings } from './components/Settings/Settings';
import { TextInjectionTest } from './components/Settings/TextInjectionTest';
import { OverlayWindow } from './components/Overlay/OverlayWindow';
import { PermissionsCheck } from './components/Permissions/PermissionsCheck';
import { PerformanceMonitor } from './components/Performance/PerformanceMonitor';
import './App.css';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState('permissions');

  const handleStartRecording = async (apiKey: string, deviceName?: string) => {
    try {
      console.log('Starting recording with:', { apiKey: apiKey.substring(0, 10) + '...', deviceName });
      await invoke('start_recording', {
        apiKey,
        deviceName: deviceName || null,
      });
      console.log('Recording started successfully');
      setIsRecording(true);
      setActiveTab('overlay');
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert(`启动录音失败: ${error}`);
      throw error;
    }
  };

  const handleStopRecording = async () => {
    try {
      await invoke('stop_recording');
      setIsRecording(false);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            RAFlow
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            实时语音转写系统
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-5">
            <TabsTrigger value="permissions">权限</TabsTrigger>
            <TabsTrigger value="settings">转写设置</TabsTrigger>
            <TabsTrigger value="test">文本注入</TabsTrigger>
            <TabsTrigger value="overlay" disabled={!isRecording}>
              转写界面
            </TabsTrigger>
            <TabsTrigger value="performance">性能监控</TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="mt-6">
            <div className="container mx-auto p-8 max-w-2xl">
              <PermissionsCheck />
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Settings
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              isRecording={isRecording}
            />
          </TabsContent>

          <TabsContent value="test" className="mt-6">
            <TextInjectionTest />
          </TabsContent>

          <TabsContent value="overlay" className="mt-6">
            {isRecording && (
              <div className="relative min-h-[400px]">
                <OverlayWindow />
                <div className="text-center mt-8">
                  <button
                    onClick={handleStopRecording}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    停止录音
                  </button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <PerformanceMonitor />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>使用 Tauri + ElevenLabs Scribe 构建</p>
        </div>
      </div>
    </div>
  );
}

export default App;
