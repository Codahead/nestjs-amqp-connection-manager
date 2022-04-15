import { DynamicModule, Module, OnModuleDestroy, Provider } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { connect } from 'amqp-connection-manager';
import { IAmqpConnectionManager } from 'amqp-connection-manager/dist/esm/AmqpConnectionManager';
import { AMQP_CONNECTION_MANAGER_DEFAULT_CONNECTION_NAME } from './amqp-connection-manager.consts';
import {
  AmqpConnectionProviderAsyncOptions,
  AmqpConnectionProviderMultipleAsyncOptions,
  AmqpConnectionProviderOptions,
  AmqpConnectionProviderSingleAsyncOptions,
  AmqpConnectionSingleInstanceOptions,
} from './interfaces/amqp-connection-manager.options';
import { createConnectionToken, createOptionsToken } from './utils/create.tokens';

@Module({})
export class AmqpConnectionManagerModule implements OnModuleDestroy {
  private static connectionNames: string[] = [];

  constructor(private readonly moduleRef: ModuleRef) {}

  public static forRoot(options: AmqpConnectionSingleInstanceOptions | AmqpConnectionProviderOptions[]): DynamicModule {
    const optionsArray = Array.isArray(options) ? options : [this.ensureConnectionName(options)];

    const connectionNames = optionsArray.map(({ name }) => name);
    this.ensureUniqueConnectionNames(connectionNames);
    this.connectionNames.push(...connectionNames);

    const connectionProviders = optionsArray.map(({ name }) => this.createConnectionProvider(name));
    const optionsProviders = optionsArray.map(this.createOptionsProvider);

    return {
      module: AmqpConnectionManagerModule,
      providers: [...connectionProviders, ...optionsProviders],
      exports: connectionProviders,
    };
  }

  public static forFeature() {
    return {
      module: AmqpConnectionManagerModule,
    };
  }

  public static forRootAsync(options: AmqpConnectionProviderAsyncOptions): DynamicModule {
    const multipleProviders = this.isMultipleProviderOptions(options);

    const connectionNames: string[] = [];
    const connectionProviders: Provider[] = [];
    const optionsProviders: Provider[] = [];

    if (multipleProviders) {
      const { providerOptions } = options;
      connectionNames.push(...providerOptions.map(({ name }) => name));
      this.ensureUniqueConnectionNames(connectionNames);

      connectionProviders.push(...providerOptions.map(({ name }) => this.createConnectionProvider(name)));
      optionsProviders.push(...providerOptions.map((options) => this.createAsyncOptionsProvider(options)));
    } else {
      const name = options.name || 'default';
      connectionProviders.push(this.createConnectionProvider(name));
      optionsProviders.push(this.createAsyncOptionsProvider({ ...options, name }));

      connectionNames.push(name);
    }

    this.connectionNames.push(...connectionNames);

    return {
      module: AmqpConnectionManagerModule,
      providers: [...connectionProviders, ...optionsProviders],
      exports: connectionProviders,
      imports: options.imports,
    };
  }

  private static ensureUniqueConnectionNames(connectionNames: string[]) {
    return new Set(...connectionNames).size === connectionNames.length;
  }

  private static ensureConnectionName(
    singleInstanceOptions: AmqpConnectionSingleInstanceOptions,
  ): AmqpConnectionProviderOptions {
    const name = singleInstanceOptions.name || AMQP_CONNECTION_MANAGER_DEFAULT_CONNECTION_NAME;
    return { ...singleInstanceOptions, name };
  }

  private static createOptionsProvider(options: AmqpConnectionProviderOptions): Provider {
    return {
      provide: createOptionsToken(options.name),
      useValue: options,
    };
  }

  private static createConnectionProvider(connectionName: string): Provider {
    return {
      provide: createConnectionToken(connectionName),
      useFactory: (config: AmqpConnectionProviderOptions) => {
        const { urls, ...connectionOptions } = config;
        return connect(urls, connectionOptions);
      },
      inject: [createOptionsToken(connectionName)],
    };
  }

  private static createAsyncOptionsProvider(options: AmqpConnectionProviderSingleAsyncOptions): Provider {
    return {
      provide: createOptionsToken(options.name || AMQP_CONNECTION_MANAGER_DEFAULT_CONNECTION_NAME),
      useFactory: options.useFactory,
      inject: options.inject || [],
    };
  }

  private static isMultipleProviderOptions(
    options: AmqpConnectionProviderAsyncOptions,
  ): options is AmqpConnectionProviderMultipleAsyncOptions {
    return Array.isArray((<AmqpConnectionProviderMultipleAsyncOptions>options).providerOptions);
  }

  async onModuleDestroy() {
    const connectionClosePromises = AmqpConnectionManagerModule.connectionNames.map(async (connectionName) => {
      const connection = this.moduleRef.get<IAmqpConnectionManager>(createConnectionToken(connectionName));
      await connection.close();
    });

    await Promise.all(connectionClosePromises);
  }
}
