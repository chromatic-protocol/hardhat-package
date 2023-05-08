export interface TypechainPackageConfig {
  outDir?: string  // packaged destination folder.  default: dist
  packageJson?: string  // custom package.json file to bundle with 
  outputTarget?: string  // 'typechain' | 'address' packaging target option
  includeDeployed?: boolean  // include deployed address or not
  artifactFromDeployment?: boolean // use artifacts from deployments
  // tsconfigJson?: string // not implemented yet
  buildDir?: string // building intermediate path
  includes?: Array<string> // glob pattern of contract abi path to include
  excludes?: Array<string> // glob pattern of contract abi path to exclude
  includesFromDeployed?: Array<string> // contract name pattern to exclude from deployed
  excludesFromDeployed?: Array<string> // contract name pattern to exclude from deployed
  docgen?: any  // config of solidity-docgen
}
