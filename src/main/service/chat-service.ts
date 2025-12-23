'use server'

import { Conversation, ChatResponse, ChatSchema, ChatLog, ChatActions} from '../../types';
import { MyAgent } from '../../lib/openai';
import { IpcMainEvent } from 'electron';
import LocalStorage from '../../db/local';

let myAgentInstance: MyAgent | null = null;
let localStorage: LocalStorage | null = null;

function initializeAgent(projectName: string, folders: string[], agentId: string, localStorageDB: LocalStorage) {
  console.log('initializing Agent')
  const myAgent = new MyAgent(projectName, folders, agentId, localStorageDB);
  myAgentInstance = myAgent;
  localStorage = localStorageDB;
}

async function chatStream(event: IpcMainEvent, userQuery: string, previousResponseId: string | null, folders: string[], chatSessionFromForm: string, timeLastRequestFromForm: string, agentId: string) {
  if (!localStorage) {
    throw new Error("LocalStorage not initialized in chatStream");
  }

  try {
    if (!myAgentInstance) {
      console.log("Creating new agent instance in chatStream");
      myAgentInstance = new MyAgent("test stream", folders, agentId, localStorage);
    } else {
      console.log("Using existing agent instance in chatStream");
    }

    const query = JSON.stringify({"userQuery": userQuery});

    const responseStream = await myAgentInstance.runStream(query, previousResponseId);

    if (!responseStream) {
      throw new Error("No response stream from agent");
    }

    for await ( const chunk of responseStream ) {
      const chunkStr = new TextDecoder().decode(chunk);
      event.sender.send('stream-chunk', chunkStr);  
    }
  } catch (error) {
    console.error("chatStream error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error in chatStream';
    event.sender.send('stream-error', message);
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

export {initializeAgent, chatStream};

const testResponse = {
  response: {
    message: "This is a test response",
    system_actions: [] as ChatActions[],
    special_instructions: "These are some special instructions."
  },
  lastResponseId: "test-response-id",
  error: false
}