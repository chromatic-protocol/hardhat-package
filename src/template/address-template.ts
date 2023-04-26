export function getIndexAddressSource() {
  return `
import * as deployed from './deployed.json'
export { deployed }
`
}
