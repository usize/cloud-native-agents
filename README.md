# Cloud-Native Agents

An exploration of single and multi-agent AI systems on Kubernetes and OpenShift.

The goal of this repository is to bring the appropriate scope and best practices for building, deploying and maintaining "agentic systems" into focus.

## What are Agentic Systems?

Open AI describes Agents as "systems that independently accomplish tasks on your behalf." [citation](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdfhttps://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)

This is a functional definition, but in order to effectively build such systems we need to translate this high level concept 
into concrete requirements and components. At a minimum these components should allow our system to: 

- **Plan and execute** multi-step workflows
- **Use tools** to interact with external systems and APIs
- **Collaborate** with other agents in teams
- **Adapt** their approach based on intermediate results
- **Maintain context** across extended interactions

In order to bring this further into focus, we propose a layered approach to reasoning about agentic systems where each layer builds
on the next in order to achieve all of the objectives implied by the above requirements.

## The AI Agent Stack

```
┌───────────────────────────────────────────────┐
│               Layer 1: Runtime Substrate       │
│   Executes models and tools via backends/      │
│   adapters (vLLM, Ollama, OpenAI APIs)         │
└───────────────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────┐
│          Layer 2: Tool / Function Interface    │
│   Validated IO contracts for calling           │
│   tools/APIs (OpenAPI, JSON Schema, MCP)       │
└───────────────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────┐
│         Layer 3: Messaging & Event Bus         │
│   Agent-to-agent messaging, routing, delivery  │
│   (Kafka, NATS, Redis Streams, RabbitMQ)       │
└───────────────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────┐
│        Layer 4: Orchestration & Planning       │
│   DAGs, schedulers, planners, guardrails       │
│   (LangGraph, AutoGen, CrewAI, Haystack)       │
└───────────────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────┐
│          Layer 5: Discovery & Registry         │
│   Publish/resolve agent and tool capabilities  │
│   (Service mesh, Consul, etcd, custom APIs)    │
└───────────────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────┐
│   Layer 6: Composition & Governance           │
│   Roles, permissions, budgets, policy-as-code  │
│   (RBAC, OPA, admission controllers, DSLs)     │
└───────────────────────────────────────────────┘
                       ↓
┌───────────────────────────────────────────────┐
│       Layer 7: Intent & Interaction Surface    │
│   Human/system request capture and validation  │
│   (Chat UIs, REST APIs, GraphQL, webhooks)     │
└───────────────────────────────────────────────┘

Cross-Cutting Services:
├─ Storage: Vector DBs (Chroma, Pinecone), Graph DBs (Neo4j), Time-series (InfluxDB)
├─ Observability: Prometheus, Grafana, Jaeger, OpenTelemetry
├─ Security: Vault, SPIFFE/SPIRE, cert-manager, policy engines
└─ Deployment: Kubernetes, Helm, Operators, GitOps (ArgoCD, Flux)
```

## Key Components Explained

### Core Stack Layers

**Runtime Substrate (Layer 1)**
- **Local Inference**: vLLM, Ollama, llama.cpp for on-premises deployment
- **Hosted APIs**: OpenAI, Anthropic, Google Gemini for cloud-based inference
- **Execution Environments**: Docker containers, Kubernetes pods, serverless functions

**Tool Interface (Layer 2)**
- **Function Calling**: OpenAI function calling, Anthropic tool use
- **Protocol Standards**: Model Context Protocol (MCP), OpenAPI specifications
- **Tool Frameworks**: LangChain tools, Haystack components, custom adapters

**Messaging & Event Bus (Layer 3)**
- **Enterprise Messaging**: Apache Kafka, NATS, RabbitMQ
- **Cloud-Native**: Redis Streams, Google Pub/Sub, AWS SQS
- **Agent-Specific**: CrewAI message passing, AutoGen conversation threads

**Orchestration & Planning (Layer 4)**
- **Workflow Engines**: LangGraph (state machines), Temporal workflows
- **Multi-Agent Frameworks**: Microsoft AutoGen, CrewAI, OpenAI Swarm
- **Traditional Orchestrators**: Apache Airflow, Kubernetes Jobs

### Cross-Cutting Services

**Storage Systems**
- **Vector Databases**: ChromaDB, Pinecone, Weaviate for semantic search
- **Graph Databases**: Neo4j, Amazon Neptune for relationship modeling
- **Traditional Storage**: PostgreSQL, Redis for structured data and caching

**Observability**
- **Metrics**: Prometheus, Grafana for system monitoring
- **Tracing**: Jaeger, Zipkin, OpenTelemetry for request tracking
- **Logging**: Fluentd, Elasticsearch, CloudWatch for audit trails

**Security**
- **Secret Management**: HashiCorp Vault, Kubernetes secrets
- **Identity**: SPIFFE/SPIRE, OAuth2, service mesh identity
- **Policy**: Open Policy Agent (OPA), admission controllers

**Deployment**
- **Container Orchestration**: Kubernetes, OpenShift
- **Package Management**: Helm charts, Operators
- **GitOps**: ArgoCD, Flux for continuous deployment

## Repository Structure

- **`/demos/`** - Working examples and demonstrations
  - `github_review_agent/` - Complete GitHub PR review agent implementation
- **`/best_practices/`** - Guidance and analysis for each stack component

## Getting Started

1. **Explore the Demo**: Check out `/demos/github_review_agent/` for a complete working example
2. **Understand the Stack**: Review the layer-by-layer breakdown above
3. **Deep Dive**: Browse `/best_practices/` for detailed guidance on each component

---

*This project represents Red Hat ET's perspective on cloud-native agent systems and serves as a foundation for enterprise adoption.*
