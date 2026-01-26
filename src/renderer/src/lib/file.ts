import { File, EditorTypes, PathTree } from '../../../types'

const { separator, dirname, basename, extname } = (window as any).pathAPI

// function expandDir(db: File[]): Dir {
//   const firstPath = db[0].path.split(separator);
//   const rootTitle = firstPath[0];
//   if (!rootTitle) throw new Error("Invalid root directory");
//   const rootDir: Dir = { title: rootTitle, children: [] };

//   for ( const file of db) {
//     createFileInDir(file, rootDir);
//   }

//   return rootDir
// }

function findDir(currentPath: string, pathTree: PathTree): PathTree | null {
  if (currentPath === '') return null

  const splitPath = currentPath.split(separator)
  if (splitPath.shift() !== pathTree.title) return null

  while (splitPath.length > 0) {
    const subpath = splitPath.shift()
    const item = pathTree.children?.find((c) => c.title === subpath && c.pathType === 'dir')
    if (!item) return null
    pathTree = item
  }

  return pathTree && pathTree.pathType === 'dir' ? pathTree : null
}

function createFileInPathTree(file: File, pathTree: PathTree) {
  let dirName = dirname(file.path)
  let docTitle = basename(file.path)

  const splitPath = dirName.split(separator).filter((part) => part !== '')
  let subPath = splitPath.shift()

  if (subPath !== pathTree.title) return
  subPath = splitPath.shift()

  let currentNode: PathTree = pathTree

  while (splitPath.length >= 0 && !!subPath) {
    if (!currentNode.children) {
      currentNode.children = []
    }
    let nextNode = currentNode.children.find((item) => item.title === subPath)
    if (!nextNode) {
      const newDir: PathTree = { title: subPath, children: [], pathType: 'dir' }
      currentNode.children.push(newDir)
      nextNode = newDir
    }

    if (nextNode.children === null)
      throw new Error(`Path ${subPath} not found, ${subPath} is a file`)
    currentNode = nextNode
    subPath = splitPath.shift()
  }

  if (!currentNode.children) {
    currentNode.children = []
  }
  currentNode.children.push({ title: docTitle, pathType: 'file', children: null })
  alphabetizeDir(currentNode)
}

function deleteFileFromPathTree(rootPath: string, rootDir: PathTree) {
  const fileName = basename(rootPath)
  const dirName = dirname(rootPath)

  if (!fileName) return false

  const dir = findDir(dirName, rootDir)

  if (!dir) return false

  const fileIndex = dir.children?.findIndex((c) => c.title === fileName && c.pathType === 'file')
  if (fileIndex === -1 || fileIndex === undefined) return false

  dir.children?.splice(fileIndex, 1)
  return true
}

function getContentTypeFromPath(filePath: string): EditorTypes {
  const ext = extname(filePath).toLowerCase()
  if (ext === '.md' || ext === '.markdown' || ext === '.txt' || ext === '.json') {
    return 'markdown'
  } else if (ext === '.pdf') {
    return 'pdf'
  }
  return 'html'
}

function alphabetizeDir(dir: PathTree) {
  dir?.children?.sort((a, b) => {
    if (a.title < b.title) return -1
    if (a.title > b.title) return 1
    return 0
  })

  for (const child of dir?.children || []) {
    if (child.pathType === 'dir' && child.children) {
      alphabetizeDir(child)
    }
  }
}

export {
  findDir,
  createFileInPathTree,
  deleteFileFromPathTree,
  getContentTypeFromPath,
  alphabetizeDir
}
