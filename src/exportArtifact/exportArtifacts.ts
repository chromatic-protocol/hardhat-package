import fs from 'fs'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'
import { Artifact, BuildInfo, HardhatConfig } from 'hardhat/types'
import path from 'path'
import { filterPaths, normalizePath, readJSON } from '../common'

export async function exportArtifacts(hre: HardhatRuntimeEnvironment) {
  const config: HardhatConfig = hre.config
  const artifactPaths = await hre.artifacts.getArtifactPaths()

  const extendedArtifactFolderpath = normalizePath(
    config.paths.root,
    config.package.buildDir,
    'extend-artifacts'
  )

  // filter artifacts with package.config
  const filteredArtifactPaths = filterPaths(
    artifactPaths,
    config.package.includes,
    config.package.excludes
  )

  const artifactsDir = config.paths.artifacts

  for (const artifactPath of filteredArtifactPaths) {
    const artifact: Artifact = readJSON(artifactPath)
    const artifactName = path.basename(artifactPath, '.json')
    const artifactDBGPath = path.join(path.dirname(artifactPath), artifactName + '.dbg.json')
    const artifactDBG = readJSON(artifactDBGPath)
    const buildinfoPath = path.join(path.dirname(artifactDBGPath), artifactDBG.buildInfo)
    const buildInfo: BuildInfo = readJSON(buildinfoPath)

    const output = buildInfo.output.contracts[artifact.sourceName][artifactName]

    const extendedArtifact = {
      ...artifact,
      userdoc: (output as any).userdoc,
      devdoc: (output as any).devdoc
    }

    // follow original path structure
    const pathToSave = path
      .dirname(path.dirname(artifactPath))
      .replace(artifactsDir, extendedArtifactFolderpath)

    if (!fs.existsSync(pathToSave)) {
      fs.mkdirSync(pathToSave, { recursive: true })
    }

    const jsonPath = path.join(pathToSave, artifactName + '.json')
    console.log(`write to ${jsonPath}`)
    fs.writeFileSync(jsonPath, JSON.stringify(extendedArtifact, null, '  '))
  }
}
