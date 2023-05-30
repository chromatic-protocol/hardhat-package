import fs from 'fs'
import type {
  Artifact,
  BuildInfo,
  CompilerInput,
  HardhatConfig,
  HardhatRuntimeEnvironment
} from 'hardhat/types'
import murmur128 from 'murmur-128'
import path from 'path'
import { filterPaths, normalizePath, readJSON } from '../common'

export interface SolcInputHashMap {
  [fullyQualifiedName: string]: string
}

export async function exportArtifacts(hre: HardhatRuntimeEnvironment): Promise<SolcInputHashMap> {
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
  console.log('filtered artifact paths from artifacts:', filteredArtifactPaths)
  const artifactsDir = config.paths.artifacts
  const solcInputHashMap: SolcInputHashMap = {}

  for (const artifactPath of filteredArtifactPaths) {
    const artifact: Artifact = readJSON(artifactPath)
    if (config.package.excludeBytecode) {
      delete artifact['bytecode']
      delete artifact['deployedBytecode']
    }
    const artifactName = path.basename(artifactPath, '.json')
    const artifactDBGPath = path.join(path.dirname(artifactPath), artifactName + '.dbg.json')
    const artifactDBG = readJSON(artifactDBGPath)
    const buildinfoPath = path.join(path.dirname(artifactDBGPath), artifactDBG.buildInfo)
    const buildInfo: BuildInfo = readJSON(buildinfoPath)

    const output = buildInfo.output.contracts[artifact.sourceName][artifactName]
    const solcInputHash = makeSolcInputHash(buildInfo.input)
    const extendedArtifact = {
      ...artifact,
      solcInputHash,
      userdoc: (output as any).userdoc,
      devdoc: (output as any).devdoc
    }

    const fullyQualifiedName = `${artifact.sourceName}:${artifact.contractName}`
    solcInputHashMap[fullyQualifiedName] = solcInputHash

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
  return solcInputHashMap
}

function makeSolcInputHash(buildInfoInput: CompilerInput) {
  const solcInput = JSON.stringify(buildInfoInput, null, '  ')
  return Buffer.from(murmur128(solcInput)).toString('hex')
}
