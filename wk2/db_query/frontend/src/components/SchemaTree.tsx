/**
 * SchemaTree Component
 *
 * Displays database tables and columns in a tree structure.
 * Clicking a table expands to show its columns.
 */

import { useState, useEffect } from 'react';
import { Tree, Spin, Empty, Typography } from 'antd';
import {
  TableOutlined,
  KeyOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { databaseAPI } from '@/services/api';
import type { DatabaseMetadata, TableMetadata, ColumnMetadata } from '@/services/types';

const { Text } = Typography;

interface SchemaTreeProps {
  databaseName: string;
  onTableSelect?: (tableName: string) => void;
  onColumnSelect?: (tableName: string, columnName: string) => void;
}

export function SchemaTree({ databaseName, onTableSelect, onColumnSelect }: SchemaTreeProps) {
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<DatabaseMetadata | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    if (databaseName) {
      loadMetadata();
    } else {
      setMetadata(null);
    }
  }, [databaseName]);

  const loadMetadata = async () => {
    setLoading(true);
    try {
      const response = await databaseAPI.getDatabase(databaseName);
      setMetadata(response.metadata);
    } catch (err) {
      console.error('Failed to load metadata:', err);
      setMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  const getColumnIcon = (column: ColumnMetadata) => {
    if (column.isPrimaryKey) {
      return <KeyOutlined style={{ color: '#faad14' }} />;
    }
    if (column.isForeignKey) {
      return <LinkOutlined style={{ color: '#1890ff' }} />;
    }
    return null;
  };

  const buildTreeData = (): DataNode[] => {
    if (!metadata) return [];

    const tableNodes: DataNode[] = metadata.tables.map((table: TableMetadata) => ({
      key: `table-${table.name}`,
      title: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{table.name}</span>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ({table.columns.length})
          </Text>
        </span>
      ),
      icon: <TableOutlined style={{ color: '#1890ff' }} />,
      children: table.columns.map((column: ColumnMetadata) => ({
        key: `column-${table.name}-${column.name}`,
        title: (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{column.name}</span>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {column.dataType}
              {!column.nullable && ' NOT NULL'}
            </Text>
          </span>
        ),
        icon: getColumnIcon(column),
        isLeaf: true,
      })),
    }));

    return tableNodes;
  };

  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    const key = selectedKeys[0]?.toString();
    if (!key) return;

    if (key.startsWith('table-')) {
      const tableName = key.replace('table-', '');
      onTableSelect?.(tableName);
      // Toggle expand on click
      if (expandedKeys.includes(key)) {
        setExpandedKeys(expandedKeys.filter(k => k !== key));
      } else {
        setExpandedKeys([...expandedKeys, key]);
      }
    } else if (key.startsWith('column-')) {
      const parts = key.replace('column-', '').split('-');
      const tableName = parts[0];
      const columnName = parts.slice(1).join('-');
      onColumnSelect?.(tableName, columnName);
    }
  };

  const handleExpand = (keys: React.Key[]) => {
    setExpandedKeys(keys);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin tip="Loading schema..." />
      </div>
    );
  }

  if (!databaseName) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Select a database"
        style={{ padding: '40px 0' }}
      />
    );
  }

  if (!metadata || metadata.tables.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No tables found"
        style={{ padding: '40px 0' }}
      />
    );
  }

  return (
    <Tree
      showIcon
      treeData={buildTreeData()}
      expandedKeys={expandedKeys}
      onExpand={handleExpand}
      onSelect={handleSelect}
      style={{ padding: '8px 0' }}
    />
  );
}
