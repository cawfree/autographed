#!/usr/bin/env node
import 'dotenv/config';

import fs from 'fs-extra';
import path from "path";

import {compileHardhatProject} from "hardhat-copy";

import {
  Environment,
  deploy,
  toDeployParams,
  tempPath,
  keccak,
  createSubgraphTemplate,
  Source,
  createGraphProtocolTemplate,
  ensureGraphNodeInstallation,
} from '../src';

import {version} from '../package.json';

const seed = keccak(version);

void (async () => {

  // TODO: define this using params

  const subgraphName = 'MyFancySubgraph';
  const hardhatProjectDir = '/Users/cawfree/Development/tmp';

  compileHardhatProject({hardhatProjectDir});

  const sources: readonly Source[] = [
    {
      contractName: 'Lock',
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    },
    {
      contractName: 'Lock2',
      contractAddress: '0xa16E02E87b7454126E5E10d957A927A7F5B5d2be',
    },
  ];

  const graphNodeInstallationDir = tempPath(`graphNodeInstallationDir__${seed}`);
  const graphProtocolTemplateDir = tempPath(`graphProtocolTemplateDir__${seed}`);

  if (
       !fs.existsSync(graphProtocolTemplateDir)
    || !fs.existsSync(graphNodeInstallationDir)
  ) {
    console.log('Performing first time setup...');

    createGraphProtocolTemplate({
      dir: graphProtocolTemplateDir,
      purgeIfExists: true,
    });
    ensureGraphNodeInstallation({
      graphNodeInstallationDir,
      purgeIfExists: true,
    })
  }

  // Source code changes all of the time. We're free to rebuild this.
  const subgraphTemplateDir = tempPath(`subgraphTemplateDir__${seed}`);

  // Rebuild every time (source code can change).
  createSubgraphTemplate({
    sources,
    dir: subgraphTemplateDir,
    graphProtocolTemplateDir,
    hardhatProjectDir,
    purgeIfExists: true,
  });

  await deploy({
    ...toDeployParams(Environment.parse(process.env)),
    hardhatProjectDir,
    subgraphName,
    graphNodeInstallationDir,
    subgraphTemplateDir,
  });
})();
