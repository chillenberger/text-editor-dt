import { writeFileSync, unlinkSync, statSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { PathTree } from '../../types'
import { readFile, readdir } from 'fs'
import exec from 'child_process'
import { ipcMain, dialog } from 'electron'
import { app } from 'electron'
import { flattenPathTree } from '../../lib/paths'
import { updateEmbeddingsForFile } from '../../lib/embeddings'
import LocalStorage from '../../db/local'
import puppeteer from 'puppeteer'

// TODO: ensure no files outside public are ever updated. Security risk.

export async function getFileSystem(folder: string): Promise<PathTree> {
  return new Promise((resolve, reject) => {
    readdir(folder, (err, files) => {
      if (err) {
        console.error(`Error reading ${folder} directory:`, err)
        return reject(err)
      }

      // Filter out system files and hidden files
      const validFiles = files.filter(
        (file) => !file.startsWith('.') && !file.startsWith('~') && file.length > 0
      )

      const root: PathTree = { title: path.basename(folder), pathType: 'dir', children: [] }

      // Create promises for reading each file
      const fileReadPromises = validFiles.map((file) => {
        return new Promise<void>((fileResolve, fileReject) => {
          const fullPath = path.join(folder, file)
          if (statSync(fullPath).isFile()) {
            if (root.children === null) root.children = []
            root.children.push({ title: file, pathType: 'file', children: null })
            fileResolve()
          } else {
            // It's a directory, recurse into it
            getFileSystem(path.join(folder, file))
              .then((subDirs) => {
                if (root.children === null) root.children = []
                root.children.push({ title: file, pathType: 'dir', children: subDirs.children })
                root.children.sort((a, b) => a.title.localeCompare(b.title))
                fileResolve()
              })
              .catch(fileReject)
          }
        })
      })

      // Wait for all files to be read before resolving
      Promise.all(fileReadPromises)
        .then(() => {
          resolve(root)
        })
        .catch(reject)
    })
  })
}

export async function addFile(fullPath: string, content: string) {
  try {
    const dirName = path.dirname(fullPath)
    if (!existsSync(dirName)) {
      mkdirSync(dirName, { recursive: true })
    }

    writeFileSync(fullPath, content, { flag: 'wx' })
  } catch (error) {
    console.error(`Error adding file ${fullPath}`, error)
  }
}

export async function deleteFile(fullPath: string) {
  try {
    unlinkSync(fullPath)
  } catch (error) {
    console.error(`Error deleting file ${fullPath}:`, error)
  }
}

export async function readFileContent(fullPath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    readFile(fullPath, (err, data) => {
      if (err) {
        console.error(`Error reading file ${fullPath}:`, err)
        return reject(err)
      }
      resolve(data.toString())
    })
  })
}

async function updateFile(path: string, content: string) {
  try {
    writeFileSync(path, content, { flag: 'w' })
  } catch (error) {
    console.error(`Error updating file ${path}`, error)
  }
}

export async function exportHtmlToPdf(htmlContent: string, outputFilePath: string, fileName: string) {
  if (!htmlContent || !outputFilePath) {
    console.error('No HTML content provided')
    return
  }

  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
  await page.pdf({
    path: path.join(outputFilePath, fileName + '.pdf'),
    printBackground: true,
    preferCSSPageSize: true
  })
  await browser.close()
}

export default function setUpFileSystemHandlers(localStorage: LocalStorage) {
  ipcMain.handle('pull-file-system', async (_, path) => {
    const fileSystem = await getFileSystem(path)

    const filePaths = flattenPathTree(fileSystem, path)
    
    const embeddings: Promise<void>[] = [];
    for (const path of filePaths) {
      const content = await readFileContent(path)
      embeddings.push(updateEmbeddingsForFile(path, content, localStorage))
    }

    await Promise.all(embeddings)
    
    return fileSystem
  })

  ipcMain.handle('update-file', async (_, filePath: string, content: string) => {
    await updateFile(filePath, content)
    await updateEmbeddingsForFile(filePath, content, localStorage)
  })

  ipcMain.handle('delete-file', async (_, filePath: string) => {
    await deleteFile(filePath)
    localStorage.embeddings.deleteEmbeddingsByFilePath(filePath)
  })

  ipcMain.handle('read-file', async (_, filePath: string) => {
    return await readFileContent(filePath)
  })

  ipcMain.handle('add-file', async (_, filePath: string, content: string) => {
    await addFile(filePath, content)
    await updateEmbeddingsForFile(filePath, content, localStorage)
  })

  ipcMain.handle('select-folder', async (_, projectName: string) => {
    const folder = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    return folder
  })

  ipcMain.handle('select-file', async () => {
    const folder = await dialog.showOpenDialog({ properties: ['openFile'] })
    return folder
  })
}
