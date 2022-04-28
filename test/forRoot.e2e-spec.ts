import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Injectable, Module } from '@nestjs/common';
import { AmqpConnectionManagerModule, IAmqpConnectionManager, InjectAmqpManager } from '../src/main';
import { testConfig } from './config';
import { randomUUID } from 'crypto';
import { Channel } from 'amqp-connection-manager';
import { testConnection } from './test/channel.utils';

describe('Module forRoot (e2e)', () => {
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
        imports: [AmqpConnectionManagerModule.forRoot({ name: CONNECTION_NAME, urls: [testConfig.brokerUrl] })],
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
      app && app.close();
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
      @Module({
        imports: [
          AmqpConnectionManagerModule.forRoot([
            { name: FIRST_CONNECTION_NAME, urls: [testConfig.brokerUrl] },
            { name: SECOND_CONNECTION_NAME, urls: [testConfig.brokerUrl] },
          ]),
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
