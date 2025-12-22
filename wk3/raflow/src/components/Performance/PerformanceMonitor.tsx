import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

interface PerformanceMetrics {
  uptime_secs: number;
  audio_packets_processed: number;
  audio_packets_dropped: number;
  audio_drop_rate: number;
  avg_audio_processing_us: number;
  ws_messages_sent: number;
  ws_messages_received: number;
  ws_bytes_sent: number;
  ws_bytes_received: number;
  ws_reconnects: number;
  partial_transcripts: number;
  committed_transcripts: number;
  transcript_latency_ms: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  errors_total: number;
  errors_retried: number;
  errors_recovered: number;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isHealthy, setIsHealthy] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 2000); // Update every 2 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchMetrics = async () => {
    try {
      const [metricsData, healthStatus] = await Promise.all([
        invoke<PerformanceMetrics>('get_performance_metrics'),
        invoke<boolean>('check_system_health'),
      ]);
      setMetrics(metricsData);
      setIsHealthy(healthStatus);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl space-y-6">
      {/* Health Status */}
      <Card className={isHealthy ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isHealthy ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                <span className="text-white text-xl">{isHealthy ? '✓' : '✗'}</span>
              </div>
              <div>
                <h3 className={`font-semibold ${isHealthy ? 'text-green-900' : 'text-red-900'}`}>
                  系统状态: {isHealthy ? '健康' : '异常'}
                </h3>
                <p className={`text-sm ${isHealthy ? 'text-green-700' : 'text-red-700'}`}>
                  运行时间: {formatUptime(metrics.uptime_secs)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                自动刷新
              </label>
              <button
                onClick={fetchMetrics}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                刷新
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Audio Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">音频处理</CardTitle>
            <CardDescription>音频采集和处理指标</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricRow
              label="处理的数据包"
              value={metrics.audio_packets_processed.toLocaleString()}
            />
            <MetricRow
              label="丢弃的数据包"
              value={metrics.audio_packets_dropped.toLocaleString()}
              alert={metrics.audio_drop_rate > 1}
            />
            <MetricRow
              label="丢包率"
              value={`${metrics.audio_drop_rate.toFixed(2)}%`}
              alert={metrics.audio_drop_rate > 1}
            />
            <MetricRow
              label="平均处理时间"
              value={`${metrics.avg_audio_processing_us}μs`}
            />
          </CardContent>
        </Card>

        {/* Network Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">网络通信</CardTitle>
            <CardDescription>WebSocket 连接指标</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricRow
              label="发送消息"
              value={metrics.ws_messages_sent.toLocaleString()}
            />
            <MetricRow
              label="接收消息"
              value={metrics.ws_messages_received.toLocaleString()}
            />
            <MetricRow label="发送数据" value={formatBytes(metrics.ws_bytes_sent)} />
            <MetricRow label="接收数据" value={formatBytes(metrics.ws_bytes_received)} />
            <MetricRow
              label="重连次数"
              value={metrics.ws_reconnects.toString()}
              alert={metrics.ws_reconnects > 3}
            />
          </CardContent>
        </Card>

        {/* Transcription Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">转写性能</CardTitle>
            <CardDescription>实时转写指标</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricRow
              label="部分转写"
              value={metrics.partial_transcripts.toLocaleString()}
            />
            <MetricRow
              label="完整转写"
              value={metrics.committed_transcripts.toLocaleString()}
            />
            <MetricRow
              label="转写延迟"
              value={`${metrics.transcript_latency_ms}ms`}
              alert={metrics.transcript_latency_ms > 500}
            />
          </CardContent>
        </Card>

        {/* System Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">系统资源</CardTitle>
            <CardDescription>内存和 CPU 使用情况</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricRow
              label="内存使用"
              value={`${metrics.memory_usage_mb} MB`}
              alert={metrics.memory_usage_mb > 100}
            />
            <MetricRow label="CPU 使用" value={`${metrics.cpu_usage_percent}%`} />
            <MetricRow label="总错误数" value={metrics.errors_total.toString()} />
            <MetricRow label="重试次数" value={metrics.errors_retried.toString()} />
            <MetricRow
              label="恢复次数"
              value={metrics.errors_recovered.toString()}
            />
          </CardContent>
        </Card>
      </div>

      {/* Performance Tips */}
      {!isHealthy && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-900">性能提示</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-yellow-800 space-y-2">
            {metrics.audio_drop_rate > 1 && (
              <p>• 音频丢包率较高，建议关闭其他占用音频的应用</p>
            )}
            {metrics.transcript_latency_ms > 500 && (
              <p>• 转写延迟较高，请检查网络连接</p>
            )}
            {metrics.memory_usage_mb > 100 && (
              <p>• 内存使用较高，建议重启应用</p>
            )}
            {metrics.ws_reconnects > 3 && (
              <p>• 网络连接不稳定，请检查网络状态</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricRow({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      <span
        className={`font-mono font-semibold ${
          alert ? 'text-red-600' : 'text-gray-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
