import 'jest';

import {Environment, NumericString} from '../src';

it('jest', () => expect(true).toBeTruthy());

it('validation', () => {
  expect(NumericString.parse('1')).toBeTruthy();
  expect(() => NumericString.parse(1)).toThrow();
  expect(() => NumericString.parse('')).toThrow();
  expect(() => NumericString.parse('a')).toThrow();

  const validEnvironment = {
    POSTGRES_PORT: '5432',
    POSTGRES_DB: 'dev',
    POSTGRES_USER: 'dev',
    POSTGRES_PASSWORD: 'dev',
    IPFS_PORT: '5001',
    ETHEREUM_PORT: '8545',
    ETHEREUM_NETWORK: 'hardhat',
    GRAPH_NODE_GRAPHQL_PORT: '8000',
    GRAPH_NODE_STATUS_PORT: '8020',
  };

  expect(Environment.parse(validEnvironment)).toBeTruthy();

  expect(() => Environment.parse({
    ...validEnvironment,
    POSTGRES_PORT: 5432,
  })).toThrow();

  expect(() => Environment.parse({
    ...validEnvironment,
    POSTGRES_PORT: 'not a number',
  })).toThrow();

  expect(() => Environment.parse({
    ...validEnvironment,
    POSTGRES_DB: '',
  })).toThrow();
});
