import type { DeployFunction } from 'hardhat-deploy/types'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network, ethers } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  await deploy('Greeter', {
    from: deployer,
    args: ['hi from Greeter contract!'],
    log: true
  })
}

export default func

func.id = 'deploy_greeter' // id required to prevent reexecution
func.tags = ['test', 'local']
