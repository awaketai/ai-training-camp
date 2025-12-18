/**
 * QueryResultsTable Component
 *
 * Displays query execution results in a table format with export functionality.
 */

import { Button, Card, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownloadOutlined } from '@ant-design/icons';
import type { QueryResult } from '@/services/types';
import { formatCellValue } from '@/utils/formatters';

const { Text } = Typography;

interface QueryResultsTableProps {
  result: QueryResult;
}

export function QueryResultsTable({ result }: QueryResultsTableProps) {
  // Build table columns from result columns
  const columns: ColumnsType<Record<string, unknown>> = result.columns.map((col) => ({
    title: (
      <span>
        <strong>{col.name}</strong>
        <br />
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {col.dataType}
        </Text>
      </span>
    ),
    dataIndex: col.name,
    key: col.name,
    ellipsis: true,
    render: (value: unknown) => {
      const formatted = formatCellValue(value);

      // Style NULL values
      if (formatted === 'NULL') {
        return <Text italic type="secondary">NULL</Text>;
      }

      // Style boolean values
      if (typeof value === 'boolean') {
        return <Tag color={value ? 'success' : 'default'}>{formatted}</Tag>;
      }

      return formatted;
    },
  }));

  // Export to CSV
  const handleExport = () => {
    const csvContent = generateCSV(result);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `query_results_${Date.now()}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card
      title={
        <span>
          Query Results
          {result.wasLimited && (
            <Tag color="warning" style={{ marginLeft: 8 }}>
              LIMIT 1000 Applied
            </Tag>
          )}
        </span>
      }
      extra={
        <Button
          icon={<DownloadOutlined />}
          onClick={handleExport}
          size="small"
        >
          Export CSV
        </Button>
      }
    >
      <Table
        dataSource={result.rows}
        columns={columns}
        rowKey={(_, index) => index?.toString() || '0'}
        pagination={{
          pageSize: 50,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} rows`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: true }}
        size="small"
      />
    </Card>
  );
}

/**
 * Generate CSV content from query result
 */
function generateCSV(result: QueryResult): string {
  // Header row
  const headers = result.columns.map((col) => escapeCSVValue(col.name));
  const csvRows = [headers.join(',')];

  // Data rows
  result.rows.forEach((row) => {
    const values = result.columns.map((col) => {
      const value = row[col.name];
      return escapeCSVValue(formatCellValue(value));
    });
    csvRows.push(values.join(','));
  });

  return csvRows.join('\n');
}

/**
 * Escape CSV value (handle quotes and commas)
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
