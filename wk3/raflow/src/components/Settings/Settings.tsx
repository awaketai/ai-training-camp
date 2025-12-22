import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';

interface DeviceInfo {
  name: string;
  is_default: boolean;
}

interface SettingsProps {
  onStartRecording: (apiKey: string, deviceName?: string) => void;
  onStopRecording: () => void;
  isRecording: boolean;
}

export function Settings({ onStartRecording, onStopRecording, isRecording }: SettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDevices();
    loadSavedApiKey();
  }, []);

  const loadDevices = async () => {
    try {
      const deviceList = await invoke<DeviceInfo[]>('list_audio_devices');
      setDevices(deviceList);

      // Select default device
      const defaultDevice = deviceList.find(d => d.is_default);
      if (defaultDevice) {
        setSelectedDevice(defaultDevice.name);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const loadSavedApiKey = () => {
    const saved = localStorage.getItem('elevenlabs_api_key');
    if (saved) {
      setApiKey(saved);
    }
  };

  const saveApiKey = () => {
    localStorage.setItem('elevenlabs_api_key', apiKey);
  };

  const handleStartRecording = async () => {
    if (!apiKey) {
      alert('Please enter your ElevenLabs API key');
      return;
    }

    setLoading(true);
    saveApiKey();

    try {
      await onStartRecording(apiKey, selectedDevice || undefined);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert(`Failed to start: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>RAFlow 设置</CardTitle>
          <CardDescription>
            配置您的语音转写设置
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">ElevenLabs API Key</Label>
            <input
              id="apiKey"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isRecording}
            />
            <p className="text-xs text-gray-500">
              您可以在 <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">elevenlabs.io</a> 获取 API 密钥
            </p>
          </div>

          {/* Audio Device Selection */}
          <div className="space-y-2">
            <Label htmlFor="device">音频输入设备</Label>
            <select
              id="device"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              disabled={isRecording}
            >
              {devices.map((device) => (
                <option key={device.name} value={device.name}>
                  {device.name} {device.is_default ? '(默认)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-4 pt-4">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                disabled={loading || !apiKey}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '启动中...' : '开始录音'}
              </button>
            ) : (
              <button
                onClick={onStopRecording}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                停止录音
              </button>
            )}
          </div>

          {/* Status */}
          {isRecording && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-700 font-medium">
                  正在录音中...
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
