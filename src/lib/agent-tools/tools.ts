import { tool } from '@openai/agents'
import LocalStorage from '../../db/local'
import { getFileSystem } from '../../main/service/file-service'
import { flattenPathTree } from '../../lib/paths'
import { searchEmbeddingsDistinct } from '../embeddings'
import { z } from 'zod'

export function generateGetRelevantFilesTool(folders: string[], localStorage: LocalStorage) {
  return tool({
    name: 'get_relevant_files',
    description: 'Get the top 5 relevant file paths based on a query.',
    parameters: z.object({ query: z.string() }),
    async execute({ query }) {
      const allFilePaths: string[] = []
      for (const dir of folders) {
        const dirTree = await getFileSystem(dir)
        const filePaths = flattenPathTree(dirTree, dir)
        allFilePaths.push(...filePaths)
      }
      const results = await searchEmbeddingsDistinct(query, localStorage, 5, allFilePaths)
      console.log('get_relevant_files results: ', results)
      return results
    }
  })
}
