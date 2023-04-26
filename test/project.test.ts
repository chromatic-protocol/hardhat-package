// tslint:disable-next-line no-implicit-dependencies
import { assert } from 'chai'
import path from 'path'

import { useEnvironment } from './helpers'
import { TASK_TEST } from 'hardhat/builtin-tasks/task-names'
import { TASK_PACKAGE_TYPECHAIN } from '../src/task-names'


describe('Hardhat run task pack', function () {
  useEnvironment('hardhat-ethers-project')

  it('Should add the example field', function () {
    // hi
    // TODO
    this.hre.run(TASK_PACKAGE_TYPECHAIN)
  })
})
