import { MCPServerStdio, MCPServerStreamableHttp } from '@openai/agents'

export type Server = {
  name: 'fileServer' | 'clientStateServer'
  instructionsPrompt: string
  mcpServer: MCPServerStdio | MCPServerStreamableHttp
}

export function FileServer(folders: string[]): Server {
  const projectDirs = folders

  const server = new MCPServerStdio({
    name: 'Filesystem MCP Server, via npx',
    fullCommand: `npx -y ${import.meta.env.VITE_MCP_SERVER_PATH} ${projectDirs.join(' ')}`
  })
  server.connect()
  return {
    name: 'fileServer',
    instructionsPrompt: `
# File System Instructions
- You have access to the filesystem via tools.
- You have access to the get_relevant_files tool. You can create a query for information you need and this tool will return the top 5 files that has this information.
- If you are unable to find any files, you can say so instead of assuming they exist.
- If a file changes during our conversation, review it and adjust your recommendations accordingly.
- You can read, write, create, and delete files as needed.
- When reading files, only read what you need to answer the user's questions.
- When writing files, ensure they are well-formatted and adhere to best practices.
- Only produce files that are markdown or html, never ask if I want other file types.
`,
    mcpServer: server
  }
}

export function ClientStateServer(): Server {
  const HttpMcpServer = new MCPServerStreamableHttp({
    url: 'http://localhost:8000',
    name: 'Client State MCP Server'
  })

  HttpMcpServer.connect()
  return {
    name: 'clientStateServer',
    instructionsPrompt: `
# Role
You are a helpful assistant that helps me navigate my website.  
You have access to the client state via a tool called getClientState which returns a JSON string. 
The return JSON string has the following format:
{
  "current_file": "string", // the file currently open in the editor
  "cursor_position": number // the current cursor position in the file
}
`,
    mcpServer: HttpMcpServer
  }
}
