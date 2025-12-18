/**
 * DatabaseMetadataBrowser Component
 *
 * Displays database metadata including tables, views, and columns.
 */

import { Card, Collapse, Empty, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DatabaseOutlined, TableOutlined, EyeOutlined } from '@ant-design/icons';
import type { DatabaseMetadata, TableMetadata, ViewMetadata, ColumnMetadata } from '@/services/types';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface DatabaseMetadataBrowserProps {
  metadata: DatabaseMetadata | null;
  loading?: boolean;
}

export function DatabaseMetadataBrowser({
  metadata,
  loading = false,
}: DatabaseMetadataBrowserProps) {
  if (!metadata && !loading) {
    return (
      <Empty
        description="No metadata available"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  if (!metadata) {
    return null;
  }

  return (
    <div>
      <Card
        title={
          <span>
            <DatabaseOutlined /> Database Metadata
          </span>
        }
        extra={
          <Text type="secondary">
            Extracted: {new Date(metadata.extractedAt).toLocaleString()}
          </Text>
        }
      >
        <Collapse defaultActiveKey={['tables']} ghost>
          {metadata.tables.length > 0 && (
            <Panel
              header={
                <span>
                  <TableOutlined /> Tables ({metadata.tables.length})
                </span>
              }
              key="tables"
            >
              <TableList tables={metadata.tables} />
            </Panel>
          )}

          {metadata.views.length > 0 && (
            <Panel
              header={
                <span>
                  <EyeOutlined /> Views ({metadata.views.length})
                </span>
              }
              key="views"
            >
              <ViewList views={metadata.views} />
            </Panel>
          )}
        </Collapse>

        {metadata.tables.length === 0 && metadata.views.length === 0 && (
          <Empty description="No tables or views found in this database" />
        )}
      </Card>
    </div>
  );
}

interface TableListProps {
  tables: TableMetadata[];
}

function TableList({ tables }: TableListProps) {
  return (
    <Collapse accordion ghost>
      {tables.map((table) => (
        <Panel
          header={
            <span>
              <strong>{table.name}</strong>
              {table.schema && <Text type="secondary"> ({table.schema})</Text>}
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {table.columns.length} columns
              </Tag>
              {table.primaryKey.length > 0 && (
                <Tag color="green">PK: {table.primaryKey.join(', ')}</Tag>
              )}
            </span>
          }
          key={table.name}
        >
          <ColumnDetails columns={table.columns} />
        </Panel>
      ))}
    </Collapse>
  );
}

interface ViewListProps {
  views: ViewMetadata[];
}

function ViewList({ views }: ViewListProps) {
  return (
    <Collapse accordion ghost>
      {views.map((view) => (
        <Panel
          header={
            <span>
              <strong>{view.name}</strong>
              {view.schema && <Text type="secondary"> ({view.schema})</Text>}
              <Tag color="purple" style={{ marginLeft: 8 }}>
                {view.columns.length} columns
              </Tag>
            </span>
          }
          key={view.name}
        >
          <ColumnDetails columns={view.columns} />
        </Panel>
      ))}
    </Collapse>
  );
}

interface ColumnDetailsProps {
  columns: ColumnMetadata[];
}

function ColumnDetails({ columns }: ColumnDetailsProps) {
  const columnTableColumns: ColumnsType<ColumnMetadata> = [
    {
      title: 'Column Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ColumnMetadata) => (
        <span>
          <strong>{name}</strong>
          {record.isPrimaryKey && <Tag color="gold" style={{ marginLeft: 8 }}>PK</Tag>}
          {record.isForeignKey && <Tag color="cyan" style={{ marginLeft: 8 }}>FK</Tag>}
        </span>
      ),
    },
    {
      title: 'Data Type',
      dataIndex: 'dataType',
      key: 'dataType',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: 'Nullable',
      dataIndex: 'nullable',
      key: 'nullable',
      render: (nullable: boolean) => (
        <Tag color={nullable ? 'default' : 'red'}>
          {nullable ? 'YES' : 'NOT NULL'}
        </Tag>
      ),
    },
    {
      title: 'Default',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
      render: (value: string | null) => value || '-',
    },
    {
      title: 'Comment',
      dataIndex: 'comment',
      key: 'comment',
      render: (comment: string | null) => comment || '-',
    },
  ];

  return (
    <Table
      dataSource={columns}
      columns={columnTableColumns}
      rowKey="name"
      size="small"
      pagination={false}
    />
  );
}
