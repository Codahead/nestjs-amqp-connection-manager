import { createConnectionToken } from '../utils/create.tokens';
import { Inject } from '@nestjs/common';

export const InjectAmqpConnection = (name = 'default') => {
  return Inject(createConnectionToken(name));
};
