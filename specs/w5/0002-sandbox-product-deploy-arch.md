# 数据安全沙箱与数据产品部署架构设计文档

## 文档信息

| 项目 | 内容 |
|-----|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-01-12 |
| 关联文档 | [00001-sandbox-product-deploy-design.md](./00001-sandbox-product-deploy-design.md) |

---

## 1. 架构概述

### 1.1 设计目标

本架构旨在构建一个基于网关的数据安全沙箱系统，实现：

- **数据可用不可见**：数据仅在沙箱内参与计算，原始数据不出域
- **零信任安全**：全链路加密、动态鉴权、最小权限原则
- **多方协作**：支持跨机构的联邦学习和隐私计算
- **全链路审计**：可追溯、不可抵赖的操作记录

### 1.2 架构分层

```mermaid
graph TB
    subgraph "数据产品服务层 (Data Product Service Layer)"
        API[API市场与门户]
        REG[产品注册中心]
        BILL[计费与计量]
    end

    subgraph "网关控制层 (Gateway Control Layer)"
        IGW[Ingress Gateway<br/>边界接入]
        MGW[Management Gateway<br/>管理网关]
        EGW[Egress Gateway<br/>出口网关]
        CP[Control Plane<br/>控制平面]
    end

    subgraph "沙箱计算层 (Sandbox Computing Layer)"
        SC1[Sidecar Proxy]
        SC2[Sidecar Proxy]
        CMP1[计算容器<br/>FATE/SecretFlow]
        CMP2[计算容器<br/>Spark/TensorFlow]
    end

    subgraph "基础设施层 (Infrastructure Layer)"
        TEE[TEE节点<br/>SGX/TDX]
        TPM[硬件信任根<br/>TPM/TCM]
        GPU[异构加速器<br/>GPU/NPU]
        STORE[加密存储]
    end

    API --> IGW
    REG --> MGW
    IGW --> SC1
    IGW --> SC2
    SC1 --> CMP1
    SC2 --> CMP2
    CMP1 --> EGW
    CMP2 --> EGW
    CMP1 --> TEE
    CMP2 --> TEE
    TEE --> TPM
    CMP1 --> STORE
    CMP2 --> STORE
    CP --> MGW
    CP --> IGW
    CP --> EGW
```

---

## 2. 核心组件架构

### 2.1 网关架构详解

```mermaid
flowchart LR
    subgraph External["外部网络"]
        Client[数据消费者]
        Partner[合作方沙箱]
    end

    subgraph Gateway["网关控制层"]
        subgraph Ingress["Ingress Gateway"]
            WAF[WAF防护]
            AUTH[身份认证]
            RL[速率限制]
            ROUTE[动态路由]
        end

        subgraph Egress["Egress Gateway"]
            DLP[DLP审计]
            MASK[数据脱敏]
            DP[差分隐私]
            LOG[审计日志]
        end
    end

    subgraph Sandbox["沙箱内部"]
        COMPUTE[计算节点]
    end

    Client -->|HTTPS| WAF
    WAF --> AUTH
    AUTH --> RL
    RL --> ROUTE
    ROUTE -->|mTLS| COMPUTE
    COMPUTE --> DLP
    DLP --> MASK
    MASK --> DP
    DP --> LOG
    LOG -->|HTTPS| Client

    Partner <-->|互联协议| ROUTE
```

### 2.2 Sidecar 代理模式

```mermaid
flowchart TB
    subgraph Pod["Kubernetes Pod"]
        subgraph Sidecar["Sidecar Proxy (Envoy)"]
            IN[Inbound Handler]
            OUT[Outbound Handler]
            mTLS[mTLS终止]
            OPA[OPA策略检查]
            TRACE[链路追踪]
        end

        subgraph App["业务容器"]
            FATE[FATE Worker]
            SF[SecretFlow Engine]
        end
    end

    External[外部流量] -->|mTLS| IN
    IN --> mTLS
    mTLS --> OPA
    OPA -->|允许| FATE
    OPA -->|允许| SF
    FATE --> OUT
    SF --> OUT
    OUT -->|mTLS| NextHop[下游服务]
```

---

## 3. 数据流架构

### 3.1 数据产品调用全流程

```mermaid
sequenceDiagram
    participant C as 数据消费者
    participant IGW as Ingress Gateway
    participant OPA as OPA策略引擎
    participant SC as Sidecar Proxy
    participant CMP as 计算容器
    participant TEE as TEE Enclave
    participant EGW as Egress Gateway
    participant AUDIT as 审计系统

    C->>IGW: 1. HTTPS请求 (API Key)
    IGW->>IGW: 2. TLS终止 + WAF检查
    IGW->>OPA: 3. 鉴权请求
    OPA-->>IGW: 4. 授权结果

    alt 授权通过
        IGW->>SC: 5. mTLS转发
        SC->>SC: 6. 二次策略检查
        SC->>CMP: 7. 注入请求
        CMP->>TEE: 8. 在Enclave内计算
        TEE-->>CMP: 9. 加密结果
        CMP-->>SC: 10. 返回结果
        SC->>EGW: 11. 出站审计
        EGW->>EGW: 12. DLP扫描 + 脱敏
        EGW->>AUDIT: 13. 异步记录审计日志
        EGW-->>C: 14. 返回处理后的结果
    else 授权拒绝
        IGW-->>C: 403 Forbidden
    end
```

### 3.2 跨机构联邦学习流程

```mermaid
sequenceDiagram
    participant PA as Party A 网关
    participant CA as Party A 计算节点
    participant PB as Party B 网关
    participant CB as Party B 计算节点
    participant COORD as 协调服务

    Note over PA,CB: 联邦学习任务启动

    COORD->>PA: 1. 下发任务配置
    COORD->>PB: 1. 下发任务配置

    PA->>CA: 2. 启动本地训练
    PB->>CB: 2. 启动本地训练

    loop 每轮迭代
        CA->>PA: 3. 本地梯度/参数
        CB->>PB: 3. 本地梯度/参数

        PA->>PB: 4. 加密参数交换 (mTLS)
        PB->>PA: 4. 加密参数交换 (mTLS)

        PA->>CA: 5. 聚合后参数
        PB->>CB: 5. 聚合后参数

        CA->>CA: 6. 更新本地模型
        CB->>CB: 6. 更新本地模型
    end

    CA-->>COORD: 7. 训练完成
    CB-->>COORD: 7. 训练完成
```

---

## 4. 安全架构

### 4.1 安全防护层次

```mermaid
flowchart TB
    subgraph L1["第一层：边界防护"]
        DDoS[DDoS防护]
        WAF[WAF过滤]
        RATELIMIT[速率限制]
    end

    subgraph L2["第二层：身份与访问控制"]
        AUTHN[身份认证<br/>OAuth2/OIDC]
        AUTHZ[授权检查<br/>OPA/ABAC]
        BOLA[BOLA越权访问防护]
    end

    subgraph L3["第三层：传输安全"]
        mTLS[mTLS全链路加密]
        CERT[证书轮换]
        SPIFFE[SPIFFE身份]
    end

    subgraph L4["第四层：运行时隔离"]
        CONTAINER[容器隔离<br/>gVisor/Kata]
        NETPOL[网络策略<br/>Default Deny]
        TEE[TEE硬件隔离]
    end

    subgraph L5["第五层：输出审计"]
        DLP[DLP数据防泄露检测]
        MASK[动态脱敏]
        DP[差分隐私]
        WATERMARK[数字水印]
    end

    L1 --> L2 --> L3 --> L4 --> L5
```

### 4.2 威胁模型与防护映射

```mermaid
mindmap
    root((安全威胁))
        访问控制风险
            BOLA越权
                OPA细粒度鉴权
                UUID资源标识
            DoS攻击
                速率限制
                自适应熔断
            影子API
                API白名单
                端点扫描
        输出泄露风险
            推理攻击
                差分隐私
                结果精度限制
            敏感字段暴露
                动态脱敏
                字段白名单
            侧信道
                恒定时间响应
                响应填充
        运行时风险
            容器逃逸
                安全容器
                网络隔离
            非授权外联
                Egress Gateway
                DNS过滤
        审计风险
            日志泄露
                日志脱敏
                访问控制
            不可追溯
                全链路审计
                数字签名
        传输风险
            中间人攻击
                mTLS加密
                证书轮换
```

---

## 5. 部署架构

### 5.1 混合模式部署架构

```mermaid
graph TB
    subgraph Internet["公网"]
        USER[外部用户]
        PARTNER[合作方]
    end

    subgraph DMZ["DMZ安全隔离区"]
        LB[负载均衡器]
        IGW1[Ingress Gateway 1]
        IGW2[Ingress Gateway 2]
    end

    subgraph Sandbox["沙箱网络"]
        subgraph ControlPlane["控制平面"]
            ISTIO[Istio Control Plane]
            OPA[OPA Server]
            ETCD[Etcd集群]
        end

        subgraph DataPlane["数据平面"]
            subgraph Node1["计算节点1"]
                SC1[Sidecar]
                CMP1[计算容器]
            end
            subgraph Node2["计算节点2"]
                SC2[Sidecar]
                CMP2[计算容器]
            end
            subgraph Node3["计算节点3"]
                SC3[Sidecar]
                CMP3[计算容器]
            end
        end

        subgraph Egress["出口区"]
            EGW[Egress Gateway]
            DLP[DLP数据防泄露引擎]
        end
    end

    subgraph Secure["安全区"]
        VAULT[HashiCorp Vault信息加密存储区]
        HSM[HSM硬件]
        AUDIT[审计存储]
    end

    USER --> LB
    PARTNER --> LB
    LB --> IGW1
    LB --> IGW2
    IGW1 --> SC1
    IGW1 --> SC2
    IGW2 --> SC2
    IGW2 --> SC3

    ISTIO -.-> SC1
    ISTIO -.-> SC2
    ISTIO -.-> SC3

    SC1 --> CMP1
    SC2 --> CMP2
    SC3 --> CMP3

    CMP1 --> EGW
    CMP2 --> EGW
    CMP3 --> EGW

    EGW --> DLP
    DLP --> USER

    VAULT --> IGW1
    VAULT --> IGW2
    HSM --> VAULT
    EGW --> AUDIT
```

### 5.2 Kubernetes 部署拓扑

```mermaid
graph TB
    subgraph K8sCluster["Kubernetes 集群"]
        subgraph NSGateway["Namespace: gateway"]
            IGW[Ingress Gateway<br/>Deployment]
            EGW[Egress Gateway<br/>Deployment]
            APISIX[APISIX<br/>StatefulSet]
        end

        subgraph NSCompute["Namespace: compute"]
            FATE[FATE Worker<br/>StatefulSet]
            SF[SecretFlow<br/>Deployment]
            SPARK[Spark<br/>Deployment]
        end

        subgraph NSControl["Namespace: control"]
            ISTIO[Istiod<br/>Deployment]
            OPA[OPA<br/>Deployment]
            ETCD[Etcd<br/>StatefulSet]
        end

        subgraph NSMonitor["Namespace: monitor"]
            PROM[Prometheus]
            GRAF[Grafana]
            JAEGER[Jaeger]
        end
    end

    subgraph NetworkPolicy["网络策略"]
        NP1[gateway → compute: 允许]
        NP2[compute → compute: 仅白名单]
        NP3[compute → egress: 允许]
        NP4[compute → internet: 拒绝]
    end

    IGW --> FATE
    IGW --> SF
    FATE --> EGW
    SF --> EGW

    ISTIO -.->|配置下发| IGW
    ISTIO -.->|配置下发| EGW

    PROM -->|指标采集| IGW
    PROM -->|指标采集| EGW
    PROM -->|指标采集| FATE
```

---

## 6. 组件交互架构

### 6.1 OPA 策略执行流程

```mermaid
flowchart LR
    subgraph Request["请求处理"]
        REQ[API请求]
        CTX[请求上下文<br/>user_id, role, time, ip]
    end

    subgraph Gateway["网关"]
        GW[Envoy/APISIX]
        PLUGIN[OPA插件]
    end

    subgraph OPA["OPA引擎"]
        REGO[Rego策略]
        DATA[策略数据]
        EVAL[策略评估]
    end

    subgraph Result["决策结果"]
        ALLOW[允许]
        DENY[拒绝]
    end

    REQ --> GW
    GW --> CTX
    CTX --> PLUGIN
    PLUGIN -->|查询| EVAL
    REGO --> EVAL
    DATA --> EVAL
    EVAL --> ALLOW
    EVAL --> DENY
    ALLOW --> GW
    DENY --> GW
```

### 6.2 差分隐私处理流程

```mermaid
flowchart TB
    subgraph Input["输入"]
        QUERY[统计查询请求]
    end

    subgraph Compute["计算"]
        EXEC[执行查询]
        RESULT[原始结果]
    end

    subgraph DPEngine["差分隐私引擎"]
        SENS[敏感度分析]
        BUDGET[预算检查<br/>当前 ε 消耗]
        NOISE[噪声生成<br/>Laplace/Gaussian]
        ADD[噪声叠加]
    end

    subgraph Output["输出"]
        FINAL[扰动后结果]
        REJECT[拒绝请求<br/>预算耗尽]
    end

    QUERY --> EXEC
    EXEC --> RESULT
    RESULT --> SENS
    SENS --> BUDGET

    BUDGET -->|预算充足| NOISE
    BUDGET -->|预算不足| REJECT

    NOISE --> ADD
    RESULT --> ADD
    ADD --> FINAL
```

---

## 7. 高可用架构

### 7.1 网关高可用设计

```mermaid
flowchart TB
    subgraph LB["负载均衡层"]
        GLB[全局负载均衡<br/>DNS/Anycast]
        LB1[L4负载均衡1]
        LB2[L4负载均衡2]
    end

    subgraph Gateway["网关集群"]
        subgraph Zone1["可用区1"]
            IGW1A[Ingress GW 1]
            IGW1B[Ingress GW 2]
        end
        subgraph Zone2["可用区2"]
            IGW2A[Ingress GW 3]
            IGW2B[Ingress GW 4]
        end
    end

    subgraph Config["配置中心"]
        ETCD1[Etcd 1]
        ETCD2[Etcd 2]
        ETCD3[Etcd 3]
    end

    GLB --> LB1
    GLB --> LB2
    LB1 --> IGW1A
    LB1 --> IGW1B
    LB2 --> IGW2A
    LB2 --> IGW2B

    ETCD1 <--> ETCD2
    ETCD2 <--> ETCD3
    ETCD1 <--> ETCD3

    IGW1A -.-> ETCD1
    IGW1B -.-> ETCD2
    IGW2A -.-> ETCD2
    IGW2B -.-> ETCD3
```

### 7.2 故障转移流程

```mermaid
stateDiagram-v2
    [*] --> Healthy: 服务启动

    Healthy --> Degraded: 部分节点故障
    Healthy --> CircuitOpen: 错误率超阈值

    Degraded --> Healthy: 故障节点恢复
    Degraded --> CircuitOpen: 级联故障

    CircuitOpen --> HalfOpen: 冷却期结束
    HalfOpen --> Healthy: 探测成功
    HalfOpen --> CircuitOpen: 探测失败

    CircuitOpen --> Failover: 持续故障
    Failover --> Healthy: 备用集群接管

    note right of CircuitOpen
        熔断状态下
        返回降级响应
    end note

    note right of Failover
        流量切换到
        备用可用区
    end note
```

---

## 8. 监控与可观测性

### 8.1 可观测性架构

```mermaid
flowchart TB
    subgraph Sources["数据源"]
        GW[网关]
        SC[Sidecar]
        CMP[计算容器]
    end

    subgraph Collection["采集层"]
        OTEL[OpenTelemetry<br/>Collector]
    end

    subgraph Storage["存储层"]
        PROM[(Prometheus<br/>指标)]
        ES[(Elasticsearch<br/>日志)]
        JAEGER[(Jaeger<br/>链路)]
    end

    subgraph Visualization["可视化"]
        GRAF[Grafana<br/>Dashboard]
        KIBANA[Kibana<br/>日志分析]
    end

    subgraph Alerting["告警"]
        AM[AlertManager]
        NOTIFY[通知渠道<br/>邮件/钉钉/Slack]
    end

    GW -->|Metrics| OTEL
    GW -->|Logs| OTEL
    GW -->|Traces| OTEL
    SC -->|Metrics| OTEL
    SC -->|Traces| OTEL
    CMP -->|Logs| OTEL

    OTEL --> PROM
    OTEL --> ES
    OTEL --> JAEGER

    PROM --> GRAF
    ES --> KIBANA
    JAEGER --> GRAF

    PROM --> AM
    AM --> NOTIFY
```

### 8.2 关键监控指标

| 监控维度 | 指标名称 | 告警阈值 | 说明 |
|---------|---------|---------|------|
| **网关健康** | gateway_request_total | N/A | 请求总量 |
| | gateway_error_rate | > 1% | 错误率 |
| | gateway_latency_p99 | > 500ms | P99延迟 |
| **安全事件** | auth_failure_total | > 100/min | 认证失败 |
| | rate_limit_exceeded | > 50/min | 限流触发 |
| | dlp_alert_total | > 0 | DLP告警 |
| **资源使用** | cpu_usage_percent | > 80% | CPU使用率 |
| | memory_usage_percent | > 85% | 内存使用率 |
| | connection_pool_usage | > 90% | 连接池使用率 |
| **隐私预算** | privacy_budget_remaining | < 10% | 剩余隐私预算 |

---

## 9. 技术选型汇总

### 9.1 组件技术栈

```mermaid
mindmap
    root((技术栈))
        网关层
            Envoy Proxy
            Apache APISIX
            Nginx
        控制平面
            Istio
            Consul
            Etcd
        安全组件
            OPA
            Keycloak
            HashiCorp Vault
            SPIFFE/SPIRE
        计算框架
            FATE
            SecretFlow
            Spark
            TensorFlow
        可观测性
            Prometheus
            Grafana
            Jaeger
            Elasticsearch
        基础设施
            Kubernetes
            Cilium
            gVisor
            Intel SGX
```

### 9.2 技术选型决策表

| 组件类型 | 推荐技术 | 备选方案 | 选型理由 |
|---------|---------|---------|---------|
| 数据平面网关 | **Envoy Proxy** | Nginx, HAProxy | Wasm扩展、gRPC原生支持、活跃社区 |
| API网关 | **Apache APISIX** | Kong, Traefik | 高性能、插件丰富、国内社区活跃 |
| 控制平面 | **Istio** | Linkerd, Consul Connect | 功能完整、OPA集成、mTLS支持 |
| 策略引擎 | **OPA** | Casbin, Custom | 声明式策略、Rego语言、生态丰富 |
| 身份认证 | **Keycloak** | Auth0, Okta | 开源、OIDC完整支持、多协议 |
| 秘密管理 | **HashiCorp Vault** | AWS KMS, Azure Key Vault | 功能全面、动态秘密、审计日志 |
| 服务身份 | **SPIFFE/SPIRE** | Istio CA | 零信任标准、跨平台、自动轮换 |
| CNI插件 | **Cilium** | Calico, Weave | eBPF性能、L7策略、可观测性 |
| 隐私计算 | **SecretFlow** | FATE, PaddleFL | 国产化、功能完整、活跃维护 |

---

## 10. 附录

### 10.1 缩略语表

| 缩写 | 全称 | 说明 |
|-----|------|------|
| TEE | Trusted Execution Environment | 可信执行环境 |
| SGX | Software Guard Extensions | Intel安全扩展 |
| mTLS | mutual TLS | 双向TLS认证 |
| OPA | Open Policy Agent | 开放策略代理 |
| DLP | Data Loss Prevention | 数据防泄漏 |
| BOLA | Broken Object Level Authorization | 对象级授权缺陷 |
| PSI | Private Set Intersection | 隐私求交 |
| MPC | Multi-Party Computation | 多方安全计算 |
| FL | Federated Learning | 联邦学习 |
| ABAC | Attribute-Based Access Control | 基于属性的访问控制 |

### 10.2 相关文档

- [设计文档](./00001-sandbox-product-deploy-design.md) - 详细技术设计
- Envoy官方文档: https://www.envoyproxy.io/docs
- OPA官方文档: https://www.openpolicyagent.org/docs
- SecretFlow文档: https://www.secretflow.org.cn/docs
