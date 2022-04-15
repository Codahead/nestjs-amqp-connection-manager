import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Injectable, Module } from '@nestjs/common';
import {
  AmqpConnectionManagerModule,
  AmqpConnectionSingleInstanceOptions,
  IAmqpConnectionManager,
  InjectAmqpConnection,
} from '../src/main';
import { testConfig } from './config';

describe('Module forRootAsync (e2e)', () => {
  describe('single connection', () => {
    const CONNECTION_NAME = 'hehe';

    @Injectable()
    class AmqpService {
      constructor(@InjectAmqpConnection(CONNECTION_NAME) public readonly connection: IAmqpConnectionManager) {}
    }

    @Injectable()
    class ConfigServiceProvider {
      public getConfig(): AmqpConnectionSingleInstanceOptions {
        return { urls: [testConfig.brokerUrl] };
      }
    }

    @Module({ providers: [ConfigServiceProvider], exports: [ConfigServiceProvider] })
    class ConfigServiceModule {}

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
    });

    it('should allow the connection to create channel', async () => {
      const { connection } = service;

      const channel = connection.createChannel();
      expect(channel.assertQueue('test-queue')).resolves.not.toThrow();
    });
  });
});
