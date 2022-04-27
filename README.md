# NestJS AMQP Connection Manager

## Description

Project based on [nestjs-amqp](https://github.com/nestjsx/nestjs-amqp), but under the hood
using [amqp-connection-manager](https://www.npmjs.com/package/amqp-connection-manager)
instead of pure [amqplib](https://www.npmjs.com/package/amqplib).

The project provides wrapper on `amqp-connection-manager` allowing to easily use it with
[NestJS framework](https://github.com/nestjs/nest).

## Installation

npm:

```sh
npm i @codahead/nestjs-amqp-connection-manager amqp-connection-manager amqplib
npm i --save-dev @types/amqplib
```

yarn:

```sh
yarn add @codahead/nestjs-amqp-connection-manager amqp-connection-manager amqplib
yarn add -D @types/amqplib
```

## Usage

### Importing module

The package provides four ways to import the module, for creating single connection
and multiple connections using both `forRoot` and `forRootAsync` methods.

#### forRoot method

Creating single connection example:

```ts
import { AmqpConnectionManagerModule } from "@codahead/nestjs-amqp-connection-manager"; 
const CONNECTION_NAME = 'connection1';

@Module({
    // name is optional and defaults to AMQP_CONNECTION_MANAGER_DEFAULT_CONNECTION_NAME constant
    imports: [AmqpConnectionManagerModule.forRoot({ name: CONNECTION_NAME, urls: ['url'] })],
})
class AppModule {}
```

Creating multiple connections example:

```ts
import { AmqpConnectionManagerModule } from "@codahead/nestjs-amqp-connection-manager"; 
const FIRST_CONNECTION_NAME = 'connection1';
const SECOND_CONNECTION_NAME = 'connection2';

@Module({
    // name is optional and defaults to AMQP_CONNECTION_MANAGER_DEFAULT_CONNECTION_NAME constant
    imports: [AmqpConnectionManagerModule.forRoot([{ name: CONNECTION_NAME, urls: ['url'] }, { name: SECOND_CONNECTION_NAME, urls: ['url'] }])],
})
class AppModule {}
```

#### forRootAsync method

Creating single connection example:

```ts
import { AmqpConnectionManagerModule } from "@codahead/nestjs-amqp-connection-manager"; 
const CONNECTION_NAME = 'connection1';

@Injectable()
  class ConfigServiceProvider {
    public getConfig(): AmqpConnectionSingleInstanceOptions {
      return { urls: ['testConfig.brokerUrl'] };
    }
  }

@Module({ providers: [ConfigServiceProvider], exports: [ConfigServiceProvider] })
class ConfigServiceModule {}

@Module({
    imports: [
        AmqpConnectionManagerModule.forRootAsync({
            name: CONNECTION_NAME,
            useFactory: (config: ConfigServiceProvider) => {
                return config.getConfig();
            },
            inject: [ConfigServiceProvider],
            imports: [ConfigServiceModule],
        }),
        ConfigServiceModule,
    ],
    providers: [AmqpService],
})
class AppModule {}
```

Creating multiple connection example:

```ts
// [...]

@Module({
  imports: [
    AmqpConnectionManagerModule.forRootAsync({
      providerOptions: [
        { useFactory: factory, name: FIRST_CONNECTION_NAME, inject: [ConfigServiceProvider] },
        { useFactory: factory, name: SECOND_CONNECTION_NAME, inject: [ConfigServiceProvider] },
      ],
      inject: [ConfigServiceProvider],
      imports: [ConfigServiceModule],
    }),
    ConfigServiceModule,
  ],
  providers: [AmqpService],
})
class AppModule {}
```

### Injecting connection manager

Connection can be injected using `InjectAmqpConnection` decorator.

```ts
import { InjectAmqpManager } from "@codahead/nestjs-amqp-connection-manager"; 

// [...]

@Injectable()
class AmqpService {
    constructor(
        @InjectAmqpManager(FIRST_CONNECTION_NAME) public readonly connection1: IAmqpConnectionManager,
        @InjectAmqpManager(SECOND_CONNECTION_NAME) public readonly connection2: IAmqpConnectionManager,
    ) {}
}
```

Decorator parameter may be omitted if only one connection was created and its name was not overridden.

### Amqplib and amqp-connection-manager

To learn how to use amqplib and amqp-connection-manager you can head to:

- [RabbitMQ documentation](https://www.rabbitmq.com/tutorials/tutorial-one-javascript.html)
- [AMQP connection manager GitHub page](https://github.com/jwalton/node-amqp-connection-manager)
