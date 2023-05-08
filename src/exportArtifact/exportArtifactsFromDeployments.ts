import fs from 'fs'
import type { HardhatConfig, HardhatRuntimeEnvironment } from 'hardhat/types'
import path from 'path'
import { glob } from 'typechain'
import { filterPaths, mkdirEmpty, normalizePath } from '../common'

/// export artifacts from deployments filered
export async function exportArtifactsFromDeployments(hre: HardhatRuntimeEnvironment) {
  const config: HardhatConfig = hre.config

  if (!config?.package?.artifactFromDeployment) {
    console.log(`will not export artifactfs from deployments`)
    return
  }

  const allArtifacts = glob(hre.config.paths.root, [
    `${hre.config.paths.deployments}/**/!(solcInputs)/+([a-zA-Z0-9_]).json`
  ])
  console.log('all artifacts in deployments:', allArtifacts)
  const filteredArtifactPaths = filterPaths(
    allArtifacts,
    config.package.includesFromDeployed,
    config.package.excludesFromDeployed
  )

  console.log('filtered artifacts in deployments:', filteredArtifactPaths)

  // const extendedArtifactFolderpath = path.join('extend-artifacts', 'deployed')
  const extendedArtifactFolderpath = normalizePath(
    config.paths.root,
    config.package.buildDir,
    'extend-artifacts',
    'deployed'
  )

  mkdirEmpty(extendedArtifactFolderpath)

  for (const artifactPath of filteredArtifactPaths) {
    const jsonPath = artifactPath.replace(hre.config.paths.deployments, extendedArtifactFolderpath)
    const dir = path.dirname(jsonPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(jsonPath, fs.readFileSync(artifactPath))
  }
}
