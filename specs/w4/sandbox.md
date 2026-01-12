# 数据沙箱安全审计流程

本文档描述数据沙箱系统中数据资源的完整生命周期，包括添加、申请、导入、转存和出域等各个环节的审计流程。

## 图例说明

- 🔴 **红色节点**：加密/解密操作
- 🔵 **蓝色节点**：日志记录操作
- 🟡 **黄色节点**：审核操作

## 流程概览

数据沙箱安全审计流程涵盖以下主要场景：
1. 数据资源添加
2. 数据资源申请
3. 沙箱工具安装
4. 数据资源导入
5. 资源转存
6. 数据出域
7. 数据产品添加
8. 产品部署
9. Jupyter 开发工具流程（包括开发和运行阶段）

## 1. 数据资源添加流程

```mermaid
flowchart TD
    A[用户添加数据资源] --> B[工作区管理员审核]
    B -->|审核通过| C[对资源进行加密]
    C --> D[存储加密数据]
    D --> E[记录上传操作日志]
    E --> F[生成日志签名]
    F --> G[日志记录完成]
    B -->|审核拒绝| H[通知用户]

    classDef encryption fill:#ffcccc,stroke:#cc0000,stroke-width:2px
    classDef logging fill:#cce5ff,stroke:#0066cc,stroke-width:2px
    classDef audit fill:#fff4cc,stroke:#ccaa00,stroke-width:2px

    class C,D encryption
    class E,F,G logging
    class B audit
```

## 2. 数据资源申请流程

```mermaid
flowchart TD
    A[用户在沙箱中申请数据资源] --> B[工作区管理员审核]
    B --> C[记录申请日志]
    C --> D[生成日志签名]
    D --> E[日志记录完成]
    B -->|审核结果| F[通知用户]

    classDef logging fill:#cce5ff,stroke:#0066cc,stroke-width:2px
    classDef audit fill:#fff4cc,stroke:#ccaa00,stroke-width:2px

    class C,D,E logging
    class B audit
```

## 3. 沙箱工具安装流程

```mermaid
flowchart TD
    A[用户在沙箱中安装工具] --> B[记录安装操作日志]
    B --> C[生成日志签名]
    C --> D[日志记录完成]

    classDef logging fill:#cce5ff,stroke:#0066cc,stroke-width:2px

    class B,C,D logging
```

## 4. 数据资源导入流程

```mermaid
flowchart TD
    A[用户在沙箱中导入数据资源] --> B[工作区管理员审核]
    B --> C[记录导入操作日志]
    C --> D[生成日志签名]
    D --> E[日志记录完成]
    B -->|审核通过| F[对数据进行解密]
    F --> G[导入沙箱]
    B -->|审核拒绝| H[通知用户]

    classDef encryption fill:#ffcccc,stroke:#cc0000,stroke-width:2px
    classDef logging fill:#cce5ff,stroke:#0066cc,stroke-width:2px
    classDef audit fill:#fff4cc,stroke:#ccaa00,stroke-width:2px

    class F encryption
    class C,D,E logging
    class B audit
```

## 5. 资源转存流程

```mermaid
flowchart TD
    A[用户在沙箱中进行开发] --> B[形成新的资源]
    B --> C[用户申请资源转存]
    C --> D[工作区管理员审核]
    D -->|审核通过| E[进行数据资源加密]
    E --> F[与转存服务器建立TLS连接]
    F --> G[存储资源]
    G --> H[记录转存操作日志]
    H --> I[生成日志签名]
    I --> J[日志记录完成]
    D -->|审核拒绝| K[通知用户]

    classDef encryption fill:#ffcccc,stroke:#cc0000,stroke-width:2px
    classDef logging fill:#cce5ff,stroke:#0066cc,stroke-width:2px
    classDef audit fill:#fff4cc,stroke:#ccaa00,stroke-width:2px

    class E,F encryption
    class H,I,J logging
    class D audit
```

## 6. 数据出域流程

```mermaid
flowchart TD
    A[用户对转存的数据进行出域申请] --> B[系统管理员使用远程桌面审核]
    B --> C[记录操作日志]
    C --> D[生成日志签名]
    D --> E[日志记录完成]
    B -->|审核通过| F[提供数据下载地址]
    F --> G[下载时对数据进行解密]
    G --> H[用户下载数据]
    B -->|审核拒绝| I[通知用户]

    classDef encryption fill:#ffcccc,stroke:#cc0000,stroke-width:2px
    classDef logging fill:#cce5ff,stroke:#0066cc,stroke-width:2px
    classDef audit fill:#fff4cc,stroke:#ccaa00,stroke-width:2px

    class G encryption
    class C,D,E logging
    class B audit
```

## 7. 数据产品添加流程

```mermaid
flowchart TD
    A[用户添加数据产品] --> B[工作区管理员审核]
    B --> C[记录添加操作日志]
    C --> D[生成日志签名]
    D --> E[日志记录完成]
    B -->|审核结果| F[通知用户]

    classDef logging fill:#cce5ff,stroke:#0066cc,stroke-width:2px
    classDef audit fill:#fff4cc,stroke:#ccaa00,stroke-width:2px

    class C,D,E logging
    class B audit
```

## 8. 产品部署流程

```mermaid
flowchart TD
    A[用户申请部署产品] --> B[工作区管理员审核]
    B --> C[记录操作日志]
    C --> D[生成日志签名]
    D --> E[日志记录完成]
    B -->|审核通过| F[部署产品]
    F --> G[在网关注册API地址]
    B -->|审核拒绝| H[通知用户]

    classDef logging fill:#cce5ff,stroke:#0066cc,stroke-width:2px
    classDef audit fill:#fff4cc,stroke:#ccaa00,stroke-width:2px

    class C,D,E logging
    class B audit
```

## 完整生命周期流程图

```mermaid
flowchart TD
    subgraph 数据入域
        A1[用户添加数据资源] --> A2[管理员审核]
        A2 -->|通过| A3[加密存储]
        A3 --> A4[日志签名记录]
    end

    subgraph 沙箱使用
        B1[用户申请数据资源] --> B2[管理员审核]
        B2 -->|通过| B3[导入数据资源]
        B3 --> B4[解密导入沙箱]
        B4 --> B5[用户进行开发]
        B6[安装工具] --> B5
        B6 --> B7[日志签名记录]
        B4 --> B8[日志签名记录]
    end

    subgraph 数据转存
        C1[申请资源转存] --> C2[管理员审核]
        C2 -->|通过| C3[数据加密]
        C3 --> C4[TLS连接传输]
        C4 --> C5[存储到转存服务器]
        C5 --> C6[日志签名记录]
    end

    subgraph 数据出域
        D1[申请数据出域] --> D2[系统管理员远程审核]
        D2 -->|通过| D3[提供下载地址]
        D3 --> D4[解密并下载]
        D4 --> D5[日志签名记录]
    end

    subgraph 产品发布
        E1[添加数据产品] --> E2[管理员审核]
        E2 --> E3[日志签名记录]
        E2 -->|通过| E4[申请部署产品]
        E4 --> E5[管理员审核]
        E5 -->|通过| E6[部署产品]
        E6 --> E7[网关注册API]
        E7 --> E8[日志签名记录]
    end

    A4 --> B1
    B5 --> C1
    C6 --> D1
    B5 --> E1

    classDef encryption fill:#ffcccc,stroke:#cc0000,stroke-width:2px
    classDef logging fill:#cce5ff,stroke:#0066cc,stroke-width:2px
    classDef audit fill:#fff4cc,stroke:#ccaa00,stroke-width:2px

    class A3,B4,C3,C4,D4 encryption
    class A4,B7,B8,C6,D5,E3,E8 logging
    class A2,B2,C2,D2,E2,E5 audit
```

## 9. Jupyter 开发工具流程

作为沙箱中的典型开发工具，Jupyter 的完整工作流程包括开发阶段和运行阶段。

### 9.1 Jupyter 开发与部署流程

```mermaid
flowchart TD
    subgraph 开发阶段
        J1[选举一个 jupyter_ctx.py<br/>文件生成到 jupyter] --> J2[开发人员在 jupyter lab<br/>里使用入口文件中的方法<br/>实现业务逻辑]
        J2 --> J3[经过代码检测]
        J3 --> J4[输出产物: 包数据代码]
        J4 --> J5[发送 api 调用申请<br/>输入输出 api 调用由]
        J5 --> J6[审核通过<br/>向网关注册 api<br/>向 runtime server 提交产物的信息]
        J6 --> J7[发布成功]
    end

    classDef audit fill:#fff4cc,stroke:#ccaa00,stroke-width:2px
    classDef success fill:#ccffcc,stroke:#00cc00,stroke-width:2px

    class J6 audit
    class J7 success
```

### 9.2 Jupyter 产物运行流程

```mermaid
flowchart TD
    R1[HTTP Request] --> R2[网关 Gateway]
    R2 --> R3[Runtime Server]
    R3 --> R4[请求验证鉴权]
    R4 --> R5[执行 xxx.code<br/>开发产物]
    R5 --> R6[runtime server 执行<br/>ctx.load 实现]
    R6 --> R7[code 开发产物执行]
    R7 --> R8[输出验证/检敏]
    R8 --> R9[HTTP Response]

    classDef gateway fill:#e6f3ff,stroke:#0066cc,stroke-width:2px
    classDef validation fill:#fff4cc,stroke:#ccaa00,stroke-width:2px
    classDef execution fill:#ffe6f0,stroke:#cc0066,stroke-width:2px

    class R2 gateway
    class R4,R8 validation
    class R5,R6,R7 execution
```

### 9.3 Jupyter 完整流程图

```mermaid
flowchart TD
    subgraph DEV[开发阶段]
        D1[生成 jupyter_ctx.py] --> D2[Jupyter Lab 开发]
        D2 --> D3[代码检测]
        D3 --> D4[输出代码产物]
        D4 --> D5[申请 API 调用]
        D5 --> D6[审核通过并注册]
        D6 --> D7[发布成功]
    end

    DEV --> BRIDGE[部署完成]

    subgraph RUN[运行阶段]
        R1[HTTP Request] --> R2[网关 Gateway]
        R2 --> R3[Runtime Server]
        R3 --> R4[请求验证鉴权]
        R4 --> R5[执行代码产物]
        R5 --> R6[ctx.load 实现]
        R6 --> R7[产物执行]
        R7 --> R8[输出验证/检敏]
        R8 --> R9[HTTP Response]
    end

    BRIDGE --> RUN

    classDef devPhase fill:#e6f7ff,stroke:#0099cc,stroke-width:2px
    classDef runPhase fill:#fff0e6,stroke:#cc6600,stroke-width:2px
    classDef audit fill:#fff4cc,stroke:#ccaa00,stroke-width:2px
    classDef validation fill:#ffe6f0,stroke:#cc0066,stroke-width:2px
    classDef bridge fill:#e6ffe6,stroke:#00aa00,stroke-width:2px

    class D1,D2,D3,D4,D5 devPhase
    class R1,R2,R3,R5,R6,R7,R9 runPhase
    class D6,R4,R8 audit
    class BRIDGE bridge
```

### 流程说明

#### 开发阶段
1. **初始化环境**：系统为 Jupyter 环境生成 `jupyter_ctx.py` 文件，提供上下文支持
2. **业务开发**：开发人员在 Jupyter Lab 中使用入口文件提供的方法实现业务逻辑
3. **代码检测**：对开发的代码进行安全性和合规性检测
4. **产物输出**：生成包含数据和代码的产物包
5. **API 申请**：提交 API 调用申请，定义输入输出接口
6. **审核注册**：
   - 工作区管理员审核通过后
   - 向网关注册 API 路由
   - 向 Runtime Server 提交产物信息
7. **发布成功**：产物可供外部调用

#### 运行阶段
1. **请求入口**：外部 HTTP 请求到达系统
2. **网关路由**：网关根据注册信息路由到对应的 Runtime Server
3. **服务定位**：Runtime Server 接收请求
4. **验证鉴权**：对请求进行身份验证和权限鉴权
5. **加载产物**：执行开发产物代码（xxx.code）
6. **上下文实现**：Runtime Server 执行 `ctx.load()` 加载运行时上下文
7. **代码执行**：产物代码在沙箱环境中执行
8. **输出检测**：对执行结果进行验证和敏感信息检测
9. **响应返回**：返回 HTTP Response

### 安全特性

#### 代码检测
- 在开发阶段进行代码安全扫描
- 检测潜在的安全漏洞和不合规代码

#### 请求验证
- 在运行阶段对每个请求进行身份验证
- 确保只有授权用户可以调用 API

#### 输出检敏
- 对代码执行结果进行敏感信息检测
- 防止敏感数据泄露

#### 沙箱隔离
- 代码在隔离的 Runtime Server 环境中执行
- 通过 `ctx.load()` 提供受控的上下文访问
- 限制代码对系统资源的访问权限

## 安全机制说明

### 数据加密
- 所有静态存储的数据资源均进行加密
- 数据传输使用TLS加密连接
- 数据出域时解密供用户下载

### 审核机制
- **工作区管理员审核**：负责数据资源添加、申请、导入、转存、产品添加和部署
- **系统管理员审核**：负责数据出域申请，使用远程桌面方式进行安全审核

### 审计日志
所有操作均记录审计日志，包括：
- 上传操作
- 申请操作
- 安装操作
- 导入操作
- 转存操作
- 出域操作
- 产品添加操作
- 部署操作

每条日志生成数字签名，确保日志的完整性和不可篡改性。

## 关键流程节点

| 流程 | 审核角色 | 加密操作 | 日志记录 | 特殊安全机制 |
|------|---------|---------|---------|-------------|
| 数据资源添加 | 工作区管理员 | 加密存储 | ✓ | - |
| 数据资源申请 | 工作区管理员 | - | ✓ | - |
| 工具安装 | - | - | ✓ | - |
| 数据资源导入 | 工作区管理员 | 解密导入 | ✓ | - |
| 资源转存 | 工作区管理员 | 加密传输 | ✓ | TLS连接 |
| 数据出域 | 系统管理员 | 解密下载 | ✓ | 远程桌面审核 |
| 数据产品添加 | 工作区管理员 | - | ✓ | - |
| 产品部署 | 工作区管理员 | - | ✓ | 网关注册 |
| Jupyter 开发 | 工作区管理员 | - | - | 代码检测 |
| Jupyter 运行 | - | - | - | 请求验证、输出检敏、沙箱隔离 |
