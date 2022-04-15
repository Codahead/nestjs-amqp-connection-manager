import { createConnectionToken } from '../utils/create.tokens';
import { Inject } from '@nestjs/common';
import { AMQP_CONNECTION_MANAGER_DEFAULT_CONNECTION_NAME } from '../amqp-connection-manager.consts';

export const InjectAmqpManager = (name = AMQP_CONNECTION_MANAGER_DEFAULT_CONNECTION_NAME) => {
  return Inject(createConnectionToken(name));
};
