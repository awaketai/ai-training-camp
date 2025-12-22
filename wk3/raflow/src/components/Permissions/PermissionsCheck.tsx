import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface PermissionInfo {
  microphone: 'granted' | 'denied' | 'notdetermined' | 'unknown';
  accessibility: 'granted' | 'denied' | 'notdetermined' | 'unknown';
  all_granted: boolean;
}

export function PermissionsCheck() {
  const [permissions, setPermissions] = useState<PermissionInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const perms = await invoke<PermissionInfo>('check_permissions');
      setPermissions(perms);
    } catch (error) {
      console.error('Failed to check permissions:', error);
    }
  };

  const requestPermission = async (type: 'microphone' | 'accessibility') => {
    setLoading(true);
    try {
      await invoke('request_permissions', { permissionType: type });
      // Wait a bit for user to grant permission, then recheck
      setTimeout(() => {
        checkPermissions();
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to request permission:', error);
      setLoading(false);
    }
  };

  if (!permissions) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">检查权限中...</div>
        </CardContent>
      </Card>
    );
  }

  if (permissions.all_granted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-green-900">所有权限已授予</h3>
              <p className="text-sm text-green-700">
                RAFlow 可以正常使用所有功能
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-900">需要系统权限</CardTitle>
        <CardDescription className="text-yellow-700">
          RAFlow 需要以下权限才能正常工作
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Microphone Permission */}
        {permissions.microphone !== 'granted' && (
          <div className="p-4 bg-white rounded-lg border border-yellow-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  🎤 麦克风访问
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  需要访问麦克风以进行语音转写
                </p>
                <div className="text-xs text-gray-500">
                  状态: {getStatusText(permissions.microphone)}
                </div>
              </div>
              <button
                onClick={() => requestPermission('microphone')}
                disabled={loading}
                className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                {loading ? '打开中...' : '授予权限'}
              </button>
            </div>
          </div>
        )}

        {/* Accessibility Permission */}
        {permissions.accessibility !== 'granted' && (
          <div className="p-4 bg-white rounded-lg border border-yellow-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  ⌨️ 辅助功能访问
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  需要辅助功能权限以将文本注入到其他应用
                </p>
                <div className="text-xs text-gray-500">
                  状态: {getStatusText(permissions.accessibility)}
                </div>
              </div>
              <button
                onClick={() => requestPermission('accessibility')}
                disabled={loading}
                className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
              >
                {loading ? '打开中...' : '授予权限'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 提示：点击按钮将打开系统偏好设置，请在弹出的窗口中授予相应权限，
            然后返回此应用。
          </p>
        </div>

        <button
          onClick={checkPermissions}
          className="w-full mt-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          重新检查权限
        </button>
      </CardContent>
    </Card>
  );
}

function getStatusText(status: string): string {
  switch (status) {
    case 'granted':
      return '✓ 已授予';
    case 'denied':
      return '✗ 已拒绝';
    case 'notdetermined':
      return '⚠ 未确定';
    default:
      return '? 未知';
  }
}
