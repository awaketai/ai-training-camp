/**
 * GeneratedSqlReview Component
 *
 * Displays LLM-generated SQL with options to modify or execute.
 */

import { Button, Card, Space, Typography, Alert } from 'antd';
import { CheckCircleOutlined, EditOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { SqlEditor } from './SqlEditor';

const { Title, Text } = Typography;

interface GeneratedSqlReviewProps {
  generatedSql: string;
  onModify: (sql: string) => void;
  onExecute: () => void;
  executing?: boolean;
  modelUsed?: string;
  tokensUsed?: number;
}

export function GeneratedSqlReview({
  generatedSql,
  onModify,
  onExecute,
  executing = false,
  modelUsed,
  tokensUsed,
}: GeneratedSqlReviewProps) {
  return (
    <Card
      title={
        <Space>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <Title level={4} style={{ margin: 0 }}>
            Generated SQL Query
          </Title>
        </Space>
      }
      extra={
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => onModify(generatedSql)}
            disabled={executing}
          >
            Modify
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={onExecute}
            loading={executing}
            size="large"
          >
            Execute Query
          </Button>
        </Space>
      }
    >
      <Alert
        message="Review Generated SQL"
        description="The LLM has generated the following SQL query. You can execute it directly or modify it first."
        type="success"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      {(modelUsed || tokensUsed) && (
        <div style={{ marginBottom: '16px' }}>
          {modelUsed && (
            <Text type="secondary" style={{ marginRight: '16px' }}>
              Model: <Text strong>{modelUsed}</Text>
            </Text>
          )}
          {tokensUsed && (
            <Text type="secondary">
              Tokens Used: <Text strong>{tokensUsed}</Text>
            </Text>
          )}
        </div>
      )}

      <SqlEditor value={generatedSql} onChange={() => {}} height="200px" readOnly />
    </Card>
  );
}
