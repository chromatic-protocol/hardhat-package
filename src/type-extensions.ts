// If your plugin extends types from another plugin, you should import the plugin here.

// To extend one of Hardhat's types, you need to import the module where it has been defined, and redeclare it.
import 'hardhat/types/config'
import 'hardhat/types/runtime'
import { TypechainPackageConfig } from './types'

declare module 'hardhat/types/config' {
  // This is an example of an extension to one of the Hardhat config values.

  interface HardhatUserConfig {
    package?: Partial<TypechainPackageConfig>
  }

  interface HardhatConfig {
    package?: Partial<TypechainPackageConfig>
  }

}
