import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';

interface WindowInfo {
  app_name: string;
  title: string;
  process_id: number;
}

export function TextInjectionTest() {
  const [testText, setTestText] = useState('Hello from RAFlow!');
  const [strategy, setStrategy] = useState<'auto' | 'keyboard' | 'clipboard'>('auto');
  const [activeWindow, setActiveWindow] = useState<WindowInfo | null>(null);
  const [injecting, setInjecting] = useState(false);
  const [message, setMessage] = useState('');

  const checkActiveWindow = async () => {
    try {
      const window = await invoke<WindowInfo>('get_active_window_info');
      setActiveWindow(window);
      setMessage(`检测到活跃窗口: ${window.app_name}`);
    } catch (error) {
      setMessage(`获取活跃窗口失败: ${error}`);
    }
  };

  const handleInjectText = async () => {
    if (!testText) {
      setMessage('请输入要注入的文本');
      return;
    }

    setInjecting(true);
    setMessage('');

    try {
      const strategyParam = strategy === 'auto' ? null : strategy;
      await invoke('inject_text', {
        text: testText,
        strategy: strategyParam,
      });
      setMessage('✓ 文本注入成功！');
    } catch (error) {
      setMessage(`✗ 注入失败: ${error}`);
    } finally {
      setInjecting(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>文本注入测试</CardTitle>
          <CardDescription>
            测试将文本注入到其他应用程序的功能
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Text Input */}
          <div className="space-y-2">
            <Label htmlFor="testText">测试文本</Label>
            <textarea
              id="testText"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              placeholder="输入要注入的文本..."
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
            />
          </div>

          {/* Strategy Selection */}
          <div className="space-y-2">
            <Label htmlFor="strategy">注入策略</Label>
            <select
              id="strategy"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
            >
              <option value="auto">自动选择（推荐）</option>
              <option value="keyboard">键盘模拟</option>
              <option value="clipboard">剪贴板粘贴</option>
            </select>
            <p className="text-xs text-gray-500">
              • 自动：根据文本长度和目标应用自动选择<br />
              • 键盘模拟：逐字符输入，兼容性最好<br />
              • 剪贴板：复制粘贴，速度最快
            </p>
          </div>

          {/* Active Window Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>当前活跃窗口</Label>
              <button
                onClick={checkActiveWindow}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                刷新
              </button>
            </div>
            {activeWindow ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div className="text-sm">
                  <div className="font-medium">{activeWindow.app_name}</div>
                  <div className="text-gray-600 truncate">{activeWindow.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    PID: {activeWindow.process_id}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-500">
                点击"检测活跃窗口"按钮
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={checkActiveWindow}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              检测活跃窗口
            </button>
            <button
              onClick={handleInjectText}
              disabled={injecting || !testText}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {injecting ? '注入中...' : '注入文本'}
            </button>
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={`p-3 rounded-md ${
                message.startsWith('✓')
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : message.startsWith('✗')
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-blue-50 border border-blue-200 text-blue-800'
              }`}
            >
              {message}
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">使用说明：</h4>
            <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
              <li>先点击"检测活跃窗口"确认要注入的目标应用</li>
              <li>切换到目标应用（如记事本、浏览器等）</li>
              <li>将光标放在要输入文本的位置</li>
              <li>快速切回本应用，点击"注入文本"</li>
              <li>文本将自动输入到目标应用中</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
