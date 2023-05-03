import path from 'path'

export function normalizePath(base: string, other: string): string {
  const res = path.join(base, other)
  if (path.isAbsolute(res)) return res
  else return path.normalize(res)
}
