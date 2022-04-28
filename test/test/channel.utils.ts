import { Channel } from 'amqp-connection-manager';
import { IAmqpConnectionManager } from 'amqp-connection-manager/dist/esm/AmqpConnectionManager';
import { randomUUID } from 'crypto';

export const testConnection = async (connection: IAmqpConnectionManager) => {
  await new Promise((res) => {
    connection.createChannel({
      setup: async (channel: Channel) => {
        const queueName = randomUUID();
        await channel.assertQueue(queueName);
        await channel.deleteQueue(queueName);
        await channel.close();

        res(channel);
      },
    });
  });
};
