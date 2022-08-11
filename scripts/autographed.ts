#!/usr/bin/env node
import 'dotenv/config';

import path from 'path';
import fs from 'fs-extra';

import {
  DEFAULT_SETTINGS,
  Environment,
  deploy,
  toDeployParams,
  tempPath,
  keccak,
  createSubgraphTemplate,
  createGraphProtocolTemplate,
  ensureGraphNodeInstallation,
  Config,
} from '../src';

import {version} from '../package.json';

const seed = keccak(version);

void (async () => {

  const hardhatProjectDir = path.resolve('.');
  const configJson = path.resolve(hardhatProjectDir, '.autograph.json');

  const {
    name: subgraphName,
    sources,
  } = Config.parse(JSON.parse(fs.readFileSync(configJson, 'utf-8')));

  const deployParams = toDeployParams(Environment.parse({
    ...DEFAULT_SETTINGS,
    ...process.env,
  }));

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
    ...deployParams,
    hardhatProjectDir,
    subgraphName,
    graphNodeInstallationDir,
    subgraphTemplateDir,
  });
})();
