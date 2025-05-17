# @eppler-software/rabbitmq-consumer

[![npm version](https://badge.fury.io/js/%40eppler-software%2Frabbitmq-consumer.svg)](https://badge.fury.io/js/%40eppler-software%2Frabbitmq-consumer)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A reusable library for building RabbitMQ consumers in TypeScript with pluggable message handlers.

## Installation

```bash
pnpm install @eppler-software/rabbitmq-consumer amqplib pg dotenv
# Or use npm install or yarn add
```

**Peer Dependencies:** `amqplib`, `pg`, `dotenv`

## Simple Example

Here's a basic example demonstrating how to set up a consumer that listens to a queue, defines a message type, and handles it.

### 1. Define Your Message Types

```typescript
// src/messageTypes.ts
import { BaseMessage } from '@eppler-software/rabbitmq-consumer';

export interface SimpleGreetingMessage extends BaseMessage {
  type: 'greeting.simple';
  payload: { name: string };
}
```

### 2. Implement Your Message Handler

```typescript
// src/handlers.ts
import { MessageHandlerFn } from '@eppler-software/rabbitmq-consumer';
import { SimpleGreetingMessage } from './messageTypes';

export const handleSimpleGreeting: MessageHandlerFn<SimpleGreetingMessage> = async (
  message,
  services, // services object contains rabbitMQService and postgresService
) => {
  console.log(`Received a simple greeting for: ${message.payload.name}`);
  // You can use services here if needed, e.g., services.rabbitMQService.sendToQueue(...)
};
```

### 3. Configure and Start the Consumer

```typescript
// src/index.ts
import { ConsumerLib, ConsumerLibConfig, MessageHandlers } from '@eppler-software/rabbitmq-consumer';
import dotenv from 'dotenv';
import { handleSimpleGreeting } from './handlers'; // Import your handler

dotenv.config();

const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://localhost';

const myConsumerQueue = 'my_simple_queue';

// Map your message type to the handler function
const messageHandlers: MessageHandlers = {
  'greeting.simple': handleSimpleGreeting,
};

const config: ConsumerLibConfig = {
  rabbitmq: {
    url: rabbitMQUrl,
    consumerQueueName: myConsumerQueue, // The queue this consumer listens to
    queuesToAssert: [myConsumerQueue], // Ensure the consumer queue exists
  },
  // No 'postgres' config needed if handlers don't use it
  messageHandlers: messageHandlers,
};

const consumer = new ConsumerLib(config);

consumer.start().catch(err => {
  console.error('Failed to start consumer:', err);
  process.exit(1);
});
```

To run this example:

1.  Make sure you have a RabbitMQ instance running (defaulting to `amqp://localhost`).
2.  Put the code for `messageTypes.ts`, `handlers.ts`, and `index.ts` in your project's `src` directory.
3.  Have a `tsconfig.json` and `package.json` set up for your application.
4.  Run `pnpm install` (or npm/yarn).
5.  Run `pnpm build` (or npm run build).
6.  Run `pnpm start` (or npm start).

Send a message like this to `my_simple_queue` to see the handler execute:

```json
{
  "type": "greeting.simple",
  "payload": {
    "name": "World"
  }
}
```

## Example with Routing and Database

This example demonstrates handling two different message types, one that routes to another queue and one that writes to a database and then routes.

### Message Types

```typescript
// src/messageTypes.ts
import { BaseMessage } from '@eppler-software/rabbitmq-consumer';

export interface RouteMeMessage extends BaseMessage {
  type: 'action.route_me';
  payload: { someData: any };
}

export interface ProcessAndRouteMessage extends BaseMessage {
  type: 'action.process_and_route';
  payload: { dbData: any; queueDData: any };
}
```

### Handlers

```typescript
// src/handlers.ts
import { MessageHandlerFn } from '@eppler-software/rabbitmq-consumer';
import { RouteMeMessage, ProcessAndRouteMessage } from './messageTypes';

const queueB = 'queue_for_routing';
const queueD = 'queue_after_processing';

export const handleRouteMe: MessageHandlerFn<RouteMeMessage> = async (
  message,
  { rabbitMQService },
) => {
  console.log('Handling Route Me:', message.payload);
  await rabbitMQService.sendToQueue(queueB, Buffer.from(JSON.stringify(message.payload)));
  console.log(`Routed to ${queueB}`);
};

export const handleProcessAndRoute: MessageHandlerFn<ProcessAndRouteMessage> = async (
  message,
  { postgresService, rabbitMQService },
) => {
  console.log('Handling Process and Route:', message.payload);
  if (!postgresService) {
    throw new Error('PostgresService is required for Process and Route handler');
  }

  await postgresService.insertData(message.payload.dbData);
  console.log('Data written to database');

  await rabbitMQService.sendToQueue(queueD, Buffer.from(JSON.stringify(message.payload.queueDData)));
  console.log(`Routed to ${queueD}`);
};
```

### Consumer Configuration

```typescript
// src/index.ts
import { ConsumerLib, ConsumerLibConfig, MessageHandlers } from '@eppler-software/rabbitmq-consumer';
import dotenv from 'dotenv';
import { handleRouteMe, handleProcessAndRoute } from './handlers'; // Import your handlers

dotenv.config();

const rabbitMQUrl = process.env.RABBITMQ_URL || 'amqp://localhost';
const postgresConnectionString = process.env.POSTGRES_URL || 'postgresql://user:password@host:port/database'; // Ensure this is set

const mainConsumerQueue = 'my_main_processing_queue';
const queueB = 'queue_for_routing'; // Must match the handler
const queueD = 'queue_after_processing'; // Must match the handler

const messageHandlers: MessageHandlers = {
  'action.route_me': handleRouteMe,
  'action.process_and_route': handleProcessAndRoute,
};

const config: ConsumerLibConfig = {
  rabbitmq: {
    url: rabbitMQUrl,
    consumerQueueName: mainConsumerQueue,
    queuesToAssert: [
      mainConsumerQueue,
      queueB,
      queueD,
    ],
  },
  postgres: { // Include postgres config because a handler needs it
    connectionString: postgresConnectionString,
  },
  messageHandlers: messageHandlers,
};

const consumer = new ConsumerLib(config);

consumer.start().catch(err => {
  console.error('Failed to start consumer:', err);
  process.exit(1);
});
```

To run this example:

1.  Make sure you have RabbitMQ and PostgreSQL running.
2.  Update your `.env` file with `RABBITMQ_URL` and `POSTGRES_URL`.
3.  Use the code for message types, handlers, and index.
4.  Install dependencies (`pnpm install`).
5.  Build and start (`pnpm build`, `pnpm start`).

Send messages to `my_main_processing_queue` to trigger the handlers:

**Message for `action.route_me`:**

```json
{
  "type": "action.route_me",
  "payload": {
    "someData": "This will go to queue_for_routing"
  }
}
```

**Message for `action.process_and_route`:**

```json
{
  "type": "action.process_and_route",
  "payload": {
    "dbData": {
      "recordId": 123,
      "value": "data for postgres"
    },
    "queueDData": {
      "finalStep": true,
      "processedValue": "ready for queue_after_processing"
    }
  }
}
```

---

This README focuses on clear, runnable examples, which is often the most effective way to showcase how a library is used. Remember to keep the examples concise and directly demonstrate the key features.
