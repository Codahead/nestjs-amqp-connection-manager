import { AmqpConnectionManagerOptions } from 'amqp-connection-manager';

export interface AmqpConnectionProviderOptions extends AmqpConnectionManagerOptions {
  name: string;
  urls: string | string[];
}

export type AmqpConnectionSingleInstanceOptions = Optional<AmqpConnectionProviderOptions, 'name'>;

export type AmqpConnectionProviderAsyncOptions =
  | AmqpConnectionProviderSingleAsyncOptions
  | AmqpConnectionProviderMultipleAsyncOptions;

export interface AmqpConnectionProviderSingleAsyncOptions {
  inject?: any[];
  name?: string;
  useFactory: ConnectionFactoryFn;
  imports?: any[];
}

export interface AmqpConnectionProviderMultipleAsyncOptions {
  providerOptions: AsyncProviderOptions[];
  imports?: any[];
}

interface AsyncProviderOptions {
  name: string;
  useFactory: ConnectionFactoryFn;
  inject?: any[];
}

type ConnectionFactoryFn = (
  ...args: any[]
) => Promise<AmqpConnectionSingleInstanceOptions> | AmqpConnectionSingleInstanceOptions;
type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
