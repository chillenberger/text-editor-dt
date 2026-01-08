// components/search.tsx

import { useState } from "react";
import { LoadingAnimation } from "@renderer/components/loader";

interface SearchEmbeddingsProps {
  dirs: string[];
  onFileSelect?: (filePath: string) => void;
}

export function SearchEmbeddings({ dirs, onFileSelect }: SearchEmbeddingsProps) {
  const [queryResults, setQueryResults] = useState<Array<{ file_path: string; score: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const input = form.elements[0] as HTMLInputElement;
    const query = input.value;

    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const results = await window.electron.ipcRenderer.invoke("search-embeddings", query, 5, dirs);
      setQueryResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      setQueryResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (filePath: string) => {
    if (onFileSelect) {
      onFileSelect(filePath);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <LoadingAnimation size="md" />
          <p className="text-custom-gray-1 text-sm">Searching...</p>
        </div>
      );
    }

    if (!hasSearched) {
      return (
        <p className="text-custom-gray-1 text-sm">
          Enter a search query above.
        </p>
      );
    }

    if (queryResults.length === 0) {
      return (
        <p className="text-custom-gray-1 text-sm">
          No results found.
        </p>
      );
    }

    return queryResults.map((result, index) => (
      <button
        key={index}
        onClick={() => handleResultClick(result.file_path)}
        className="w-full text-left p-3 rounded-md
                   hover:bg-custom-gray-2 cursor-pointer 
                   border-b border-custom-gray-2 last:border-b-0
                   transition-colors block"
      >
        <p className="font-medium text-sm truncate text-custom-green-1" title={result.file_path}>
          {result.file_path.split('/').pop()}
        </p>
        <p className="text-xs text-custom-gray-1 truncate">{result.file_path}</p>
        <p className="text-xs text-custom-gray-2">Score: {result.score.toFixed(4)}</p>
      </button>
    ));
  };

  return (
    <div className="bg-custom-gray-3 rounded-md shadow-lg p-4 min-w-80 border border-custom-gray-2">
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Enter search query"
          disabled={isLoading}
          className="flex-1 px-3 py-2 bg-custom-gray-4 border border-custom-gray-2 rounded-md 
                     text-white placeholder-custom-gray-1
                     focus:outline-none focus:ring-2 focus:ring-custom-purple-1 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-custom-purple-2 text-white rounded-md 
                     hover:bg-custom-purple-1 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-custom-purple-2"
        >
          Search
        </button>
      </form>
      <div className="max-h-64 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}