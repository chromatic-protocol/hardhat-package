import { HardhatConfig } from 'hardhat/types'
import path from 'path'
import { Config as TypeChainConfig, glob, runTypeChain } from 'typechain'
import { normalizePath } from '../common'
// hardhat config : source from @typechain/hardhat
interface TypechainConfig {
  outDir: string
  target: string
  alwaysGenerateOverloads: boolean
  discriminateTypes: boolean
  tsNocheck: boolean
  externalArtifacts?: string[]
  dontOverrideCompile: boolean
}

export function getTypeChainConfig(config: HardhatConfig, artifactPath: string): TypeChainConfig {
  const cwd = config.paths.root
  const typechainCfg = config.typechain as TypechainConfig

  const targetPath =
    typechainCfg?.target && typechainCfg?.target.startsWith('@')
      ? `./node_modules/${typechainCfg.target}`
      : undefined
  const filesToProcess = glob(cwd, [`${artifactPath}/**/*.json`])

  const typechainOptions: TypeChainConfig = {
    cwd,
    allFiles: filesToProcess,
    filesToProcess: filesToProcess,

    inputDir: artifactPath,
    outDir: path.join(config.package.buildDir, 'src.ts'),
    target: targetPath || typechainCfg.target,
    flags: {
      alwaysGenerateOverloads: typechainCfg?.alwaysGenerateOverloads,
      discriminateTypes: typechainCfg?.discriminateTypes,
      tsNocheck: typechainCfg?.tsNocheck,
      environment: undefined //'hardhat'
    }
  }
  return typechainOptions
}

export async function genTypeChain(config: HardhatConfig) {
  const artifactPath = normalizePath(config.paths.root, config.package.buildDir, 'extend-artifacts')
  const typechainOptions: TypeChainConfig = getTypeChainConfig(config, artifactPath)

  const result = await runTypeChain(typechainOptions)
}
