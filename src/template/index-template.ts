export function getIndexSource(targetInfo) {
  return `
import type { Signer } from '${targetInfo.signerPackage}'
import type { Provider } from '@ethersproject/providers'
import type { ${targetInfo.contractClass} } from '${targetInfo.contractPackage}'
export * from './typechain'
import * as factoryModule from './typechain'
import * as deployed from './deployed.json'
export { deployed }

export function getDeployedAddress(contractName: string, chainName: string): string {
  return deployed[chainName][contractName]
}

export function getContract(contractName: string, chainName: string, signerOrProvider?: Provider | Signer): BaseContract | undefined {
  const address = getDeployedAddress(contractName, chainName)

  try {
    const factoryName = \`$\{contractName\}__factory\`
    const factory = factoryModule[factoryName]
    // console.log('factory:', factory)
    return factory.connect(address, signerOrProvider)
  } catch (err) {
    console.warn('error:', err)
    return undefined
  }
}

interface Contracts {
  [prop: string]: BaseContract
}

export function getAllContracts(chainName: string): Contracts {
  const contracts = deployed[chainName]
  let output = {}
  for (let name of Object.keys(contracts)) {
    output[name] = getContract(name, chainName)
  }
  return output
}

export function getContractNames(chainName: string): Array<string> {
  const contracts = deployed[chainName]
  return Object.keys(contracts)
}

export function getChainNames(): Array<string> {
  return Object.keys(deployed)
}
`
}
