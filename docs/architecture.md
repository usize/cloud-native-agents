# System Architecture

This document provides a high-level overview of the system architecture for the Cloud Native Agents platform. The architecture consists of several core components, including the frontend UI, backend services, agent orchestration, messaging infrastructure, memory stores, and integrations with external systems. The deployment is designed to run on an OpenShift cluster, leveraging containerized services and scalable infrastructure.

Below is a visual representation of the architecture:

```mermaid
flowchart TD
  subgraph FrontendPod["Frontend Pod (UI)"]
    FE["React App"]
  end
  subgraph BackendPod["Agent Backend Pod"]
    API["FastAPI API Server"]
    GRPC["gRPC Server"]
    AGENTS["Multi Agent Script"]
    A2A["A2A API Gateway"]
  end
  subgraph KafkaPod["Kafka Container"]
    KAFKA["Kafka Broker"]
  end
  subgraph RHOAI["RHOAI vLLM inference"]
    GRANITE["Granite Model"]
  end
  subgraph MEMORY["Memory"]
    SQLITE["Relational db"]
    VECTORDB["Vector db"]
  end
  subgraph OpenShiftCluster["OpenShift Cluster"]
    FrontendPod
    BackendPod
    KafkaPod
    AG["Other Agents and Teams"]
    RHOAI
    MEMORY
  end
  subgraph External["External Systems & Clients"]
    U1["Web Browser"]
    EA["Agents"]
    GH["GitHub"]
    OS["OpenShift"]
    OTHERS["Other External Systems"]
  end

  U1 -- HTTP/WebSocket --> FrontendPod
  FrontendPod -- REST/WebSocket --> API & AG
  EA -- A2A Protocol --> A2A
  A2A -- Calls --> AGENTS
  KafkaPod -- Kafka Consume --> AGENTS
  GRPC -- Calls --> AGENTS
  AGENTS -- Tool Call --> MEMORY
  AGENTS -- Inference Call --> RHOAI
  AGENTS -- MCP Tool Call --> GH & OS & OTHERS
  AG -- gRPC sync tool --> GRPC
  AG -- Kafka async tool --> KafkaPod
  API --> AGENTS
  GH -- Event Produce --> KafkaPod
  OS -- Event Produce --> KafkaPod
  OTHERS -- Event Produce --> KafkaPod

  %% Lighter backgrounds for pod nodes
  style FE fill:#e3f2fd,stroke:#1976d2,color:#1a237e
  style API fill:#fff3e0,stroke:#fbc02d,color:#1a237e
  style GRPC fill:#fff3e0,stroke:#fbc02d,color:#1a237e
  style AGENTS fill:#fff3e0,stroke:#fbc02d,color:#1a237e
  style A2A fill:#fff3e0,stroke:#fbc02d,color:#1a237e
  style KAFKA fill:#d1c4e9,stroke:#8e24aa,color:#1a237e
  style GRANITE fill:#ffebee,stroke:#B71C1C,color:#B71C1C
  style SQLITE fill:#ede7f6,stroke:#4A148C,color:#1a237e
  style VECTORDB fill:#ede7f6,stroke:#4A148C,color:#1a237e
  style GH fill:#cfd8dc,stroke:#263238,color:#263238
  style OS fill:#cfd8dc,stroke:#263238,color:#263238
  style OTHERS fill:#f5f5f5,stroke:#757575,color:#1a237e
```

---

## What’s Missing from the Diagram?

While the above diagram provides a high-level overview of the system architecture, several important aspects are not depicted for clarity and simplicity:

1. **Internal Workings of the Multi Agent Script**
   - The diagram does not show the framework used to implement the multi-agent system, how agents are teamed together to solve a problem, or the orchestration logic.
   - Details on how agent memories are stored, retrieved, and shared are omitted.
   - The allocation and management of tools to agents, as well as the protocols for tool invocation, are not visualized.

2. **Observability and Service Mesh Sidecars**
   - Components such as logging, metrics, distributed tracing, and service mesh sidecars (e.g., Istio, Linkerd) are not shown.
   - These are critical for monitoring, debugging, and securing inter-service communication.

3. **Authentication and Security**
   - The diagram does not illustrate authentication flows, authorization checks, or security boundaries.
   - Mechanisms for securing APIs, gRPC, WebSocket, and Kafka communications are not depicted.

4. **Storage and Backup**
   - Persistent storage solutions, backup strategies, and disaster recovery mechanisms are not included.
   - Details about how data is backed up, restored, or migrated are omitted.

5. **Operator and Custom Resource Definitions (CRDs)**
   - The role of Kubernetes/OpenShift Operators and CRDs in managing the lifecycle of agents, models, and other resources is not visualized.
   - Automation and reconciliation logic provided by operators is not shown.

These aspects are essential for a production-grade deployment and will be considered in a more detailed architecture or operational documentation. 
