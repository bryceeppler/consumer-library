import amqp, { Channel, ChannelModel } from 'amqplib';
import { RabbitMQOptions, MessageHandler } from './types';

export class RabbitMQ {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private reconnectTimeout: number;
  private url: string;
  private logger: (...args: any[]) => void;
  private prefetch?: number;
  private isConnected = false;
  private reconnectAttempts = 0;

  constructor(options: RabbitMQOptions) {
    this.url = options.url;
    this.reconnectTimeout = options.reconnectTimeoutMs ?? 5000;
    this.logger = options.logger ?? console.log;
    this.prefetch = options.prefetch;
  }

  async connect(): Promise<void> {
    try {
      this.logger(`[RabbitMQ] Connecting to ${this.url}...`);
      this.connection = await amqp.connect(this.url);

      this.connection.on('error', (err) => {
        this.logger('[RabbitMQ] Connection error', err);
        this.reconnect();
      });

      this.connection.on('close', () => {
        this.logger('[RabbitMQ] Connection closed');
        this.reconnect();
      });

      this.channel = await this.connection.createChannel();

      if (this.prefetch) {
        this.channel.prefetch(this.prefetch);
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger('[RabbitMQ] Connected and channel created');
    } catch (err) {
      this.logger('[RabbitMQ] Connection failed, retrying...', err);
      this.reconnect();
    }
  }

  private async reconnect() {
    this.isConnected = false;
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectTimeout * 2 ** this.reconnectAttempts, 30000);
    const jitter = Math.random() * 1000;
    setTimeout(() => this.connect(), delay + jitter);
  }

  isHealthy(): boolean {
    return this.isConnected && this.connection !== null;
  }

  async assertQueue(queue: string) {
    await this.channel?.assertQueue(queue, { durable: true });
  }

  async assertExchange(name: string, type: 'fanout' | 'direct' | 'topic' = 'fanout') {
    await this.channel?.assertExchange(name, type, { durable: true });
  }

  async bindQueue(queue: string, exchange: string, pattern = '') {
    await this.channel?.bindQueue(queue, exchange, pattern);
  }

  async publish(exchange: string, routingKey: string, message: object) {
    const payload = Buffer.from(JSON.stringify(message));
    this.channel?.publish(exchange, routingKey, payload);
  }

  async consume<T>(queue: string, handler: MessageHandler<T>) {
    await this.assertQueue(queue);

    this.channel?.consume(queue, async (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        await handler(data, msg);
        this.channel?.ack(msg);
      } catch (err) {
        this.logger('[RabbitMQ] Error handling message', err);
        this.channel?.nack(msg, false, false); // drop message
      }
    });
  }

  async close() {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (err) {
      this.logger('[RabbitMQ] Error closing connection', err);
    }
  }
}
