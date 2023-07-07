import { getIndexSource as getIndexSourceV5 } from './index-templates/index-ethers-v5'
import { getIndexSource as getIndexSourceV6 } from './index-templates/index-ethers-v6'

export function getIndexSource(targetInfo) {
  if (targetInfo.target === 'ethers-v5') {
    return getIndexSourceV5(targetInfo)
  } else if (targetInfo.target === 'ethers-v6') {
    return getIndexSourceV6(targetInfo)
  }
}
