import {
  AMQP_CONNECTION_MANAGER_CONNECTION_PROVIDER,
  AMQP_CONNECTION_MANAGER_OPTIONS_PROVIDER,
} from '../amqp-connection-manager.consts';

export const createOptionsToken = (name: string): string => {
  return `${AMQP_CONNECTION_MANAGER_OPTIONS_PROVIDER}_${name}`;
};

export const createConnectionToken = (name: string): string => {
  return `${AMQP_CONNECTION_MANAGER_CONNECTION_PROVIDER}_${name}`;
};
