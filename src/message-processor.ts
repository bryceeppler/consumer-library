// src/messageProcessor.ts
import { BaseMessage, MessageHandlers } from './types';
import { RabbitMQService } from './rabbitmq-service';

export class MessageProcessor {
  private handlers: MessageHandlers;
  private rabbitMQService: RabbitMQService;

  constructor(
    handlers: MessageHandlers,
    rabbitMQService: RabbitMQService,
  ) {
    this.handlers = handlers;
    this.rabbitMQService = rabbitMQService;
  }

  public async processMessage(message: BaseMessage): Promise<void> {
    const handler = this.handlers[message.type];

    if (!handler) {
      console.warn('MessageProcessor: No handler found for message type:', message.type);
      // Optionally handle unknown types (e.g., dead-letter queue)
      return;
    }

    try {
      await handler(message, {
        rabbitMQService: this.rabbitMQService,
      });
    } catch (error) {
      console.error(`MessageProcessor: Error processing message of type ${message.type}:`, error);
      // Implement error handling (e.g., retry, dead-letter queue)
    }
  }
}
