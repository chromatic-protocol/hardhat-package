export interface TypechainPackageConfig {
  outDir?: string
  packageJson?: string
  outputTarget?: string
  includeDeployed?: boolean
  artifactFromDeployment?: boolean
  // tsconfigJson?: string // not implemented yet
  buildDir?: string // generating typechin types to this folder
  includes?: Array<string> // contract name pattern to include
  excludes?: Array<string> // contract name pattern to exclude
  includesFromDeployed?: Array<string> // contract name pattern to exclude from deployed
  excludesFromDeployed?: Array<string> // contract name pattern to exclude from deployed
}
