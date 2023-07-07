// We load the plugin here.
import '@nomicfoundation/hardhat-ethers'
import { HardhatUserConfig } from 'hardhat/types'

import '@typechain/hardhat'
import 'hardhat-deploy'

import '../../../src/index'

const config: HardhatUserConfig = {
  solidity: '0.8.17',
  defaultNetwork: 'hardhat',
  networks: {
    localhost: {
      live: false,
      saveDeployments: true
    }
  },
  typechain: {
    outDir: 'typechain'
  },
  namedAccounts: {
    deployer: {
      default: 0
    }
  },
  package: {
    packageJson: 'package.json'
  }
}

export default config
