# foundation

### Foundation — NestJS, Next.js, Clerk and Prisma ORM with PostgreSQL

Foundation is a monorepo that contains multiple independently deployable projects forming the Console platform.  
Each project has its own CI/CD workflow and is released using Git tag–based deployments.

The repository is designed to be extensible, allowing additional projects to be added in the future without changing existing deployment logic.

---

## Projects

### Console API

**Type:** Backend API  
**Stack:** NestJS, Prisma ORM  
**Database:** PostgreSQL  
**Hosting:** Google Cloud Run  
**Async Processing:** Google Cloud Pub/Sub  
**Authentication:** Clerk (organization-based only)

Console API is a NestJS service deployed to Google Cloud Run.  
It is responsible for:
- Handling API requests
- Organization-scoped authentication and authorization
- Database access via Prisma ORM with PostgreSQL
- Publishing async tasks to Google Cloud Pub/Sub

#### Deployment Trigger

``` ca-v*.*.* ```

#### Deployment Flow

1. A Git tag matching the pattern is pushed
2. The GitHub Actions workflow for Console API is triggered
3. A Docker image is built and pushed to Google Artifact Registry
4. A new Cloud Run revision is created

---

### Console Worker

**Type:** Async Worker / Dispatcher  
**Stack:** NestJS  
**Hosting:** Google Cloud Run  
**Trigger:** Google Cloud Pub/Sub (push subscription)

Console Worker is a dedicated Google Cloud Run service responsible for handling **asynchronous workloads**.

It receives Pub/Sub push requests on an HTTP endpoint and follows a strict **ack-first execution model**.

#### Responsibilities

- Receive Pub/Sub push messages
- Validate and acknowledge requests immediately
- For long-running or heavy workloads:
    - Return HTTP `204 No Content` immediately
    - Create a **Cloud Run Job** to process the task asynchronously

This design prevents Pub/Sub retries, avoids request timeouts, and keeps costs predictable for long-running operations.

#### Async Processing Flow

1. Pub/Sub pushes a message to the Worker endpoint
2. Worker validates the request
3. Worker responds immediately with `204 No Content`
4. Worker creates a Cloud Run Job execution
5. Cloud Run Job processes the long-running task independently

#### Deployment Trigger

``` cwkr-v*.*.* ```

#### Deployment Flow

1. A Git tag matching the pattern is pushed
2. The GitHub Actions workflow for Console Worker is triggered
3. A Docker image is built and pushed to Google Artifact Registry
4. A new Cloud Run revision is created

---

### Console Web

**Type:** Frontend  
**Stack:** Next.js  
**Hosting:** Vercel  
**Authentication:** Clerk (organization-based only)

Console Web is a Next.js application deployed to Vercel.  
It provides the user interface for the Console platform and communicates with the Console API.

#### Deployment Trigger

``` cw-v*.*.* ```

#### Deployment Flow

1. A Git tag matching the pattern is pushed
2. The GitHub Actions workflow for Console Web is triggered
3. A new production deployment is created on Vercel

---

## CI/CD Strategy

This repository uses a **tag-based deployment strategy**.

Each project:
- Has its own GitHub Actions workflow
- Listens only to its specific Git tag pattern
- Is deployed independently from other projects

### Current Tag Patterns

| Project         | Tag Pattern   |
|-----------------|---------------|
| Console API     | ca-v*.*.*     |
| Console Worker  | cwkr-v*.*.*   |
| Console Web     | cw-v*.*.*     |

This ensures clear separation of deployments, prevents accidental releases, and keeps rollouts predictable.

---

## Authentication

Authentication and authorization are handled using Clerk.

- Organization-based authentication only
- No user-level ownership or billing
- All access and permissions are scoped to organizations

---

## Database

- PostgreSQL is used as the primary database
- Prisma ORM manages schema, migrations, and queries
- Centralized schema shared across backend services

---

## Extensibility

This repository is structured to support additional projects.

To add a new project:
1. Add a new app or package
2. Create a dedicated GitHub Actions workflow
3. Define a unique Git tag pattern
4. Deploy independently

No changes to existing projects are required.

---

## Summary

- Monorepo architecture
- Independent deployments per project
- Tag-driven CI/CD workflows
- Google Cloud Run for backend services and workers
- Cloud Run Jobs for long-running async tasks
- Vercel for frontend applications
- PostgreSQL with Prisma ORM
- Clerk for organization-based authentication
- Built to scale as new projects are added  
