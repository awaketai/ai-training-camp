# 查询结果导出功能设计文档

## 1. 功能概述

查询结果导出功能允许用户将 SQL 查询的执行结果导出为不同格式的文件，便于数据分析、报告生成或与其他系统集成。

### 1.1 支持的导出格式

| 格式 | MIME 类型 | 文件扩展名 | 用途 |
|------|----------|-----------|------|
| CSV | text/csv | .csv | Excel/数据分析工具 |
| JSON | application/json | .json | API/程序集成 |

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                   QueryResultsTable                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Export Dropdown Menu                │   │
│  │  ┌─────────────┐  ┌─────────────┐              │   │
│  │  │ Export CSV  │  │ Export JSON │              │   │
│  │  └──────┬──────┘  └──────┬──────┘              │   │
│  └─────────┼────────────────┼──────────────────────┘   │
│            │                │                           │
│            ▼                ▼                           │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ handleExportCSV │  │ handleExportJSON│             │
│  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                       │
│           ▼                    ▼                       │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │  generateCSV()  │  │ JSON.stringify()│             │
│  └────────┬────────┘  └────────┬────────┘             │
│           │                    │                       │
│           └──────────┬─────────┘                       │
│                      ▼                                 │
│           ┌─────────────────────┐                      │
│           │   downloadFile()    │                      │
│           │  (通用下载函数)      │                      │
│           └─────────────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

### 2.2 核心组件

#### 2.2.1 数据流

```
QueryResult (查询结果数据)
    │
    ├──► CSV 导出流程
    │       │
    │       ├── 1. 提取列名作为表头
    │       ├── 2. 遍历数据行
    │       ├── 3. 格式化单元格值 (formatCellValue)
    │       ├── 4. CSV 值转义 (escapeCSVValue)
    │       └── 5. 生成 CSV 字符串
    │
    └──► JSON 导出流程
            │
            ├── 1. 获取原始行数据
            ├── 2. JSON.stringify 序列化
            └── 3. 格式化输出 (缩进2空格)
```

## 3. 实现细节

### 3.1 文件位置

```
frontend/src/
├── components/
│   └── QueryResultsTable.tsx    # 导出功能主要实现
└── utils/
    └── formatters.ts            # 数据格式化工具函数
```

### 3.2 核心函数

#### 3.2.1 通用下载函数

```typescript
const downloadFile = (content: string, filename: string, mimeType: string) => {
  // 1. 创建 Blob 对象
  const blob = new Blob([content], { type: mimeType });

  // 2. 创建临时下载链接
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  // 3. 设置下载属性
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  // 4. 触发下载
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```

**设计要点**：
- 使用 Blob API 处理文件内容
- 通过 URL.createObjectURL 创建临时 URL
- 使用隐藏的 `<a>` 标签触发下载
- 纯前端实现，无需后端接口

#### 3.2.2 CSV 生成函数

```typescript
function generateCSV(result: QueryResult): string {
  // 1. 生成表头行
  const headers = result.columns.map((col) => escapeCSVValue(col.name));
  const csvRows = [headers.join(',')];

  // 2. 生成数据行
  result.rows.forEach((row) => {
    const values = result.columns.map((col) => {
      const value = row[col.name];
      return escapeCSVValue(formatCellValue(value));
    });
    csvRows.push(values.join(','));
  });

  // 3. 合并为完整 CSV
  return csvRows.join('\n');
}
```

#### 3.2.3 CSV 值转义函数

```typescript
function escapeCSVValue(value: string): string {
  // 处理包含特殊字符的值
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

**转义规则**：
| 情况 | 处理方式 |
|------|---------|
| 包含逗号 `,` | 用双引号包裹 |
| 包含双引号 `"` | 双引号转义为 `""` |
| 包含换行符 `\n` | 用双引号包裹 |

#### 3.2.4 单元格值格式化

```typescript
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
```

**格式化规则**：
| 类型 | 输出 |
|------|------|
| null/undefined | "NULL" |
| boolean true | "TRUE" |
| boolean false | "FALSE" |
| object | JSON 字符串 |
| 其他 | String() 转换 |

### 3.3 UI 实现

使用 Ant Design 的 Dropdown 组件提供导出选项：

```typescript
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
```

## 4. 设计模式分析

### 4.1 当前设计模式

**直接实现模式**：所有导出逻辑在组件内直接实现，未使用抽象接口。

```
优点：
├── 实现简单直接
├── 代码量少
└── 易于理解

缺点：
├── 添加新格式需修改组件代码
├── 格式处理逻辑耦合在组件中
└── 难以单独测试导出逻辑
```

### 4.2 可优化方向：策略模式

如需扩展更多导出格式，可重构为策略模式：

```typescript
// 导出策略接口
interface ExportStrategy {
  name: string;
  icon: ReactNode;
  mimeType: string;
  extension: string;
  generate(result: QueryResult): string;
}

// CSV 策略
class CSVExportStrategy implements ExportStrategy {
  name = 'Export CSV';
  icon = <FileTextOutlined />;
  mimeType = 'text/csv;charset=utf-8;';
  extension = 'csv';

  generate(result: QueryResult): string {
    // CSV 生成逻辑
  }
}

// JSON 策略
class JSONExportStrategy implements ExportStrategy {
  name = 'Export JSON';
  icon = <FileOutlined />;
  mimeType = 'application/json;charset=utf-8;';
  extension = 'json';

  generate(result: QueryResult): string {
    return JSON.stringify(result.rows, null, 2);
  }
}

// 策略注册
const exportStrategies: ExportStrategy[] = [
  new CSVExportStrategy(),
  new JSONExportStrategy(),
  // 新增格式只需添加新策略
];
```

## 5. 文件命名规则

导出文件名格式：`query_results_{timestamp}.{extension}`

示例：
- `query_results_1703750400000.csv`
- `query_results_1703750400000.json`

## 6. 扩展建议

### 6.1 可添加的导出格式

| 格式 | 用途 | 实现难度 |
|------|------|---------|
| Excel (.xlsx) | 办公软件 | 中等（需引入 xlsx 库）|
| XML | 数据交换 | 简单 |
| SQL INSERT | 数据迁移 | 简单 |
| Markdown Table | 文档 | 简单 |

### 6.2 功能增强建议

1. **选择导出列**：允许用户选择要导出的列
2. **导出数据范围**：支持导出当前页/全部数据
3. **自定义分隔符**：CSV 支持自定义分隔符
4. **编码选择**：支持 UTF-8/GBK 等编码
5. **大数据流式导出**：对于大数据量使用流式处理

## 7. 总结

当前导出功能采用简洁的直接实现方式，满足 CSV 和 JSON 两种格式的导出需求。核心设计要点：

1. **纯前端实现**：无需后端接口，利用浏览器 Blob API
2. **通用下载函数**：抽离公共的文件下载逻辑
3. **数据格式化**：统一的单元格值格式化处理
4. **CSV 转义**：符合 RFC 4180 标准的 CSV 转义

如需扩展更多格式，建议重构为策略模式以提高可扩展性。
