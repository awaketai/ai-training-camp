/**
 * Database Detail Page
 *
 * Displays database connection details and metadata browser.
 */

import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Space,
  Tag,
  Typography,
  message,
  Spin,
} from 'antd';
import {
  RollbackOutlined,
  ReloadOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { databaseAPI, getErrorMessage } from '@/services/api';
import type { DatabaseConnection, DatabaseMetadata, ConnectionStatus } from '@/services/types';
import { ErrorDisplay } from '@/components/ErrorDisplay';
import { DatabaseMetadataBrowser } from '@/components/DatabaseMetadataBrowser';

const { Title } = Typography;

export function DatabaseDetailPage() {
  const navigate = useNavigate();
  const { name } = useParams<{ name: string }>();
  const [connection, setConnection] = useState<DatabaseConnection | null>(null);
  const [metadata, setMetadata] = useState<DatabaseMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const loadDatabase = async () => {
    if (!name) return;

    setLoading(true);
    setError(null);

    try {
      const response = await databaseAPI.getDatabase(name);
      setConnection(response.connection);
      setMetadata(response.metadata);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabase();
  }, [name]);

  const handleRefreshMetadata = async () => {
    if (!name) return;

    setRefreshing(true);
    try {
      const freshMetadata = await databaseAPI.refreshMetadata(name);
      setMetadata(freshMetadata);
      message.success('Metadata refreshed successfully');
      // Reload connection to get updated timestamps
      loadDatabase();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'disconnected':
        return 'default';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!connection) {
    return (
      <div style={{ padding: '24px' }}>
        <ErrorDisplay error={new Error('Database not found')} />
        <Button
          icon={<RollbackOutlined />}
          onClick={() => navigate('/databases')}
          style={{ marginTop: 16 }}
        >
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card
          title={
            <Title level={3}>
              <DatabaseOutlined /> {connection.name}
            </Title>
          }
          extra={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefreshMetadata}
                loading={refreshing}
                disabled={connection.status === 'error'}
              >
                Refresh Metadata
              </Button>
              <Button
                icon={<RollbackOutlined />}
                onClick={() => navigate('/databases')}
              >
                Back
              </Button>
            </Space>
          }
        >
          {error && <ErrorDisplay error={error} />}

          <Descriptions bordered column={2}>
            <Descriptions.Item label="Database Name">
              <strong>{connection.name}</strong>
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color="blue">{connection.databaseType.toUpperCase()}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(connection.status)}>
                {connection.status.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {new Date(connection.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Last Connected">
              {connection.lastConnectedAt
                ? new Date(connection.lastConnectedAt).toLocaleString()
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Metadata Refreshed">
              {connection.lastMetadataRefresh
                ? new Date(connection.lastMetadataRefresh).toLocaleString()
                : '-'}
            </Descriptions.Item>
            {connection.errorMessage && (
              <Descriptions.Item label="Error" span={2}>
                <Tag color="error">{connection.errorMessage}</Tag>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <DatabaseMetadataBrowser metadata={metadata} loading={refreshing} />
      </Space>
    </div>
  );
}
