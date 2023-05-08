import chalk from 'chalk'
import fs from 'fs'
import { HardhatConfig } from 'hardhat/types'
import { Config as TypeChainConfig, glob, runTypeChain } from 'typechain'
import { normalizePath } from '../impl/utils'


export async function genTypeChain(config: HardhatConfig) {
  const cwd = config.paths.root
  const typechainCfg = config.typechain as any // TypechainConfig

  const allFiles = glob(cwd, [
    config.package.artifactFromDeployment
      ? `${config.paths.deployments}/**/!(solcInputs)/**/+([a-zA-Z0-9_]).json`
      : `${config.paths.artifacts}/!(build-info)/**/+([a-zA-Z0-9_]).json`
  ])

  // temporarily fixing: runTypeChain cannot resolve package?
  const targetPath =
    typechainCfg.target && typechainCfg.target.startsWith('@')
      ? `./node_modules/${typechainCfg.target}`
      : undefined

  const typechainOptions: Partial<TypeChainConfig> = {
    cwd,
    // allFiles,
    inputDir: config.package.artifactFromDeployment
      ? config.paths.deployments
      : config.paths.artifacts,
    outDir: config.package.buildDir,
    target: targetPath || typechainCfg.target,
    flags: {
      alwaysGenerateOverloads: typechainCfg.alwaysGenerateOverloads,
      discriminateTypes: typechainCfg.discriminateTypes,
      tsNocheck: typechainCfg.tsNocheck,
      environment: undefined //'hardhat'
    }
  }

  // filesToProcess
  let filesToProcess = [...allFiles] // let default
  if (config.package.includes) {
    const includes = config.package.includes.map((x) =>
      config.package.artifactFromDeployment
        ? `${config.paths.deployments}/!(solcInputs)/**/${x}.json`
        : `${config.paths.artifacts}/!(build-info)/**/${x}.json`
    )
    let includeFiles = glob(cwd, includes)
    filesToProcess = filesToProcess.filter((x) => includeFiles.includes(x))
  }
  if (config.package.excludes) {
    // glob pattern can include folder pattern
    // ex) ['@openzepplin/**/*']
    let excludes = config.package.excludes.map((x) =>
      config.package.artifactFromDeployment
        ? `${config.paths.deployments}/${x}.json`
        : `${config.paths.artifacts}/${x}.json`
    )
    let excludeFiles = glob(cwd, excludes)
    filesToProcess = filesToProcess.filter((x) => !excludeFiles.includes(x))

    // glob pattern can include contract name pattern
    // ex) ['Mock**']
    excludes = config.package.excludes.map((x) =>
      config.package.artifactFromDeployment
        ? `${config.paths.deployments}/**/${x}.json`
        : `${config.paths.artifacts}/**/${x}.json`
    )
    excludeFiles = glob(cwd, excludes)
    filesToProcess = filesToProcess.filter((x) => !excludeFiles.includes(x))
  }
  console.log(chalk.yellow('filesToProcess', JSON.stringify(filesToProcess, null, 2)))

  // remove if exist
  let buildPath = normalizePath(config.paths.root, config.package.buildDir)
  if (fs.existsSync(buildPath)) {
    console.log(chalk.yellow(`removing existing packaging-build folder ${config.package.buildDir}`))
    fs.rmSync(buildPath, { recursive: true, force: true })
  }

  const result = await runTypeChain({
    ...typechainOptions,
    allFiles: filesToProcess,
    filesToProcess: filesToProcess
  } as TypeChainConfig)
}
