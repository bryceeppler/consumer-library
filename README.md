# Consumer Library RabbitMQ

A lightweight TypeScript wrapper for the amqplib package that simplifies working with RabbitMQ. This library provides a clean API for common RabbitMQ operations with built-in connection management, automatic reconnection, and error handling.

## Features

- Simple promise-based API for RabbitMQ operations
- Automatic reconnection with exponential backoff and jitter
- Connection health checks
- Typed message handling
- Easy queue, exchange, and binding management
- JSON serialization and deserialization

## Installation

```bash
pnpm add @snapstack/rabbitmq
```

## Usage

### Basic Setup

```typescript
import { RabbitMQ } from '@snapstack/rabbitmq';

// Create a new RabbitMQ instance
const rabbit = new RabbitMQ({
  url: 'amqp://localhost',
  reconnectTimeoutMs: 5000,
  prefetch: 10,
});

// Connect to RabbitMQ
await rabbit.connect();
```

### Publishing Messages

```typescript
// Publish a message to an exchange
await rabbit.assertExchange('notifications', 'fanout');
await rabbit.publish('notifications', '', { 
  userId: '123', 
  message: 'Hello World' 
});

// Using direct exchange with routing keys
await rabbit.assertExchange('tasks', 'direct');
await rabbit.publish('tasks', 'high-priority', { 
  taskId: '456', 
  data: { action: 'process' } 
});
```

### Consuming Messages

```typescript
// Define a typed message handler
interface TaskMessage {
  taskId: string;
  data: {
    action: string;
    [key: string]: any;
  };
}

// Assert queue and exchange
await rabbit.assertQueue('task-processor');
await rabbit.assertExchange('tasks', 'direct');
await rabbit.bindQueue('task-processor', 'tasks', 'high-priority');

// Consume messages
await rabbit.consume<TaskMessage>('task-processor', async (message, raw) => {
  console.log(`Processing task ${message.taskId}`);
  // Process the message
  // No need to manually acknowledge - handled automatically
});
```

### Health Checks

```typescript
// Check if the connection is healthy
if (rabbit.isHealthy()) {
  console.log('RabbitMQ connection is healthy');
} else {
  console.log('RabbitMQ connection is not healthy');
}
```

### Cleanup

```typescript
// Close the connection when done
await rabbit.close();
```

## Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| url | string | The RabbitMQ connection URL | Required |
| prefetch | number | Maximum number of unacknowledged messages | undefined |
| reconnectTimeoutMs | number | Base timeout for reconnection attempts | 5000 |
| logger | function | Custom logging function | console.log |

## Error Handling

The library automatically handles connection errors and attempts to reconnect with exponential backoff and jitter. Message processing errors are logged and the message is rejected (not requeued).

## License

MIT
