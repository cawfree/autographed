import * as child_process from "child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";
import {ethers} from "ethers";
import {parse, stringify} from "yaml";

import {Environment, Source} from "../@types";

export const tempPath = (name: string) => path.resolve(
  os.tmpdir(),
  name,
);

export const randomTempPath = () =>
  tempPath(ethers.utils.keccak256(ethers.utils.randomBytes(256)));

export const keccak = (str: string) =>
  ethers.utils.keccak256(ethers.utils.toUtf8Bytes(str));

export const throwOrPurgeOnDirExists = ({
  dir,
  purgeIfExists = false,
}: {
  readonly dir: string;
  readonly purgeIfExists?: boolean;
}) => {
  if (fs.existsSync(dir)) {

    if (!purgeIfExists)
      throw new Error('The target directory already exists. Refusing to continue.');

    fs.rmSync(dir, {recursive: true});
  }
};

export const createRepo = ({
  dir,
  purgeIfExists,
}: {
  readonly dir: string;
  readonly purgeIfExists?: boolean;
}) => {
  throwOrPurgeOnDirExists({dir, purgeIfExists});
  fs.mkdirSync(dir);

  const packageJson = path.resolve(dir, 'package.json');
  const tsConfigJson = path.resolve(dir, 'tsconfig.json');

  fs.writeFileSync(packageJson, JSON.stringify({}));
  fs.writeFileSync(
    tsConfigJson,
    JSON.stringify({
      compilerOptions: {
        target: 'es2020',
        module: 'commonjs',
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        strict: true,
        skipLibCheck: true,
        outDir: 'dist',
      },
    }),
  );

  child_process.execSync(
    'npm i --save-dev ts-node typescript',
    {stdio: 'inherit', cwd: dir},
  );

  return {packageJson, tsConfigJson};
};

export const createGraphProtocolTemplate = async ({
  dir,
  purgeIfExists,
}: {
  readonly dir: string;
  readonly purgeIfExists?: boolean;
}) => {
  throwOrPurgeOnDirExists({dir, purgeIfExists});
  fs.mkdirSync(dir);

  const packageJson = path.resolve(dir, 'package.json');

  fs.writeFileSync(packageJson, JSON.stringify({}));

  child_process.execSync(
    'npm i --save @graphprotocol/graph-cli@0.29.1',
    {stdio: 'inherit', cwd: dir}
  );
};

const subgraphCodegen = ({dir: cwd}: {
  readonly dir: string;
}) => child_process.execSync(
  'npm run-script codegen',
  {stdio: 'inherit', cwd},
);

export const createSubgraphTemplate = ({
  sources,
  dir,
  graphProtocolTemplateDir,
  purgeIfExists,
}: {
  readonly sources: readonly Source[];
  readonly dir: string;
  readonly graphProtocolTemplateDir: string;
  readonly purgeIfExists?: boolean;
}) => {

  if (!fs.existsSync(graphProtocolTemplateDir))
    throw new Error(`Unable to find graphProtocolTemplate at "${
      graphProtocolTemplateDir
    }". `);

  throwOrPurgeOnDirExists({dir, purgeIfExists});

  const exampleSubgraphDir = path.resolve(
    graphProtocolTemplateDir,
    'node_modules',
    '@graphprotocol',
    'graph-cli',
    'examples',
    'example-subgraph',
  );

  if (!fs.existsSync(exampleSubgraphDir))
    throw new Error(`Unable to find exampleSubgraphDir at "${exampleSubgraphDir}".`);

  fs.copySync(exampleSubgraphDir, dir, {recursive: true});

  const schemaGraphql = path.resolve(dir, 'schema.graphql');
  const networksJson = path.resolve(dir, 'networks.json');
  const packageJson = path.resolve(dir, 'package.json');
  const subgraphYaml = path.resolve(dir, 'subgraph.yaml');

  const originalSchema = fs.readFileSync(schemaGraphql, 'utf-8');

  // Rewrite commands.
  fs.writeFileSync(
    packageJson,
    JSON.stringify(
      {
        ...JSON.parse(fs.readFileSync(packageJson, 'utf-8')),
        scripts: {
          codegen: 'graph codegen --output-dir src/types/ subgraph.yaml',
        },
      },
      undefined,
      2,
    ),
  );

  fs.writeFileSync(
    networksJson,
    JSON.stringify({}),
  );

  sources.forEach(({contractAddress, contractName, abiPath}: Source) => child_process.execSync(
    `graph add ${contractAddress} --abi ${abiPath} --contract-name "${contractName}"`,
    {stdio: 'inherit', cwd: dir},
  ));

  fs.removeSync(path.resolve(dir, 'src', 'my-contract-name.ts'));
  fs.removeSync(path.resolve(dir, 'tests', 'my-contract-name-utils.ts'));
  fs.removeSync(path.resolve(dir, 'tests', 'my-contract-name.test.ts'));

  // Remove the template data sources.
  const {
    dataSources,
    ...extras
  } = parse(fs.readFileSync(subgraphYaml, 'utf-8'));

  fs.writeFileSync(
    subgraphYaml,
    stringify({
      ...extras,
      dataSources: Array.from(dataSources)
        .filter((_, i) => i > 0),
    }),
  );

  fs.writeFileSync(
    schemaGraphql,
    fs.readFileSync(schemaGraphql, 'utf-8').substring(originalSchema.length),
  );

  fs.rmSync(path.resolve(dir, 'src', 'types'), {recursive: true});
  fs.rmSync(path.resolve(dir, 'src', 'mapping.ts'), {recursive: true});

  subgraphCodegen({dir});

  fs.moveSync(path.resolve(dir, 'src', 'types'), path.resolve(dir, 'generated'));

  child_process.execSync(
    'npm i',
    {stdio: 'inherit', cwd: dir},
  );

  return {
    packageJson,
    subgraphYaml,
    networksJson,
    schemaGraphql,
  };
};

export const buildSubgraph = ({subgraphDir: dir}: {
  readonly subgraphDir: string;
}) => {
  subgraphCodegen({dir});
  child_process.execSync(
    'graph build',
    {stdio: 'inherit', cwd: dir},
 );
};

//export const launchEnvironment = ({
//
//}: Environment) => {
//
//};
//