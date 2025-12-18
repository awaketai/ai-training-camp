/**
 * Database List Page
 *
 * Displays all configured database connections with their status.
 */

import { useState, useEffect } from 'react';
import {
  Button,
  Card,
  Space,
  Table,
  Tag,
  Typography,
  Popconfirm,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
  ReloadOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { databaseAPI, getErrorMessage } from '@/services/api';
import type { DatabaseConnection, ConnectionStatus } from '@/services/types';
import { ErrorDisplay } from '@/components/ErrorDisplay';

const { Title } = Typography;

export function DatabaseListPage() {
  const navigate = useNavigate();
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const loadDatabases = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await databaseAPI.listDatabases();
      setDatabases(response.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabases();
  }, []);

  const handleDelete = async (name: string) => {
    try {
      await databaseAPI.deleteDatabase(name);
      message.success(`Database "${name}" deleted successfully`);
      loadDatabases();
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleRefreshMetadata = async (name: string) => {
    try {
      await databaseAPI.refreshMetadata(name);
      message.success(`Metadata refreshed for "${name}"`);
      loadDatabases();
    } catch (err) {
      message.error(getErrorMessage(err));
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

  const columns: ColumnsType<DatabaseConnection> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span>
          <DatabaseOutlined /> <strong>{name}</strong>
        </span>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'databaseType',
      key: 'databaseType',
      render: (type: string) => <Tag color="blue">{type.toUpperCase()}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: ConnectionStatus) => (
        <Tag color={getStatusColor(status)}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Last Connected',
      dataIndex: 'lastConnectedAt',
      key: 'lastConnectedAt',
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: 'Metadata Refreshed',
      dataIndex: 'lastMetadataRefresh',
      key: 'lastMetadataRefresh',
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/databases/${record.name}`)}
          >
            View
          </Button>
          <Button
            type="link"
            icon={<ReloadOutlined />}
            onClick={() => handleRefreshMetadata(record.name)}
            disabled={record.status === 'error'}
          >
            Refresh
          </Button>
          <Popconfirm
            title="Delete database connection?"
            description="This will remove the connection and cached metadata."
            onConfirm={() => handleDelete(record.name)}
            okText="Yes"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={<Title level={3}>Database Connections</Title>}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadDatabases}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/databases/create')}
            >
              Add Database
            </Button>
          </Space>
        }
      >
        {error && <ErrorDisplay error={error} />}

        <Table
          dataSource={databases}
          columns={columns}
          rowKey="name"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
