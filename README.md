# [`npx autographed`](https://github.com/cawfree/autographed)
The self-building, hot-reloading subgraph. The quickest way to start indexing your shit.

### Initial Setup

Okay, so there's _a lot_ that goes into [__running a subgraph__](https://thegraph.com/docs/en/deploying/deploying-a-subgraph-to-hosted/). The purpose of this library is to take care of most of that, and just get you to indexing your smart contract as quickly as possible.

> __Notice:__ `autographed` dynamically generates all the mappings and runtime architecture you need to quickly query for historical blockchain data emitted during smart contract [`event`](https://solidity-by-example.org/events/)s. It is not suitable for writing custom indexing logic.

If this sounds like  a good fit for you, you will need to make sure you have some of the following system dependencies available on your runtime.

First, please make sure you've installed and configured the [__Rust Toolchain__](https://www.rust-lang.org/):

```shell
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

On top of that, you'll need to be able to run [__Docker Containers__](https://www.docker.com/). The easiest way to do this is to download and install [__Docker Desktop__](https://www.docker.com/products/docker-desktop/).

With these steps out of the way, you'll finally need these final low-level dependencies:

```shell
ipfs jq gsed libpq cmake
```

### Getting Started

Inside of your [__hardhat project root__](https://hardhat.org/hardhat-runner/docs/getting-started#overview), create a `.autograph.json`:

```json
{
  // Name of the Subgraph.
  "name": "MySubgraphName",
  "sources": [
    {
      // Smart Contract Name.
      "contractName": "MyContractName",
      // Address the Smart Contract is deployed to on your local.
      "contractAddress": "0x0000000000000000000000000000000000000000"
    }
  ]
}
```

By default, `autographed` will use the following settings by default:

```shell
GRAPH_NODE_GRAPHQL_PORT=8000
GRAPH_NODE_STATUS_PORT=8020
IPFS_PORT=5001
POSTGRES_PORT=5432
ETHEREUM_PORT=8545
ETHEREUM_NETWORK=hardhat
POSTGRES_DB=dev
POSTGRES_USER=dev
POSTGRES_PASSWORD=dev
```

These can be overridden if passed as [__environment variables__](https://stackoverflow.com/a/34154491).

> There's a ton of binary files that will need to be compiled on your first run. In the mean time, why don't you put on a cup of coffee or do some yoga or something? ☕️

### Building
If you'd like to build this repo yourself, just `git clone` and run `yarn` from the top-level directory. You can also use `yarn test` to make sure everything's working okay or if you need to debug any issues you ~~might~~ will encounter.

### License
[__MIT__](./LICENSE)

