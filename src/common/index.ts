import chalk from 'chalk'
import fs from 'fs'
import { minimatch } from 'minimatch'
import path from 'path'

export function normalizePath(base: string, ...others: Array<string>): string {
  const res = path.join(base, ...others)
  if (path.isAbsolute(res)) return res
  else return path.normalize(res)
}

export function filterPaths(
  paths: Array<string>,
  includes: Array<string>,
  excludes: Array<string>
): Array<string> {
  includes = includes ? includes.map(expandToGlobPattern) : ['**/*']
  excludes = excludes ? excludes.map(expandToGlobPattern) : []
  console.log('includes, excludes', includes, excludes)
  const checkInclude = (name) => includes.map((x) => minimatch.filter(x)).some((f) => f(name))

  const checkExclude = (name) => excludes.map((x) => minimatch.filter(x)).some((f) => f(name))

  return paths.filter((p) => {
    return checkInclude(p) && !checkExclude(p)
  })
}

function expandToGlobPattern(pattern) {
  return `**/${pattern}*`
}

export function readJSON(jsonpath: string) {
  const file = fs.readFileSync(jsonpath, { encoding: 'utf8' })
  return JSON.parse(file)
}

export function mkdirEmpty(dir) {
  if (fs.existsSync(dir)) {
    console.log(chalk.yellow(`cleanup existing output folder ${dir}`))
    fs.rmSync(dir, { recursive: true, force: true })
  }
  fs.mkdirSync(dir, { recursive: true })
}
