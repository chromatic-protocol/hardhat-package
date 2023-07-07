import type { HardhatConfig } from 'hardhat/types'
import pkgDefaultAddress from './package-template/package.dist.address.json'
import pkgDefaultEthersV5 from './package-template/package.dist.ethers-v5.json'
import pkgDefaultEthersV6 from './package-template/package.dist.ethers-v6.json'

export function getPkgDefault(config: HardhatConfig) {
  if (config.package.outputTarget === 'address') {
    return pkgDefaultAddress
  } else if (config.package.outputTarget === 'typechain') {
    if (config.package.typechainTarget === 'ethers-v5') {
      return pkgDefaultEthersV5
    } else if (config.package.typechainTarget === 'ethers-v6') {
      return pkgDefaultEthersV6
    }
  }
}
