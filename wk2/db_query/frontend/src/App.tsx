import { Refine } from '@refinedev/core';
import { RefineThemes, ThemedLayoutV2, notificationProvider } from '@refinedev/antd';
import routerProvider from '@refinedev/react-router-v6';
import { ConfigProvider } from 'antd';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import dataProvider from '@refinedev/simple-rest';
import { DatabaseOutlined, CodeOutlined } from '@ant-design/icons';

import '@refinedev/antd/dist/reset.css';
import './index.css';

// Import pages
import { DatabaseListPage } from '@/pages/databases/list';
import { CreateDatabasePage } from '@/pages/databases/create';
import { DatabaseDetailPage } from '@/pages/databases/show';
import { QueryPage } from '@/pages/query';

const API_URL = '/api/v1';

function App() {
  return (
    <BrowserRouter>
      <ConfigProvider theme={RefineThemes.Blue}>
        <Refine
          routerProvider={routerProvider}
          dataProvider={dataProvider(API_URL)}
          notificationProvider={notificationProvider}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
          }}
          resources={[
            {
              name: 'databases',
              list: '/databases',
              create: '/databases/create',
              show: '/databases/:name',
              meta: {
                label: 'Databases',
                icon: <DatabaseOutlined />,
              },
            },
            {
              name: 'query',
              list: '/query',
              meta: {
                label: 'Query',
                icon: <CodeOutlined />,
              },
            },
          ]}
        >
          <Routes>
            <Route
              element={
                <ThemedLayoutV2>
                  <div style={{ padding: '24px' }}>
                    <h1>Database Query Tool</h1>
                    <p>Welcome to the Database Query Tool. Use the menu to navigate.</p>
                  </div>
                </ThemedLayoutV2>
              }
              path="/"
            />
            <Route
              element={
                <ThemedLayoutV2>
                  <DatabaseListPage />
                </ThemedLayoutV2>
              }
              path="/databases"
            />
            <Route
              element={
                <ThemedLayoutV2>
                  <CreateDatabasePage />
                </ThemedLayoutV2>
              }
              path="/databases/create"
            />
            <Route
              element={
                <ThemedLayoutV2>
                  <DatabaseDetailPage />
                </ThemedLayoutV2>
              }
              path="/databases/:name"
            />
            <Route
              element={
                <ThemedLayoutV2>
                  <QueryPage />
                </ThemedLayoutV2>
              }
              path="/query"
            />
          </Routes>
        </Refine>
      </ConfigProvider>
    </BrowserRouter>
  );
}

export default App;
