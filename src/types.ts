import { RabbitMQService } from "./rabbitmq-service";

export interface RabbitMQConfig {
  url: string;
  consumerQueue: string;
  queuesToAssert: string[];
}

export interface BaseMessage {
  type: string;
  [key: string]: any;
}

export type MessageHandlerFn<T extends BaseMessage> = (
  message: T,
  services: {
    rabbitMQService: RabbitMQService;
  }
) => Promise<void>;

export interface MessageHandlers {
  [messageType: string]: MessageHandlerFn<any>;
}
