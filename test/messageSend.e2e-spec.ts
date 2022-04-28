import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Injectable, Module } from '@nestjs/common';
import { AmqpConnectionManagerModule, IAmqpConnectionManager, InjectAmqpManager } from '../src/main';
import { testConfig } from './config';
import { Channel } from 'amqp-connection-manager';

describe('Message send and receive test (e2e)', () => {
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
    const queueName = (Math.random() + 1).toString(36).substring(2);

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

    it('should be able to send and receive amqp message', async () => {
      const message = Buffer.from('hello world');

      const { connection1, connection2 } = service;

      await new Promise((resolve) => {
        connection1.createChannel({
          name: 'testMessageSendConn1',
          setup: async (channel: Channel) => {
            await channel.assertQueue(queueName);
            channel.sendToQueue(queueName, message);
            channel.close();
            resolve(null);
          },
        });
      });

      const receivedMessage = await new Promise((resolve, reject) => {
        connection2.createChannel({
          name: 'testMessageSendConn2',
          setup: async (channel: Channel) => {
            await channel.assertQueue(queueName);
            channel.consume(queueName, (msg) => {
              if (!msg) {
                reject(new Error('Received empty message'));
              }

              channel.close();
              resolve(msg?.content);
            });
          },
        });
      });

      expect(receivedMessage).toStrictEqual(message);
    });
  });
});
