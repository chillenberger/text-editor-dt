import { tool } from '@openai/agents'
import LocalStorage from '../../db/local'
import { getFileSystem } from '../../main/service/file-service'
import { flattenPathTree } from '../paths'
import { searchEmbeddingsDistinct } from '../embeddings'
import { z } from 'zod'

export function semanticSearchTool(folders: string[], localStorage: LocalStorage) {
  return tool({
    name: 'semantic_search',
    description: 'Get the top 5 relevant file paths based on a query, ' +
    'only works within allowed directories. Use this tool when you need to ' + 
    'know what files are relevant to a query or information you need to know.',
    parameters: z.object({ query: z.string() }),
    async execute({ query }) {
      const allFilePaths: string[] = []
      for (const dir of folders) {
        const dirTree = await getFileSystem(dir)
        const filePaths = flattenPathTree(dirTree, dir)
        allFilePaths.push(...filePaths)
      }
      const results = await searchEmbeddingsDistinct(query, localStorage, 5, allFilePaths)
      return results
    }
  })
}
