import fs from 'fs'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'
import path from 'path'
import 'solidity-docgen'
import { normalizePath } from '../common'

export async function genReadme(hre: HardhatRuntimeEnvironment) {
  const { config } = hre
  // keep orginal setting
  const orgConfig = config.docgen
  let outDir = normalizePath(config.paths.root, config.package.outDir)

  config.docgen = {
    ...config.package.docgen,
    outputDir: config.package.outDir
  }

  await hre.run('docgen')

  // index.md to README.md
  fs.renameSync(path.join(outDir, 'index.md'), path.join(outDir, 'README.md'))

  config.docgen = orgConfig
}

// function getDocgenConfig(filesToProcess) {
//   return {
//     root: process.cwd(),
//     sourcesDir: 'contracts',
//     outputDir: 'docs',
//     pages: 'single',
//     exclude: [],
//     theme: 'markdown',
//     collapseNewlines: true,
//     pageExtension: '.md'
//   }
// }
