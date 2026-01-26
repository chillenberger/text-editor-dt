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

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pdf = require('pdf-parse/lib/pdf-parse.js')

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
    // If it is a PDF file, read as base64
    if (fullPath.toLowerCase().endsWith('.pdf')) {
      readFile(fullPath, (err, data) => {
        if (err) {
          console.error(`Error reading PDF file ${fullPath}:`, err)
          return reject(err)
        }
        resolve(data.toString('base64'))
      })
      return
    }

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

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer)
    return data.text
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    return ''
  }
}

export default function setUpFileSystemHandlers(localStorage: LocalStorage) {
  ipcMain.handle('pull-file-system', async (_, path) => {
    const fileSystem = await getFileSystem(path)

    const filePaths = flattenPathTree(fileSystem, path)
    
    const embeddings: Promise<void>[] = [];
    for (const path of filePaths) {
      if (path.toLowerCase().endsWith('.pdf')) {
        const buffer = await readFileBuffer(path)
        const text = await extractTextFromPdf(buffer)
        embeddings.push(updateEmbeddingsForFile(path, text, localStorage))
      } else {
        const content = await readFileContent(path)
        embeddings.push(updateEmbeddingsForFile(path, content, localStorage))
      }
    }

    await Promise.all(embeddings)
    
    return fileSystem
  })

  ipcMain.handle('update-file', async (_, filePath: string, content: string) => {
    await updateFile(filePath, content)
    if (filePath.toLowerCase().endsWith('.pdf')) {
      // Content for PDF update usually comes as base64 or we re-read from disk?
      // For simplicity, let's re-read from disk since updateFile writes to disk.
      const buffer = await readFileBuffer(filePath)
      const text = await extractTextFromPdf(buffer)
      await updateEmbeddingsForFile(filePath, text, localStorage)
    } else {
      await updateEmbeddingsForFile(filePath, content, localStorage)
    }
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
    if (filePath.toLowerCase().endsWith('.pdf')) {
      const buffer = await readFileBuffer(filePath)
      const text = await extractTextFromPdf(buffer)
      await updateEmbeddingsForFile(filePath, text, localStorage)
    } else {
      await updateEmbeddingsForFile(filePath, content, localStorage)
    }
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

// Helper to read file as buffer
async function readFileBuffer(fullPath: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    readFile(fullPath, (err, data) => {
      if (err) {
        console.error(`Error reading file buffer ${fullPath}:`, err)
        return reject(err)
      }
      resolve(data)
    })
  })
}
