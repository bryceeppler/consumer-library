import amqp from 'amqplib';
import { RabbitMQConfig } from './types';

export class RabbitMQService {
  private connection: amqp.ChannelModel| null = null;
  private channel: amqp.Channel | null = null;
  private config: RabbitMQConfig;

  constructor(config: RabbitMQConfig) {
    this.config = config;
  }

  public async connect(): Promise<void> {
    this.connection = await amqp.connect(this.config.url);
    this.channel = await this.connection.createChannel();
    console.log('RabbitMQService: Connected to RabbitMQ');

    for (const queue of this.config.queuesToAssert) {
      await this.channel.assertQueue(queue, { durable: false });
      console.log(`RabbitMQService: Asserted queue: ${queue}`);
    }
  }

  public async sendToQueue(queue: string, message: Buffer): Promise<boolean> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available');
    }
    return this.channel.sendToQueue(queue, message);
  }

  public async consume(
    queue: string,
    onMessage: (msg: amqp.ConsumeMessage | null) => void,
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available');
    }
    await this.channel.consume(queue, onMessage, { noAck: true });
    console.log(`RabbitMQService: Listening on queue: ${queue}`);
  }

  public async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
    console.log('RabbitMQService: Connection closed');
  }
}
