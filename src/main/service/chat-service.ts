import { Conversation, ChatResponse, ChatSchema, ChatLog, ChatActions } from '../../types'
import { IpcMainEvent } from 'electron'
import LocalStorage from '../../db/local'
import { semanticSearchTool } from '../../lib/agent-tools/semantic-search'
import { fileSystemTools, initializeFileSystemTools } from '../../lib/agent-tools/filesystem'
import { ResumeAssistant, GeneralAssistant, TemplateAssistant } from '../../lib/agents/assistant'
import { AgentBase } from '../../lib/agents/base-assistant'
import { Tool } from '@openai/agents'

let myAgentInstance: AgentBase | null = null
let localStorage: LocalStorage | null = null

function createAgent(agentId: string, folders: string[], localStorageDB: LocalStorage): AgentBase {
  // const servers = [FileServer(folders)]
  const servers = []
  const tools: Tool[] = []
  if (folders.length > 0) {
    initializeFileSystemTools(folders);
    tools.push(...fileSystemTools)
    tools.push(semanticSearchTool(folders, localStorageDB))
  }
  if (agentId === 'a1') {
    return new ResumeAssistant(servers, tools)
  }
  return new GeneralAssistant(servers, tools)
}

function initializeAgent(
  projectName: string,
  folders: string[],
  agentId: string,
  localStorageDB: LocalStorage
) {
  console.log('initializing Agent')
  const agent = createAgent(agentId, folders, localStorageDB)
  myAgentInstance = agent
  localStorage = localStorageDB
}

async function chatStream(
  event: IpcMainEvent,
  userQuery: string,
  previousResponseId: string | null,
  folders: string[],
  chatSessionFromForm: string,
  timeLastRequestFromForm: string,
  agentId: string
) {
  if (!localStorage) {
    throw new Error('LocalStorage not initialized in chatStream')
  }

  try {
    if (!myAgentInstance) {
      console.log('Creating new agent instance in chatStream')
      myAgentInstance = createAgent(agentId, folders, localStorage)
    } else {
      console.log('Using existing agent instance in chatStream')
    }

    const query = JSON.stringify({ userQuery: userQuery })

    const responseStream = await myAgentInstance.runStream(query, previousResponseId)

    if (!responseStream) {
      throw new Error('No response stream from agent')
    }

    for await (const chunk of responseStream) {
      const chunkStr = new TextDecoder().decode(chunk)
      event.sender.send('stream-chunk', chunkStr)
    }
  } catch (error) {
    console.error('chatStream error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error in chatStream'
    event.sender.send('stream-error', message)
  }
}

async function convertToTemplate(markdownContent: string, templateHtml: string): Promise<string> {
  const templateAgent = new TemplateAssistant()

  const query = JSON.stringify({ markdown: markdownContent, template: templateHtml })

  const rsp = await templateAgent.run(query, null)
  console.log('Template agent response: ', rsp)
  if (rsp && rsp.finalOutput) {
    return rsp.finalOutput
  } else {
    throw new Error('No response from template agent')
  }
}
// async function getChatLog(projectName: string): Promise<Conversation[]> {
//   const chatLogs: ChatLog[] = await getChatLogsByProject(projectName);
//   return chatLogs.map(log => ({
//     request: log.request_text || '',
//     response: {
//       response: {
//         message: log.response_text || '',
//         system_actions: [] as ChatActions[],
//         special_instructions: ''
//       },
//       lastResponseId: log.response_id,
//       error: false,
//     }
//   }));
// }

// export {getChatLog, initializeAgent, chatStream};

export { initializeAgent, chatStream, convertToTemplate }

const testResponse = {
  response: {
    message: 'This is a test response',
    system_actions: [] as ChatActions[],
    special_instructions: 'These are some special instructions.'
  },
  lastResponseId: 'test-response-id',
  error: false
}
