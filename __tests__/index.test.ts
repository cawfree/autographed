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
  throwOrPurgeOnDirExists,
  createSubgraphTemplate,
  buildSubgraph,
  ensureGraphNodeInstallation,
  deploy,
  toDeployParams,
  DEFAULT_SETTINGS,
} from '../src';

jest.setTimeout(60 * 60 * 1000);

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

  expect(Environment.parse(DEFAULT_SETTINGS)).toBeTruthy();

  expect(() => Environment.parse({...DEFAULT_SETTINGS, POSTGRES_PORT: 5432})).toThrow();
  expect(() => Environment.parse({...DEFAULT_SETTINGS, POSTGRES_PORT: 'not a number'})).toThrow();
  expect(() => Environment.parse({...DEFAULT_SETTINGS, POSTGRES_DB: ''})).toThrow();
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
const cacheEnabled = true;

it("compileHardhatProject", () => {
  if (fs.existsSync(testHardhatProject) && cacheEnabled) return;

  createHardhatTestProject({
    dir: testHardhatProject,
  });

  compileHardhatProject({hardhatProjectDir: testHardhatProject});
});

const graphProtocolTemplateDir = tempPath('autodave::jest::createGraphProtocolTemplate');

it("createGraphProtocolTemplate", () => {
  if (fs.existsSync(graphProtocolTemplateDir) && cacheEnabled) return;

  createGraphProtocolTemplate({
    dir: graphProtocolTemplateDir,
    purgeIfExists: true,
  });
});

const subgraphTemplate = tempPath('autodave::jest::createSubgraphTemplate');

it("createSubgraphTemplate", () => {
  const {
    packageJson,
    subgraphYaml,
    networksJson,
    schemaGraphql,
  } = createSubgraphTemplate({
    sources: [
      {
        contractAddress: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
        contractName: 'SimpleStorage',
      },
    ],
    dir: subgraphTemplate,
    graphProtocolTemplateDir,
    hardhatProjectDir: testHardhatProject,
    purgeIfExists: true,
  });

  expect(fs.existsSync(subgraphTemplate)).toBeTruthy();

  expect(fs.readFileSync(packageJson, 'utf-8')).toMatchSnapshot();
  expect(fs.readFileSync(subgraphYaml, 'utf-8')).toMatchSnapshot();
  expect(fs.readFileSync(networksJson, 'utf-8')).toMatchSnapshot();
  expect(fs.readFileSync(schemaGraphql, 'utf-8')).toMatchSnapshot();
});

it("buildSubgraph", () => {
  expect(fs.existsSync(subgraphTemplate)).toBeTruthy();
  buildSubgraph({
    subgraphDir: subgraphTemplate,
  });
})

// https://github.com/rust-lang/cargo/issues/1083
const graphNodeInstallationDir = tempPath('autodave__jest__ensureGraphNodeInstallation');

it("ensureGraphNodeInstallation", () => {
  if (fs.existsSync(graphNodeInstallationDir) && cacheEnabled) return;

  const {graphNodeDir} = ensureGraphNodeInstallation({
    graphNodeInstallationDir,
    purgeIfExists: true,
  });

  expect(fs.existsSync(graphNodeDir)).toBeTruthy();
});

it("deployment", async () => {
  await deploy({
    ...toDeployParams(Environment.parse(DEFAULT_SETTINGS)),
    hardhatProjectDir: testHardhatProject,
    subgraphName: 'SimpleStorage',
    graphNodeInstallationDir,
    subgraphTemplateDir: subgraphTemplate,
  });
});
