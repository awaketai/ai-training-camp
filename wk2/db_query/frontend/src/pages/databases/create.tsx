/**
 * Create Database Page
 *
 * Form for adding a new database connection.
 */

import { useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Space,
  Typography,
  message,
  Alert,
} from 'antd';
import { DatabaseOutlined, SaveOutlined, RollbackOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { databaseAPI, getErrorMessage } from '@/services/api';
import { ErrorDisplay } from '@/components/ErrorDisplay';

const { Title, Text, Paragraph } = Typography;

interface FormValues {
  name: string;
  connectionUrl: string;
}

export function CreateDatabasePage() {
  const navigate = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);

    try {
      await databaseAPI.createDatabase(values.name, values.connectionUrl);
      message.success(`Database "${values.name}" created successfully!`);
      navigate('/databases');
    } catch (err) {
      setError(err);
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <Card
        title={
          <Title level={3}>
            <DatabaseOutlined /> Add Database Connection
          </Title>
        }
      >
        <Alert
          message="Connection Information"
          description={
            <div>
              <Paragraph>
                Provide a unique name and connection URL for your database.
                The system will automatically connect and extract metadata.
              </Paragraph>
              <Paragraph>
                <Text strong>Supported databases:</Text> MySQL, PostgreSQL, SQLite
              </Paragraph>
              <Paragraph>
                <Text strong>Example URLs:</Text>
                <ul>
                  <li><Text code>mysql+pymysql://user:password@localhost:3306/dbname</Text></li>
                  <li><Text code>postgresql+psycopg2://user:password@localhost:5432/dbname</Text></li>
                  <li><Text code>sqlite:///./path/to/database.db</Text></li>
                </ul>
              </Paragraph>
            </div>
          }
          type="info"
          style={{ marginBottom: '24px' }}
        />

        {error && <ErrorDisplay error={error} />}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="Database Name"
            name="name"
            rules={[
              { required: true, message: 'Please enter a database name' },
              {
                pattern: /^[a-zA-Z0-9_]+$/,
                message: 'Only alphanumeric characters and underscores allowed',
              },
              {
                min: 1,
                max: 100,
                message: 'Name must be between 1 and 100 characters',
              },
            ]}
            extra="Use only letters, numbers, and underscores"
          >
            <Input
              placeholder="my_database"
              prefix={<DatabaseOutlined />}
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Connection URL"
            name="connectionUrl"
            rules={[
              { required: true, message: 'Please enter a connection URL' },
              {
                pattern: /^[a-z+]+:\/\/.+/,
                message: 'Invalid URL format (must start with protocol:// like mysql+pymysql://)',
              },
            ]}
            extra="Full database connection string with credentials"
          >
            <Input.TextArea
              placeholder="mysql+pymysql://user:password@localhost:3306/dbname"
              rows={3}
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<SaveOutlined />}
                size="large"
              >
                Create Connection
              </Button>
              <Button
                icon={<RollbackOutlined />}
                onClick={() => navigate('/databases')}
                size="large"
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
