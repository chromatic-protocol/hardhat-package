import { execSync as exec } from 'child_process'
import { extendConfig, subtask, task, types } from 'hardhat/config'
import { HardhatPluginError } from 'hardhat/plugins'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'
import { HardhatConfig, HardhatUserConfig, TaskArguments } from 'hardhat/types'
import { defaultIncludeDeployed, getDeployedContractNames, getDeployedFiltered } from './utils'
export { getDeployedFiltered }

import pkgDefault from './config/package.dist.json'
import tsCjs from './config/tsconfig.cjs.json'
import tsEsm from './config/tsconfig.esm.json'
import type { SolcInputHashMap } from './exportArtifact'
import { exportArtifacts, exportArtifactsFromDeployments } from './exportArtifact'
import { genReadme } from './genReadme'
import { genTypeChain } from './genTypeChain'
import { getIndexAddressSource } from './template/address-template'
import { getDeployedSource } from './template/deployed-template'
import { getIndexSource } from './template/index-template'

import chalk from 'chalk'
import fs from 'fs'
import path from 'path'

import { mkdirEmpty, normalizePath } from './common'
// This import is needed to let the TypeScript compiler know that it should include your type
// extensions in your npm package's types file.
import {
  PLUGIN_NAME,
  TASK_PACKAGE,
  TASK_PACKAGE_ADDRESS,
  TASK_PACKAGE_GET_DEPLOYED_ADDRESS,
  TASK_PACKAGE_TYPECHAIN,
  TASK_PACKAGE_WRITE_DEPLOYED
} from './task-names'
import './type-extensions'

function updatePackageConfig(config: HardhatConfig) {
  const includeDeployed: boolean = defaultIncludeDeployed(config)
  config.package = {
    ...config.package,
    includeDeployed:
      config.package.includeDeployed === undefined
        ? includeDeployed
        : config.package.includeDeployed,
    artifactFromDeployment:
      config.package.artifactFromDeployment === undefined
        ? includeDeployed
        : config.package.artifactFromDeployment
  }
}

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  let packageConfig = userConfig.package || {}
  const defaultConfig = {
    outDir: 'dist',
    packageJson: 'package.json',
    outputTarget: 'typechain',
    buildDir: 'package-build'
  }
  packageConfig = { ...defaultConfig, ...packageConfig }
  config.package = packageConfig
})

task(TASK_PACKAGE, 'package contracts')
  .addOptionalPositionalParam(
    'taskName',
    'packaging output target',
    'typechain', // defaultValue ,
    types.string
  )
  .addOptionalParam('build', 'build or setup only', true, types.boolean)
  .setAction(async ({ taskName, build }, hre: HardhatRuntimeEnvironment) => {
    const { config } = hre
    updatePackageConfig(config)
    if (config.package.includes === undefined) {
      const contractNames = getDeployedContractNames(hre)
      if (contractNames.length > 0) {
        config.package.includes = contractNames
      }
    }
    if (taskName === 'typechain') {
      config.package.outputTarget = taskName
      await hre.run(TASK_PACKAGE_TYPECHAIN, { outputTarget: taskName, build })
    } else if (taskName === 'address') {
      config.package.outputTarget = taskName
      await hre.run(TASK_PACKAGE_ADDRESS, { outputTarget: taskName, build })
    } else {
      const subTaskName = `package:${taskName}`
      try {
        await hre.run(subTaskName, { taskName, build })
      } catch (e) {
        throw new HardhatPluginError(PLUGIN_NAME, e?.message)
      }
    }
  })

subtask(TASK_PACKAGE_TYPECHAIN, 'package typechain contracts')
  .addOptionalParam('build', 'build or setup only', true, types.boolean)
  .setAction(async ({ outputTarget, build }, hre: HardhatRuntimeEnvironment) => {
    await packageCommon({ outputTarget, build }, hre)
  })

// FIXME
subtask(TASK_PACKAGE_ADDRESS, 'package deployed addresses only')
  .addOptionalParam('build', 'build or setup only', true, types.boolean)
  .setAction(async ({ outputTarget, build }, hre: HardhatRuntimeEnvironment) => {
    await packageCommon({ outputTarget, build }, hre)
  })

async function packageCommon(
  { outputTarget, build }: TaskArguments,
  hre: HardhatRuntimeEnvironment
) {
  const { config } = hre

  console.log(chalk.yellow(`✨ Clean buildDir and outDir`))
  let outDir = normalizePath(config.paths.root, config.package.outDir)
  mkdirEmpty(outDir)

  // clean up builddir
  let buildPath = normalizePath(config.paths.root, config.package.buildDir)
  mkdirEmpty(buildPath)

  try {
    console.log(chalk.green(`✨ Export extended artifacts`))
    const solcInputHashMap: SolcInputHashMap = await exportArtifacts(hre)

    console.log(chalk.green(`✨ Export artifacts from deployments`))
    const anyExportedFromDeployments = await exportArtifactsFromDeployments(hre, solcInputHashMap)

    await buildCode(hre, outputTarget, build, anyExportedFromDeployments)
  } catch (e) {
    throw new HardhatPluginError(PLUGIN_NAME, e.message)
  }
  console.log(chalk.green('✨ generating README'))
  await genReadme(hre)

  console.log(chalk.green('✨ writing package.json'))
  writePackageJson(config)

  // show publish command message
  console.log(chalk.green(`✨ Done packaging`))
  console.log(chalk.green(chalk.bold(`\n cd ${config.package.outDir} && npm publish`)))
}

async function buildCode(
  hre: HardhatRuntimeEnvironment,
  outputTarget: string,
  build: boolean = true,
  anyExportedFromDeployments
) {
  // mv index.ts typechain.ts
  // add helper index.ts
  // tsc
  // rm index.ts
  // mv typechain.ts to index.ts

  const { config } = hre

  const typechainPath = normalizePath(config.paths.root, config.package.buildDir, 'src.ts')
  console.log(chalk.green(`✨ generating typechain in ${typechainPath}`))
  await genTypeChain(config)

  if (!fs.existsSync(typechainPath)) {
    console.error(chalk.red('Error: check typechain folder setup or compile first'))
    console.error(chalk.red('ex) hardhat clean && hardhat compile'))
    throw new HardhatPluginError(PLUGIN_NAME, 'typechain path not found')
  }

  let indexTs
  if (config.package.includeDeployed) {
    // index.ts -> typechain.ts
    indexTs = path.join(typechainPath, 'index.ts')
    if (!fs.existsSync(indexTs)) {
      console.error(chalk.red('index.ts not found in typechain outDir'))
      console.error(chalk.red('Error: check typechain folder setup or compile first'))
      console.error(chalk.red('ex) hardhat clean && hardhat compile'))
      throw new HardhatPluginError(PLUGIN_NAME, 'index.ts not found')
    }
  }
  try {
    if (config.package.includeDeployed) {
      fs.renameSync(indexTs, path.join(typechainPath, 'typechain.ts'))
      console.log(chalk.green('setup to build typechain'))
      console.log('  renamed "index.ts" to "typechain.ts"')

      await hre.run(TASK_PACKAGE_WRITE_DEPLOYED, {
        outputPath: typechainPath
      })
    }
    if (config.package.includeDeployed || outputTarget === 'address') {
      // write index.ts
      console.log('setting new "index.ts"')
      buildIndexSource(hre, outputTarget, typechainPath, anyExportedFromDeployments)
    }
    // cp src.ts
    let outDir = normalizePath(config.paths.root, config.package.outDir)
    let srcDir = path.join(outDir, 'src.ts')
    fs.cpSync(typechainPath, srcDir, { recursive: true })

    // tsc esm
    console.log('✨ building esm output...')
    buildTypeChain(getTsconfig('esm', config), srcDir, build)

    // tsc cjs
    console.log('✨ building cjs output...')
    buildTypeChain(getTsconfig('cjs', config), srcDir, build)

    console.log(chalk.green('✨ tsc compiled package'))

    console.log(`copying ${typechainPath} to src.ts ...`)
  } finally {
    // rm index.ts
    // remove tsconfig
    // if (build && (config.package.includeDeployed || outputTarget === 'address')) {
    //   console.log('restoring original typechain "index.ts"')
    //   fs.unlinkSync(path.join(typechainPath, 'index.ts'))
    //   // typechain.ts -> index.ts
    //   fs.renameSync(path.join(typechainPath, 'typechain.ts'), path.join(typechainPath, 'index.ts'))
    // }
  }
}

function buildTypeChain(tsconfig, typechainPath, build: boolean = true) {
  // write tsconfig
  const outPath = path.join(typechainPath, 'tsconfig.json')
  fs.writeFileSync(outPath, JSON.stringify(tsconfig, null, 2))

  let opts = {
    cwd: typechainPath
  }
  if (build) {
    // tsc
    try {
      let res = exec('tsc --build --force', opts)
      console.log(chalk.green(res.toString()))
      if (res.toString()) {
        console.log('tsc results:', res.toString())
      }
    } catch (err) {
      console.error(chalk.red('tsc failed'))
      err?.stderr && console.error(chalk.red(err?.stderr?.toString()))
      err?.stdout && console.error(chalk.red(err?.stdout?.toString()))
      throw err
    } finally {
      // remove tsconfig
      fs.unlinkSync(outPath)
    }
  }
}

function getTsconfig(moduleType: 'esm' | 'cjs', config: HardhatConfig, clean: boolean = false) {
  const conf = config?.package
  // let distPath: string
  let tsconfig = moduleType === 'esm' ? tsEsm : tsCjs
  if (!clean && config.package.outputTarget === 'address') {
    tsconfig.include = ['index.ts']
  }
  tsconfig.compilerOptions.outDir = `../${moduleType}`
  return tsconfig
}

function writePackageJson(config: HardhatConfig) {
  // prepare package.json and copy
  // remove dependencies
  let pkg: object

  // if no extra config then extract a part of package information from original package.json
  let packagePath = normalizePath(config.paths.root, 'package.json')
  if (fs.existsSync(packagePath)) {
    const hardhatPackage = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    console.log('extracting package information')

    pkg = {
      name: hardhatPackage['name'],
      version: hardhatPackage['version'],
      private: hardhatPackage['private'],
      license: hardhatPackage['license'],
      description: hardhatPackage['description'],
      homepage: hardhatPackage['homepage'],
      repository: hardhatPackage['repository'],
      keywords: hardhatPackage['keywords'],
      peerDependencies: hardhatPackage['peerDependencies']
    }
    console.log(chalk.green(`extracted package information:, ${JSON.stringify(pkg, null, 2)}`))
    // pkgDefault['peerDependencies'] = pkg['peerDependencies'] || pkgDefault['peerDependencies']
    pkg = { ...pkg, ...pkgDefault, ...pkg }
  } else {
    throw new HardhatPluginError(PLUGIN_NAME, 'package.json not found')
  }

  const packageConfig = config.package
  if (packageConfig.packageJson !== 'package.json') {
    packagePath = normalizePath(config.paths.root, packageConfig.packageJson)
    if (fs.existsSync(packagePath)) {
      pkg = { ...pkg, ...JSON.parse(fs.readFileSync(packagePath, 'utf8')) }
    } else {
      console.error(chalk.yellow(`${packageConfig.packageJson} not found in ${config.paths.root}`))
      throw new HardhatPluginError(PLUGIN_NAME, 'packageConfig.packageJson not found')
    }
  }

  let outDir = normalizePath(config.paths.root, config.package.outDir)

  // write package.json
  fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify(pkg, null, 2))
}

async function buildIndexSource(
  hre: HardhatRuntimeEnvironment,
  targetOutput: string,
  typechainPath: string,
  anyExportedFromDeployments: boolean
) {
  // and format type of Contract[Factory]
  if (targetOutput === 'typechain' && hre.config.package?.includeDeployed) {
    let targetInfo = getTargetInfo(hre)
    const source = getIndexSource({ ...targetInfo, anyExportedFromDeployments })
    fs.writeFileSync(path.join(typechainPath, 'index.ts'), source)
  } else if (targetOutput === 'address') {
    const source = getIndexAddressSource()
    fs.writeFileSync(path.join(typechainPath, 'index.ts'), source)
  }
}

function getTargetInfo(hre: HardhatRuntimeEnvironment) {
  // get typechain target
  // getDefaultTypechainConfig
  const { config } = hre

  const target = config.typechain.target
  console.log('hardhat-package: target', target)
  if (target === 'ethers-v5') {
    return {
      signerPackage: '@ethersproject/abstract-signer',
      contractPackage: '@ethersproject/contracts',
      contractClass: 'BaseContract',
      factoryClass: 'ContractFactory'
    }
  } else {
    throw new HardhatPluginError(PLUGIN_NAME, `unexpected typechain target ${target}`)
  }
}

subtask(TASK_PACKAGE_GET_DEPLOYED_ADDRESS, 'show deployed addresses').setAction(
  async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const deployed = getDeployedFiltered(hre)
    // write deployed inforamtion
    console.log(chalk.green('deployed:'), deployed)
  }
)

subtask(TASK_PACKAGE_WRITE_DEPLOYED, 'write deployedAddress.ts')
  .addOptionalPositionalParam(
    'outputPath',
    'packaging output path or filena',
    '.', // defaultValue ,
    types.string
  )
  .setAction(async ({ outputPath }, hre: HardhatRuntimeEnvironment) => {
    // write deployed address info
    try {
      const deployed = getDeployedFiltered(hre)

      // write deployed inforamtion
      console.log(chalk.green('deployed:'), deployed)
      console.log('writing deployed addresses')
      const source = getDeployedSource(deployed)
      fs.writeFileSync(path.join(outputPath, 'deployedAddress.ts'), source)
    } catch (e) {
      throw new HardhatPluginError(PLUGIN_NAME, e.message)
    }
  })
