import { ConsumeMessage } from 'amqplib';

export type MessageHandler<T = any> = (msg: T, raw: ConsumeMessage) => Promise<void> | void;

export interface RabbitMQOptions {
  url: string;
  prefetch?: number;
  reconnectTimeoutMs?: number;
  logger?: (...args: any[]) => void;
}
