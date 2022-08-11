import axios, {AxiosError} from "axios";
import * as child_process from "child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";
import {ethers} from "ethers";
import {parse, stringify} from "yaml";
import {nanoid} from "nanoid";

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

export const createGraphProtocolTemplate = ({
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
  hardhatProjectDir,
  ethereumNetwork,
}: {
  readonly sources: readonly Source[];
  readonly dir: string;
  readonly graphProtocolTemplateDir: string;
  readonly purgeIfExists?: boolean;
  readonly hardhatProjectDir: string;
  readonly ethereumNetwork: string;
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

  child_process.execSync(
    'npm i',
    {stdio: 'inherit', cwd: exampleSubgraphDir},
  );

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

  sources.forEach(({contractAddress, contractName}: Source) => child_process.execSync(
    `graph add ${contractAddress} --abi ${
      path.resolve(hardhatProjectDir, 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`)
    } --contract-name "${contractName}"`,
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
        .map((e: any) => ({...e, network: ethereumNetwork}))
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

export const ensureGraphNodeInstallation = ({
  graphNodeInstallationDir: dir,
  purgeIfExists,
}: {
  readonly graphNodeInstallationDir: string;
  readonly purgeIfExists?: boolean;
}) => {
  throwOrPurgeOnDirExists({dir, purgeIfExists});
  fs.mkdirSync(dir);

  child_process.execSync(
    'git clone https://github.com/graphprotocol/graph-node graph-node',
    {stdio: 'inherit', cwd: dir},
  );

  const graphNodeDir = path.resolve(dir, 'graph-node');

  child_process.execSync(
    'cargo build',
    {stdio: 'inherit', cwd: graphNodeDir},
  );

  return {graphNodeDir};
};

const waitFor = async ({
  completeOnError,
  url,
}: {
  readonly completeOnError?: (e: AxiosError) => boolean;
  readonly url: string;
}) => {
  while (true) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await axios.get(url);
      break;
    } catch (e) {
      if (completeOnError?.(e as AxiosError)) break;
    }
  }
}

export const waitForEthereum = ({ethereumPort}: {
  readonly ethereumPort: number;
}) => waitFor({
  url: `http://localhost:${ethereumPort}`,
});

export const waitForIpfs = ({ipfsPort}: {
  readonly ipfsPort: number;
}) => waitFor({
  url: `http://localhost:${ipfsPort}`,
  completeOnError: (e) => e?.response?.status === 404,
});

export const waitForGraph = ({graphNodeGraphQLPort}: {
  readonly graphNodeGraphQLPort: number;
}) => waitFor({url: `http://localhost:${
  graphNodeGraphQLPort
}`});

export const ipfs = () =>
  new Promise(
    () => child_process.exec('ipfs daemon'),
  ) /* forever */;

const postgres = ({
  postgresDb,
  postgresPassword,
  postgresPort,
  postgresUser,
  dockerContainerName = nanoid(),
}: {
  readonly postgresPort: number;
  readonly postgresDb: string;
  readonly postgresUser: string;
  readonly postgresPassword: string;
  readonly dockerContainerName?: string;
}) => new Promise(
  () => child_process.exec(
     `
docker run --name ${dockerContainerName} \
-p "${postgresPort}:${postgresPort}" \
-e "POSTGRES_DB=${postgresDb}" \
-e "POSTGRES_USER=${postgresUser}" \
-e "POSTGRES_PASSWORD=${postgresPassword}" \
postgres:14-alpine
    `.trim(),
  ),
) /* forever */;

export const graphNode = async ({
  graphNodeInstallationDir,
  postgresPassword,
  postgresPort,
  postgresUser,
  postgresDb,
  ipfsPort,
  ethereumNetwork,
  ethereumPort,
}: Parameters<typeof postgres>[0] & {
  readonly ipfsPort: number;
  readonly graphNodeInstallationDir: string;
  readonly ethereumNetwork: string;
  readonly ethereumPort: number;
}) => {
  // TODO: Ideally, we need to be able to wait for postgres too. Ipfs just happens to take
  //       a lot longer to initialize.
  await waitForIpfs({
    ipfsPort,
  });

  const graphNodeDir = path.resolve(graphNodeInstallationDir, 'graph-node');

  return new Promise(
    () => child_process.exec(
      `
        cargo run -p graph-node --release -- \
        --ipfs 127.0.0.1:${ipfsPort} \
        --ethereum-rpc ${ethereumNetwork}:http://127.0.0.1:${ethereumPort} \
        --postgres-url "postgresql://${
          postgresUser
        }:${
          postgresPassword
        }@localhost:${
          postgresPort
        }/${
          postgresDb
        }" \
        --debug
      `.trim(),
    {cwd: graphNodeDir},
    ),
  ) /* forever */;
};

export const subgraph = async ({
  subgraphName,
  graphNodeGraphQLPort,
  graphNodeStatusPort,
  ipfsPort,
  versionLabel = '0-0.1',
  subgraphTemplateDir: cwd,
}: {
  readonly graphNodeGraphQLPort: number;
  readonly graphNodeStatusPort: number;
  readonly ipfsPort: number;
  readonly versionLabel?: string;
  readonly subgraphTemplateDir: string;
  readonly subgraphName: string;
}) => {
  await waitForGraph({
    graphNodeGraphQLPort,
  });
  return child_process.execSync(
    `graph create --node http://localhost:${
      graphNodeStatusPort
    } ${
      subgraphName
    } && graph deploy --node http://localhost:${
      graphNodeStatusPort
    } --ipfs http://localhost:${
      ipfsPort
    } ${
      subgraphName
    } --version-label ${
      versionLabel
    }`,
    {cwd, stdio: 'inherit'},
  );
};

export const hardhatLocalNode = async ({hardhatProjectDir}: {
  readonly hardhatProjectDir: string;
}) => child_process.exec(
  './node_modules/.bin/hardhat node',
  {cwd: hardhatProjectDir},
);

export const toDeployParams = ({
  POSTGRES_PORT: postgresPort,
  POSTGRES_DB: postgresDb,
  POSTGRES_USER: postgresUser,
  POSTGRES_PASSWORD: postgresPassword,
  IPFS_PORT: ipfsPort,
  ETHEREUM_PORT: ethereumPort,
  ETHEREUM_NETWORK: ethereumNetwork,
  GRAPH_NODE_GRAPHQL_PORT: graphNodeGraphQLPort,
  GRAPH_NODE_STATUS_PORT: graphNodeStatusPort,
}: Environment): Omit<Parameters<typeof deploy>[0],
  'graphNodeInstallationDir' | 'subgraphName' | 'subgraphTemplateDir' | 'hardhatProjectDir'
> => ({
  ethereumPort,
  postgresDb,
  postgresUser,
  postgresPort,
  postgresPassword,
  ipfsPort,
  graphNodeGraphQLPort,
  graphNodeStatusPort,
  ethereumNetwork,
});

export const deploy = async ({
  ethereumPort,
  postgresPassword,
  postgresDb,
  postgresPort,
  postgresUser,
  graphNodeInstallationDir,
  ipfsPort,
  ethereumNetwork,
  subgraphTemplateDir,
  graphNodeStatusPort,
  graphNodeGraphQLPort,
  subgraphName,
  versionLabel,
  hardhatProjectDir,
}:
  & Parameters<typeof graphNode>[0]
  & Parameters<typeof subgraph>[0]
  & Parameters<typeof hardhatLocalNode>[0]
) => {
  return Promise.all([
    hardhatLocalNode({hardhatProjectDir}),
    /* subgraph  */
    waitForEthereum({ethereumPort}).then(() => Promise.all([
      ipfs(),
      postgres({
        postgresDb,
        postgresPort,
        postgresUser,
        postgresPassword,
      }),
      graphNode({
        graphNodeInstallationDir,
        postgresPassword,
        postgresPort,
        postgresUser,
        postgresDb,
        ipfsPort,
        ethereumNetwork,
        ethereumPort,
      }),
      subgraph({
        subgraphTemplateDir,
        graphNodeStatusPort,
        graphNodeGraphQLPort,
        ipfsPort,
        subgraphName,
        versionLabel,
      }),
    ])),
  ]) /* forever */;
};
