import fs from 'fs'
import type { Export, MultiExport } from 'hardhat-deploy/types'
import type { HardhatConfig, HardhatRuntimeEnvironment } from 'hardhat/types'
import { minimatch } from 'minimatch'
import path from 'path'

export function defaultIncludeDeployed(config: HardhatConfig): boolean {
  console.log(config.paths)
  try {
    let allDeployed = getDeployedFiltered({ config } as HardhatRuntimeEnvironment)
    for (const network of Object.keys(allDeployed)) {
      for (const contract of Object.keys(allDeployed[network])) {
        // 배포된 컨트랙트 주소가 하나라도 있으면 true!
        if (allDeployed[network][contract] !== undefined) {
          return true
        }
      }
    }
  } catch (e) {
    // console.log(e)
  }
  return false
}

export function getDeployedFiltered(hre: HardhatRuntimeEnvironment) {
  const deploymentPath = hre.config.paths.deployments
  let includes = hre.config.package.includesFromDeployed || ['*']
  let excludes = hre.config.package.excludesFromDeployed || []

  const checkInclude = (name) => includes.map((x) => minimatch.filter(x)).some((f) => f(name))
  const checkExclude = (name) => excludes.map((x) => minimatch.filter(x)).some((f) => f(name))

  let res: MultiExport = loadAllDeployments(hre, deploymentPath, true)

  const output = {}
  for (const i of Object.keys(res)) {
    for (const network of res[i]) {
      if (!output[network.name]) output[network.name] = {}
      let contracts = network.contracts
      for (const [name, contract] of Object.entries(contracts)) {
        // test name
        if (checkInclude(name) && !checkExclude(name)) output[network.name][name] = contract.address
      }
    }
  }
  return output
}

export function getDeployedContractNames(hre): string[] {
  const namesMap = {}
  const deploymentPath = hre.config.paths.deployments
  let res: MultiExport = loadAllDeployments(hre, deploymentPath, true)

  for (const i of Object.keys(res)) {
    for (const network of res[i]) {
      let contracts = network.contracts
      for (const [name, contract] of Object.entries(contracts)) {
        namesMap[name] = true
      }
    }
  }
  return Object.keys(namesMap)
}

// region hardhat-deploy utils
// copyed from hardhat-deploy because not exporting this

export function loadAllDeployments(
  hre: HardhatRuntimeEnvironment,
  deploymentsPath: string,
  onlyABIAndAddress?: boolean,
  externalDeployments?: { [networkName: string]: string[] }
): MultiExport {
  const networksFound: { [networkName: string]: Export } = {}
  const all: MultiExport = {} // TODO any is chainConfig
  fs.readdirSync(deploymentsPath).forEach((fileName) => {
    const fPath = path.resolve(deploymentsPath, fileName)
    const stats = fs.statSync(fPath)
    let name = fileName
    if (stats.isDirectory()) {
      let chainIdFound: string
      const chainIdFilepath = path.join(fPath, '.chainId')
      if (fs.existsSync(chainIdFilepath)) {
        chainIdFound = fs.readFileSync(chainIdFilepath).toString().trim()
        name = fileName
      } else {
        throw new Error(
          `with hardhat-deploy >= 0.6 you need to rename network folder without appended chainId
          You also need to create a '.chainId' file in the folder with the chainId`
        )
      }

      if (!all[chainIdFound]) {
        all[chainIdFound] = []
      }
      const contracts = loadDeployments(deploymentsPath, fileName, onlyABIAndAddress)
      const network = {
        name,
        chainId: chainIdFound,
        contracts
      }
      networksFound[name] = network
      all[chainIdFound].push(network)
    }
  })

  if (externalDeployments) {
    for (const networkName of Object.keys(externalDeployments)) {
      for (const folderPath of externalDeployments[networkName]) {
        const networkConfig = hre.config.networks[networkName]
        if (networkConfig && networkConfig.chainId) {
          const networkChainId = networkConfig.chainId.toString()
          const contracts = loadDeployments(
            folderPath,
            '',
            onlyABIAndAddress,
            undefined,
            networkChainId
          )
          const networkExist = networksFound[networkName]
          if (networkExist) {
            if (networkChainId !== networkExist.chainId) {
              throw new Error(
                `mismatch between external deployment network ${networkName} chainId: ${networkChainId} vs existing chainId: ${networkExist.chainId}`
              )
            }
            networkExist.contracts = { ...contracts, ...networkExist.contracts }
          } else {
            const network = {
              name: networkName,
              chainId: networkChainId,
              contracts
            }
            networksFound[networkName] = network
            all[networkChainId].push(network)
          }
        } else {
          console.warn(
            `export-all limitation: attempting to load external deployments from ${folderPath} without chainId info. Please set the chainId in the network config for ${networkName}`
          )
        }
      }
    }
  }
  return all
}

function loadDeployments(
  deploymentsPath: string,
  subPath: string,
  onlyABIAndAddress?: boolean,
  expectedChainId?: string,
  truffleChainId?: string
) {
  const deploymentsFound: { [name: string]: any } = {}
  const deployPath = path.join(deploymentsPath, subPath)

  let filesStats
  try {
    filesStats = traverse(
      deployPath,
      undefined,
      undefined,
      (name) => !name.startsWith('.') && name !== 'solcInputs'
    )
  } catch (e) {
    // console.log('no folder at ' + deployPath);
    return {}
  }
  if (filesStats.length > 0) {
    if (expectedChainId) {
      const chainIdFilepath = path.join(deployPath, '.chainId')
      if (fs.existsSync(chainIdFilepath)) {
        const chainIdFound = fs.readFileSync(chainIdFilepath).toString().trim()
        if (expectedChainId !== chainIdFound) {
          throw new Error(
            `Loading deployment in folder '${deployPath}' (with chainId: ${chainIdFound}) for a different chainId (${expectedChainId})`
          )
        }
      } else {
        throw new Error(
          `with hardhat-deploy >= 0.6 you are expected to create a '.chainId' file in the deployment folder`
        )
      }
    }
  }
  let fileNames = filesStats.map((a) => a.relativePath)
  fileNames = fileNames.sort((a, b) => {
    if (a < b) {
      return -1
    }
    if (a > b) {
      return 1
    }
    return 0
  })

  for (const fileName of fileNames) {
    if (fileName.substr(fileName.length - 5) === '.json') {
      const deploymentFileName = path.join(deployPath, fileName)
      let deployment = JSON.parse(fs.readFileSync(deploymentFileName).toString())
      if (!deployment.address && deployment.networks) {
        if (truffleChainId && deployment.networks[truffleChainId]) {
          // TRUFFLE support
          const truffleDeployment = deployment as any // TruffleDeployment;
          deployment.address = truffleDeployment.networks[truffleChainId].address
          deployment.transactionHash = truffleDeployment.networks[truffleChainId].transactionHash
        }
      }
      if (onlyABIAndAddress) {
        deployment = {
          address: deployment.address,
          abi: deployment.abi,
          linkedData: deployment.linkedData
        }
      }
      const name = fileName.slice(0, fileName.length - 5)
      // console.log('fetching ' + deploymentFileName + '  for ' + name);

      deploymentsFound[name] = deployment
    }
  }
  return deploymentsFound
}

const traverse = function (
  dir: string,
  result: any[] = [],
  topDir?: string,
  filter?: (name: string, stats: any) => boolean // TODO any is Stats
): Array<{
  name: string
  path: string
  relativePath: string
  mtimeMs: number
  directory: boolean
}> {
  fs.readdirSync(dir).forEach((name) => {
    const fPath = path.resolve(dir, name)
    const stats = fs.statSync(fPath)
    if ((!filter && !name.startsWith('.')) || (filter && filter(name, stats))) {
      const fileStats = {
        name,
        path: fPath,
        relativePath: path.relative(topDir || dir, fPath),
        mtimeMs: stats.mtimeMs,
        directory: stats.isDirectory()
      }
      if (fileStats.directory) {
        result.push(fileStats)
        return traverse(fPath, result, topDir || dir, filter)
      }
      result.push(fileStats)
    }
  })
  return result
}

// endregion
