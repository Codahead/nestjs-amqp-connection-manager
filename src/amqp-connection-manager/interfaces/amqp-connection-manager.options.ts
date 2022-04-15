import { AmqpConnectionManagerOptions } from 'amqp-connection-manager';

export interface AmqpConnectionProviderOptions extends AmqpConnectionManagerOptions {
  name: string;
  urls: string | string[];
}

export type AmqpConnectionSingleInstanceOptions = AmqpConnectionProviderOptions & {
  name?: AmqpConnectionProviderOptions['name'];
};

export type AmqpConnectionProviderAsyncOptions =
  | AmqpConnectionProviderSingleAsyncOptions
  | AmqpConnectionProviderMultipleAsyncOptions;

export interface AmqpConnectionProviderSingleAsyncOptions {
  inject?: any[];
  name?: string;
  useFactory: ConnectionFactoryFn;
}

export interface AmqpConnectionProviderMultipleAsyncOptions {
  inject?: any[];
  providerOptions: AsyncProviderOptions[];
}

interface AsyncProviderOptions {
  name: string;
  useFactory: ConnectionFactoryFn;
}

type ConnectionFactoryFn = (...args: any[]) => Promise<AmqpConnectionProviderOptions> | AmqpConnectionProviderOptions;
