# Bako Analytics

This project implements a system to analyze Bako wallet information, generating usage statistics on the Fuel Network. It uses **TypeScript**, **Bull**, and **AWS ECS** to manage crons, queues, and asynchronous task processing, focusing on scalability and performance.

## Technologies Used

- **Bull**: Library for queue management in Node.js, based on Redis.
- **Redis**: Used as the backend for Bull, storing queue and task data.
- **Node-cron** (or another cron manager): Used to schedule periodic task execution.
- **Metabase**: Data visualization and analysis tool.

## Functionality

1. **Crons**:

   - A cron job is configured to execute tasks at specific time intervals.
   - When the cron is triggered, it consumes data from **BD1**.
   - The consumed data is published to a queue managed by Bull.

2. **Queues**:

   - Bull manages a queue where the messages published by the crons are stored.
   - Consumers process these messages as they become available.

3. **Processing**:

   - Queued tasks are processed asynchronously by configured workers.
   - Processed data is saved in **BD2**.

4. **Visualization**:

   - **Metabase** queries the data stored in **BD2** to generate reports and analytical dashboards.

## Project Structure

```
├── worker                   # Workers responsible for queue processing
│   ├── src
│   │   ├── mocks            # Mock data for testing
│   │   ├── queues           # Queue configuration and processing
│   │   │   ├── queue
│   │   │   │   └── utils
│   │   │   │       ├── index.ts
│   │   │   │       ├── constants.ts    # Queue configuration constants (cron expressions, names, etc.)
│   │   │   │       ├── queue.ts        # Queue declaration
│   │   │   │       ├── scheduler.ts    # Cron to add items to the queue
│   │   │   │       └── types.ts        # Module typings
│   │   └── clients                     # Clients for consuming external services (connection config, utilities, etc.)
│   │       ├── index.ts
│   │       ├── psqlClient.ts
│   │       ├── mongoClient.ts
│   │       └── redisClient.ts
```

### Prerequisites

- **Docker**
- **Redis**: Run `packages/redis` within this same project
- **Databases**: Run `packages/database` within this same project to enable Docker with MongoDB and PostgreSQL

### Local Execution

1. Configure the environment variables:

   - Create a `.env` file with the content of `.env.example`

2. Install dependencies:

   - `pnpm install`

3. Start the Bako API:

   - `pnpm dev`

4. Run this project in development mode:
   - `pnpm worker:dev:start`

### Scalability

- The system is designed to support high loads, with the ability to scale horizontally by increasing the number of workers configured in ECS. To achieve this, scheduling functions should be moved to a separate project to avoid unnecessary scheduling of additional executions.
- This adjustment becomes necessary as more wallets are created on Bako.
