export function getDeployedSource(deployedJson) {
  return `
interface DeployedAddress {
  [chainName: string]: {
    [contractName: string]: string
    }    
}

export const deployedAddress: DeployedAddress = ${JSON.stringify(deployedJson, null, 2)} 
`
}
