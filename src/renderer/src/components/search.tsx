// components/search.tsx

import { useState } from 'react'
import { LoadingAnimation } from '@renderer/components/loader'
import { VirtualManagedFileSystem } from '@renderer/hooks/use-file-manager'

interface SearchEmbeddingsProps {
  dirs: string[]
  onFileSelect?: (filePath: string) => void
  virtualDir: VirtualManagedFileSystem
}

export function SearchEmbeddings({ dirs, onFileSelect, virtualDir }: SearchEmbeddingsProps) {
  const [queryResults, setQueryResults] = useState<Array<{ file_path: string; score: number }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault()
    const form = event.target as HTMLFormElement
    const input = form.elements[0] as HTMLInputElement
    const query = input.value

    if (!query.trim()) return

    setIsLoading(true)
    setHasSearched(true)

    try {
      const results = await window.electron.ipcRenderer.invoke('search-embeddings', query, 5, dirs)
      setQueryResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setQueryResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleResultClick = (filePath: string) => {
    if (onFileSelect) {
      onFileSelect(filePath)
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <LoadingAnimation size="md" />
          <p className="text-custom-gray-1 text-sm">Searching...</p>
        </div>
      )
    }

    if (!hasSearched) {
      return <p className="text-custom-gray-1 text-sm">Enter a search query above.</p>
    }

    if (queryResults.length === 0) {
      return <p className="text-custom-gray-1 text-sm">No results found.</p>
    }

    return queryResults.map((result, index) => (
      <button
        key={index}
        onClick={() => handleResultClick(result.file_path)}
        className="w-full text-left p-2 rounded-sm mb-1
                   hover:bg-ide-base cursor-pointer 
                   border border-transparent hover:border-ide-border
                   transition-colors block group"
      >
        <div className="font-medium text-ide-accent truncate" title={result.file_path}>
          {result.file_path.split('/').pop()}
        </div>
        <div className="text-xs text-ide-text-muted truncate group-hover:text-ide-text-secondary">
          {result.file_path}
        </div>
        <div className="text-[10px] text-ide-text-muted opacity-50">Score: {result.score.toFixed(2)}</div>
      </button>
    ))
  }

  return (
    <div className="flex flex-col gap-2 h-full text-sm">
      <form onSubmit={handleSearch} className="flex flex-col gap-2 mb-2 p-2">
        <input
          type="text"
          placeholder="Search files..."
          disabled={isLoading}
          className="w-full px-3 py-2 bg-ide-base border border-ide-border rounded-sm 
                     text-ide-text-primary placeholder-ide-text-muted
                     focus:outline-none focus:border-ide-accent
                     disabled:opacity-50"
          autoFocus
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-3 py-1 bg-ide-accent/10 text-ide-accent border border-ide-accent/20 rounded-sm 
                     hover:bg-ide-accent/20 transition-colors
                     disabled:opacity-50"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </form>
      <div className="flex-1 overflow-y-auto px-2 pb-2">{renderContent()}</div>
    </div>
  )
}
