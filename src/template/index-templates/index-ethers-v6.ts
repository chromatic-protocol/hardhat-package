import Handlebars from 'handlebars'

export function getIndexSource(targetInfo) {
  const template = Handlebars.compile(INDEX_SOURCE)
  return template(targetInfo)
}

const INDEX_SOURCE = `
import type { Provider, Signer, {{contractClass}} } from 'ethers'
export * from './typechain'
export type * from './typechain'

import * as factoryModule from './typechain'
import { deployedAddress } from './deployedAddress'
export { deployedAddress }

interface ContractFactoryConnect {
  connect(address: string, signerOrProvider: Signer | Provider): {{contractClass}} 
}

/**
 * Returns the deployed address of given contractName and chainName if exist
 * @returns address of deployed contract or undefined
 * 
 * @param contractName deployed contract name
 * @param chainName deployed network name
 */
export function getDeployedAddress(contractName: string, chainName: string): string {
  return deployedAddress[chainName][contractName]
}

/**
 * Returns an instance of contract interface of deployed
 *  
 * @param contractName deployed contract name
 * @param chainName deployed network name
 * @param [signerOrProvider] provider or signer.
 */
export function getDeployedContract(contractName: string, chainName: string, signerOrProvider?: Provider | Signer): BaseContract | undefined {
  const address = getDeployedAddress(contractName, chainName)
  const factoryName = \`$\{contractName\}__factory\`
  let factory: ContractFactoryConnect | undefined = undefined;
  try {
    {{#if anyExportedFromDeployments}}
    
    factory = factoryModule?.factories?.deployed?.[chainName]?.[factoryName]

    if (!factory) {
      factory = factoryModule?.[chainName]?.[factoryName]
    }
    if (!factory) {
      factory = factoryModule?.[factoryName]
    }
    
    {{else}}

    factory = factoryModule?.[factoryName]
    
    {{/if}}
    if (factory) {
      return factory.connect(address, signerOrProvider as any);
    } else {
      return undefined;
    }
  } catch (err) {
    console.warn('error:', err)
    return undefined
  }
}

interface Contracts {
  [contractName: string]: BaseContract | undefined
}

/**
 * Returns a map of contractName to deployed contract instance
 * 
 * @param chainName deployed network name
 */
export function getAllDeployedContracts(chainName: string): Contracts {
  const contracts = deployedAddress[chainName]
  let output: Contracts = {}
  for (let name of Object.keys(contracts)) {
    output[name] = getDeployedContract(name, chainName)
  }
  return output
}

/** Returns deployed contractNames in chainName  
 * 
 * @param chainName deployed network name
 */
export function getDeployedContractNames(chainName: string): Array<string> {
  const contracts = deployedAddress[chainName]
  return Object.keys(contracts)
}

/** Returns chainNames in deployed addresses  
 * 
 * @param chainName deployed network name
 */
export function getChainNames(): Array<string> {
  return Object.keys(deployedAddress)
}
`
