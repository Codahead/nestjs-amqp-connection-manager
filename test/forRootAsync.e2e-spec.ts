import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Injectable, Module } from '@nestjs/common';
import {
  AmqpConnectionManagerModule,
  AmqpConnectionSingleInstanceOptions,
  IAmqpConnectionManager,
  InjectAmqpManager,
} from '../src/main';
import { testConfig } from './config';
import { testConnection } from './test/channel.utils';
import { Channel } from 'amqplib';
import { randomUUID } from 'crypto';

describe('Module forRootAsync (e2e)', () => {
  @Injectable()
  class ConfigServiceProvider {
    public getConfig(): AmqpConnectionSingleInstanceOptions {
      return { urls: [testConfig.brokerUrl] };
    }
  }

  @Module({ providers: [ConfigServiceProvider], exports: [ConfigServiceProvider] })
  class ConfigServiceModule {}

  describe('single connection', () => {
    const CONNECTION_NAME = 'hehe';

    @Injectable()
    class AmqpService {
      constructor(@InjectAmqpManager(CONNECTION_NAME) public readonly connection: IAmqpConnectionManager) {}
    }

    let service: AmqpService;
    let app: INestApplication;

    beforeAll(async () => {
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

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
      app.enableShutdownHooks();

      service = app.get<AmqpService>(AmqpService);
    });

    afterAll(async () => {
      app && (await app.close());
    });

    it('should properly create connection', async () => {
      const { connection } = service;

      expect(connection).toBeDefined();
      await testConnection(connection);
    });
  });

  describe('multiple connections', () => {
    const FIRST_CONNECTION_NAME = 'hehe';
    const SECOND_CONNECTION_NAME = 'hehe2';

    @Injectable()
    class AmqpService {
      constructor(
        @InjectAmqpManager(FIRST_CONNECTION_NAME) public readonly connection1: IAmqpConnectionManager,
        @InjectAmqpManager(SECOND_CONNECTION_NAME) public readonly connection2: IAmqpConnectionManager,
      ) {}
    }

    let service: AmqpService;
    let app: INestApplication;

    beforeAll(async () => {
      const factory = (config: ConfigServiceProvider) => {
        return config.getConfig();
      };

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

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();
      app.enableShutdownHooks();

      service = app.get<AmqpService>(AmqpService);
    });

    afterAll(async () => {
      app && (await app.close());
    });

    it('should create two separate connections', () => {
      const { connection1, connection2 } = service;
      expect(connection1).not.toBe(connection2);
    });

    it('should have two fully operational connections', async () => {
      const queueName = randomUUID();
      const { connection1, connection2 } = service;

      await new Promise((res) =>
        connection1.createChannel({
          setup: async (channel: Channel) => {
            await channel.assertQueue(queueName);
            await channel.close();
            res(channel);
          },
        }),
      );

      await new Promise((res) =>
        connection2.createChannel({
          setup: async (channel: Channel) => {
            await channel.deleteQueue(queueName);
            await channel.close();
            res(channel);
          },
        }),
      );
    });
  });
});
