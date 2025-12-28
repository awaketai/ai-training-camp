/**
 * QueryResultsTable Component
 *
 * Displays query execution results in a table format with export functionality.
 */

import { Button, Card, Table, Tag, Typography, Dropdown } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { MenuProps } from 'antd';
import { DownloadOutlined, FileTextOutlined, FileOutlined } from '@ant-design/icons';
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

  // Download file helper
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const csvContent = generateCSV(result);
    downloadFile(csvContent, `query_results_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  };

  // Export to JSON
  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(result.rows, null, 2);
    downloadFile(jsonContent, `query_results_${Date.now()}.json`, 'application/json;charset=utf-8;');
  };

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'csv',
      label: 'Export CSV',
      icon: <FileTextOutlined />,
      onClick: handleExportCSV,
    },
    {
      key: 'json',
      label: 'Export JSON',
      icon: <FileOutlined />,
      onClick: handleExportJSON,
    },
  ];

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
        <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
          <Button icon={<DownloadOutlined />} size="small">
            Export
          </Button>
        </Dropdown>
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
