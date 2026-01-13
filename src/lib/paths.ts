import path from 'path'
import { PathTree } from '../types'

export function flattenPathTree(
  pathTree: PathTree,
  parentPath: string,
  files: string[] = []
): string[] {
  const children = pathTree.children || []

  for (const child of children) {
    if (child.pathType === 'file') {
      files.push(path.join(parentPath, child.title))
    } else if (child.pathType === 'dir') {
      flattenPathTree(child, path.join(parentPath, child.title), files)
    }
  }

  return files
}
