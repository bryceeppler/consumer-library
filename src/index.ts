import { RabbitMQService } from './rabbitmq-service';
import { MessageProcessor } from './message-processor';
import { RabbitMQConfig, BaseMessage, MessageHandlers } from './types';
import amqp from 'amqplib';

export interface ConsumerLibConfig {
  rabbitmq: RabbitMQConfig;
  messageHandlers: MessageHandlers;
}

export class ConsumerLib {
  private rabbitMQService: RabbitMQService;
  private messageProcessor: MessageProcessor;
  private config: ConsumerLibConfig;

  constructor(config: ConsumerLibConfig) {
    this.config = config;
    this.rabbitMQService = new RabbitMQService(config.rabbitmq);
    this.messageProcessor = new MessageProcessor(
      config.messageHandlers,
      this.rabbitMQService,
    );
  }

  public async start(): Promise<void> {
    await this.rabbitMQService.connect();

    await this.rabbitMQService.consume(
      this.config.rabbitmq.consumerQueue,
      async (msg: amqp.ConsumeMessage | null) => {
        if (msg !== null) {
          try {
            const message: BaseMessage = JSON.parse(msg.content.toString());
            await this.messageProcessor.processMessage(message);
          } catch (error) {
            console.error('ConsumerLib: Failed to process message:', error);
          }
        }
      },
    );

    console.log(`ConsumerLib: Started, listening on ${this.config.rabbitmq.consumerQueue}`);

    process.on('SIGINT', async () => {
      console.log('ConsumerLib: Shutting down...');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('ConsumerLib: Shutting down...');
      await this.stop();
      process.exit(0);
    });
  }

  public async stop(): Promise<void> {
    await this.rabbitMQService.close();
    console.log('ConsumerLib: Stopped.');
  }
}

export * from './types';
