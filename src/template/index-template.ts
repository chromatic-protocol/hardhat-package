export function getIndexSource(targetInfo) {
  return `
import type { Signer } from '${targetInfo.signerPackage}'
import type { Provider } from '@ethersproject/providers'
import type { ${targetInfo.contractClass}, ${targetInfo.factoryClass} } from '${targetInfo.contractPackage}'
export * from './typechain'
import * as factoryModule from './typechain'
import { deployed } from './deployed'
export { deployed }

interface ContractFactoryConnect {
  connect(address: string, signerOrProvider: Signer | Provider): ${targetInfo.contractClass} 
}

export function getDeployedAddress(contractName: string, chainName: string): string {
  return deployed[chainName][contractName]
}

export function getDeployedContract(contractName: string, chainName: string, signerOrProvider?: Provider | Signer): BaseContract | undefined {
  const address = getDeployedAddress(contractName, chainName)
  const factoryName = \`$\{contractName\}__factory\`
  let factory: ContractFactoryConnect;
  try {
    if (chainName in factoryModule) {
      factory = factoryModule[chainName][factoryName];
    }
    if(!factory) {
      factory = factoryModule[factoryName];
    }
    if (factory) {
      return factory.connect(address, signerOrProvider);
    } else {
      return undefined;
    }
  } catch (err) {
    console.warn('error:', err)
    return undefined
  }
}

interface Contracts {
  [prop: string]: BaseContract
}

export function getAllDeployedContracts(chainName: string): Contracts {
  const contracts = deployed[chainName]
  let output: Contracts = {}
  for (let name of Object.keys(contracts)) {
    output[name] = getDeployedContract(name, chainName)
  }
  return output
}

export function getDeployedContractNames(chainName: string): Array<string> {
  const contracts = deployed[chainName]
  return Object.keys(contracts)
}

export function getChainNames(): Array<string> {
  return Object.keys(deployed)
}
`
}
