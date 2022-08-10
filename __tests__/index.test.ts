import 'jest';

import path from 'path';
import fs from 'fs-extra';

import {createHardhatProject, compileHardhatProject} from 'hardhat-copy';

import {
  createRepo,
  createGraphProtocolTemplate,
  Environment,
  NumericString,
  randomTempPath,
  tempPath,
  throwOrPurgeOnDirExists, createSubgraphTemplate,
} from '../src';

const VALID_ENVIRONMENT = Object.freeze({
  POSTGRES_PORT: '5432',
  POSTGRES_DB: 'dev',
  POSTGRES_USER: 'dev',
  POSTGRES_PASSWORD: 'dev',
  IPFS_PORT: '5001',
  ETHEREUM_PORT: '8545',
  ETHEREUM_NETWORK: 'hardhat',
  GRAPH_NODE_GRAPHQL_PORT: '8000',
  GRAPH_NODE_STATUS_PORT: '8020',
});

const createHardhatTestProject = ({dir}: {
  readonly dir: string;
}) => {
  throwOrPurgeOnDirExists({dir, purgeIfExists: true});
  const compilerVersion = '0.8.9';

  const {contractsDir} = createHardhatProject({
    hardhatProjectPath: dir,
    compilerVersion,
  });

  fs.writeFileSync(
    path.resolve(contractsDir, 'SimpleStorage.sol'),
    `
// SPDX-License-Identifier: MIT
pragma solidity ${compilerVersion};

contract SimpleStorage {

  mapping(uint256 => string) private entries;
  
  event PutValue(uint256 _loc, string _value);
  
  function
  put (uint256 _loc, string memory _value)
  public
  {
    entries[_loc] = _value;
    emit PutValue(_loc, _value);
  }
  
  function
  get (uint256 _loc)
  public
  view
  returns (string memory)
  {
    return entries[_loc];
  }
}
    `.trim(),
  );
};

it('jest', () => expect(true).toBeTruthy());

it('validation', () => {
  expect(NumericString.parse('1')).toBeTruthy();

  expect(() => NumericString.parse(1)).toThrow();
  expect(() => NumericString.parse('')).toThrow();
  expect(() => NumericString.parse('a')).toThrow();

  expect(Environment.parse(VALID_ENVIRONMENT)).toBeTruthy();

  expect(() => Environment.parse({...VALID_ENVIRONMENT, POSTGRES_PORT: 5432})).toThrow();
  expect(() => Environment.parse({...VALID_ENVIRONMENT, POSTGRES_PORT: 'not a number'})).toThrow();
  expect(() => Environment.parse({...VALID_ENVIRONMENT, POSTGRES_DB: ''})).toThrow();
});

it("throwOrPurgeOnDirExists", () => {

  const dir = randomTempPath();

  throwOrPurgeOnDirExists({
    dir,
  });

  throwOrPurgeOnDirExists({
    dir,
    purgeIfExists: false,
  });

  fs.mkdirSync(dir);

  expect(() => throwOrPurgeOnDirExists({
    dir,
  })).toThrow("The target directory already exists. Refusing to continue.");

  throwOrPurgeOnDirExists({
    dir,
    purgeIfExists: true,
  });

  expect(fs.existsSync(dir)).toBeFalsy();
});

it("createRepo", () => {
  const dir = tempPath('autodave::jest::createRepo');
  const {
    packageJson,
    tsConfigJson,
  } = createRepo({dir, purgeIfExists: true});

  expect(fs.readFileSync(packageJson, 'utf-8')).toMatchSnapshot();
  expect(fs.readFileSync(tsConfigJson, 'utf-8')).toMatchSnapshot();
});

const testHardhatProject = tempPath('autodave::jest::compileHardhatProject');

it("compileHardhatProject", () => {

  // Create the temporary project if it doesn't exist.
  (!fs.existsSync(testHardhatProject)) && createHardhatTestProject({
    dir: testHardhatProject,
  });

  compileHardhatProject({hardhatProjectDir: testHardhatProject});

  // Okay, next try to auto-generate a subgraph for it.
});

const graphProtocolTemplateDir = tempPath('autodave::jest::createGraphProtocolTemplate');

it("createGraphProtocolTemplate", () => {
  // Create the graph protocol template.
  (!fs.existsSync(graphProtocolTemplateDir)) && createGraphProtocolTemplate({
    dir: graphProtocolTemplateDir,
    purgeIfExists: true,
  });
});

it("createSubgraphTemplate", () => {
  const dir = tempPath('autodave::jest::createSubgraphTemplate');
  const abiPath = path.resolve(
    testHardhatProject,
    'artifacts',
    'contracts',
    'SimpleStorage.sol',
    'SimpleStorage.json'
  );

  expect(fs.existsSync(abiPath)).toBeTruthy();

  const {
    packageJson,
    subgraphYaml,
    networksJson,
    schemaGraphql,
  } = createSubgraphTemplate({
    sources: [
      {
        abiPath,
        contractAddress: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
        contractName: 'SimpleStorage',
      },
    ],
    dir,
    graphProtocolTemplateDir,
    purgeIfExists: true,
  });

  expect(fs.existsSync(dir)).toBeTruthy();

  expect(fs.readFileSync(packageJson, 'utf-8')).toMatchSnapshot();
  expect(fs.readFileSync(subgraphYaml, 'utf-8')).toMatchSnapshot();
  expect(fs.readFileSync(networksJson, 'utf-8')).toMatchSnapshot();
  expect(fs.readFileSync(schemaGraphql, 'utf-8')).toMatchSnapshot();
});
