# :package: @chromatic-protocol/hardhat-package

You can easily pack and publish a hardhat project to interact deployed contracts.

## What
a nice cocktail :cocktail: of `hardhat + typechain + hardhat-deploy + hardhat-ethers` :smile:
- compile contracts with `@typechain/ethers-v6`
- deploy with `hardhat-deploy`
- pack by this `@chromatic-protocol/hardhat-package`
- finally publish your interfaces as a package.
- and use this in any other related projects for example a web front-end project etc 

## Installation

```bash
npm install @chromatic-protocol/hardhat-package
```

Import the plugin in your `hardhat.config.js`:

```js
require("@chromatic-protocol/hardhat-package")
```

Or if you are using TypeScript, in your `hardhat.config.ts`:

```ts
import "@chromatic-protocol/hardhat-package"
```

## Required plugins

- `@nomicfoundation/hardhat-ethers` 
- `@typechain/hardhat`
- `@typechain/ethers-v6` : supporting typechain targets 
- `hardhat-deploy`

## Tasks

This plugin adds the `package` task to Hardhat:
```
npx hardhat package
```

## Configuration

This plugin extends the `HardhatUserConfig`'s `TypechainPackageConfig` object with an optional `package` field.

This is an example of how to set it:

```ts
config = {
  ...
  package: {
    outDir: 'dist',  // customize default output dir `dist` to other if you want.
    packageJson: 'package.json'  // specify package.json file to get partial meta information of your package 
  }
}
```

## Usage

### configure your hardhat.config
```ts
import { HardhatUserConfig } from 'hardhat/types'
import '@nomicfoundation/hardhat-ethers'

import '@typechain/hardhat'
import 'hardhat-deploy'

import '@chromatic-protocol/hardhat-package'

const config: HardhatUserConfig = {
  solidity: '0.8.17',
  defaultNetwork: 'hardhat',
  networks: {
    someNetwork: {
      // ... omittec
      saveDeployments: true
    }
  },
  // example configuration of typechain
  typechain: {
    outDir: 'typechain-types'
  },
  // example configuration of hardhat-deploy
  namedAccounts: {
    deployer: {
      default: 0
    }
  },
  // example configuration of @chromatic-finance/hardhat-package
  package: {
    outDir: 'dist'  // default without config.
    packageJson: 'package.sdk.json'  // default without config.
  }
}

export default config

```

## setup scripts for deploying

This shows a sample script. see [`hardhat-deploy`](https://github.com/wighawag/hardhat-deploy) for details

```ts
import type { DeployFunction } from 'hardhat-deploy/types'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy('Greeter', {
    from: deployer,
    args: ['hi from Greeter contract!'],
    log: true
  })
}

export default func

func.id = 'deploy_greeter' // id required to prevent reexecution
func.tags = ['test', 'local']

```
## compile & deploy

```bash
hardhat compile
hardhat deploy --network someNetwork
```

## run the package task

this plugin prepares to publish. see outputs in `outDir`
```bash
hardhat package
```

## publish your project

```bash
cd dist
# or npm link
npm publish  
```

## use the published package

### install
```bash
npm install my-hardhat-project
```

### usage

```ts
import { getContract, getAllContracts, getContractNames } from 'my-hardhat-project'

let contract = getContract('Greeter', 'someNetwork')
contract.connect(signerOrProvider)
const res = await contract.greet()

const contracts = getAllContract('someNetwork')
contract = contracts['Greeter']
contract.connect(signerOrProvider)
const res = await contract.greet()

const contractNames = getContractNames('someNetwork')
const chainNames = getChainNames()

```

## hardhat packaging options


[src/types.ts](src/types.ts)
