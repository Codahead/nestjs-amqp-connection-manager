import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Injectable, Module } from '@nestjs/common';
import { AmqpConnectionManagerModule, IAmqpConnectionManager, InjectAmqpConnection } from '../src/main';
import { testConfig } from './config';

describe('Module forRoot (e2e)', () => {
  describe('single connection', () => {
    const CONNECTION_NAME = 'hehe';

    @Injectable()
    class AmqpService {
      constructor(@InjectAmqpConnection(CONNECTION_NAME) public readonly connection: IAmqpConnectionManager) {}
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
    });

    it('should allow the connection to create channel', async () => {
      const { connection } = service;

      const channel = connection.createChannel();
      expect(channel.assertQueue('test-queue')).resolves.not.toThrow();
    });
  });

  describe('multiple connections', () => {
    const FIRST_CONNECTION_NAME = 'hehe';
    const SECOND_CONNECTION_NAME = 'hehe2';

    @Injectable()
    class AmqpService {
      constructor(
        @InjectAmqpConnection(FIRST_CONNECTION_NAME) public readonly connection1: IAmqpConnectionManager,
        @InjectAmqpConnection(SECOND_CONNECTION_NAME) public readonly connection2: IAmqpConnectionManager,
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
  });
});
