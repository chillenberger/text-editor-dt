import {useState} from "react";

export function SearchEmbeddings({dirs}: {dirs: string[]}) {
  const [queryResults, setQueryResults] = useState<Array<{file_path: string; score: number}>>([]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const input = form.elements[0] as HTMLInputElement;
    const query = input.value;

    const results = await window.electron.ipcRenderer.invoke("search-embeddings", query, 5, dirs);
    // results.filter((res: {file_path: string}) => {
    //   return dirs.some(dir => res.file_path.startsWith(dir + '/'));
    // });
    setQueryResults(results);
  }

  return(
    <div>
      <form onSubmit={handleSearch}>
        <input type="text" placeholder="Enter search query" />
        <button type="submit">Search</button>
      </form>
      <div>
        {queryResults.map((result, index) => (
          <div key={index}>
            <p>File: {result.file_path}</p>
            <p>Score: {result.score}</p>
          </div>
        ))} 
      </div>
    </div>
  )
}