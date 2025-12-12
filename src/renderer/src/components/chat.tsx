
import useChat from '@renderer/hooks/use-chat';
import { useEffect, useState, useRef } from 'react';
import Loader from '@renderer/components/loader';
import useLogger from '@renderer/hooks/use-logger';
import SecondaryButton from '@renderer/components/button';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faUser,
  faRobot,
  faCircleExclamation, 
  faRefresh,
} from '@fortawesome/free-solid-svg-icons';
import {
  faPaperPlane
} from '@fortawesome/free-regular-svg-icons';
import { ChatResponse } from '../../../types';
import { Font } from 'ckeditor5';
import { kMaxLength } from 'buffer';
import { Chat } from 'openai/resources/index.mjs';

interface ChatWindowProps {
  loadDir: () => void;
  project: string;
  folders: string[] | null;
  onRequest: () => Promise<void>;
}

export default function ChatWindow({
    loadDir,
    project,
    onRequest,
    folders
}: ChatWindowProps) {
  const { 
    conversation, 
    chatIndex, 
    setChatIndex, 
    responseId, 
    isLoading: chatLoading, 
    error: chatError, 
    newChat, 
    chatRequestStream, 
    streamContent, 
    chatStreamAction, 
    lastUserQuery, 
    agentId, setAgentId } = useChat(project, folders);
  const logger = useLogger();
  const isLoading = chatLoading;

  // useEffect(() => {
  //   loadChatByProjectName(project);
  // }, [])

  // On response clear local edited files tracker and reload all files if changes by chat. 
  useEffect(() => {
    loadDir()
  }, [conversation])

  function handleNewChat() {
    newChat();
    logger.newSession();
  }

  const handleNewRequestStream = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    event.currentTarget.reset();
    const userRequest = formData.get('userQuery') as string;

    await onRequest();
    await chatRequestStream(userRequest, 'test-stream-project', folders || []);
  }

  return (
    <div className="w-full h-full flex flex-col justify-between">
      { agentId ? 
      <>
        <div className="overflow-y-auto text-sm">
          {(conversation.length > 0 && chatIndex < conversation.length - 1) ? 
          <ConversationUI userQuery={conversation[chatIndex]?.request || ''} chatResponse={conversation[chatIndex]?.response || {response: '', error: false}}/> : 
          <ConversationUI userQuery={lastUserQuery} chatResponse={{response: streamContent, error: false, lastResponseId: ''}} chatAction={chatStreamAction}/>}
        </div>
        <div className="mt-auto">
          <div className="flex flex-row gap-2 justify-center items-center my-2">
            {conversation.map((_, i) => (
              <button key={i} className={`w-2 h-2 bg-neutral-50 rounded-xl hover:bg-neutral-200 hover:w-3 hover:h-3 ${chatIndex === i ? 'bg-neutral-300 w-3 h-3' : ''}`} onClick={() => {setChatIndex(i)}}></button>
            ))}
          </div>
          <div className="flex flex-row gap-2 items-center mb-2">
            <button onClick={handleNewChat} className="underline text-sm hover:cursor-pointer items-center"><FontAwesomeIcon icon={faRefresh} /></button>
            <AgentPicker selectedAgent={agentId} onChangeAgent={setAgentId} />
          </div>
          <ChatForm onSubmit={handleNewRequestStream} isLoading={isLoading} responseId={responseId}/>
          {(chatError) && <div className="text-red-500">{chatError}</div>}    
        </div>
      </> : <AgentPicker selectedAgent={agentId || 'a0'} large onChangeAgent={setAgentId} />
      }
      
    </div>
  )
}

function ConversationUI({userQuery, chatResponse, chatAction = null}: {userQuery: string; chatResponse: ChatResponse; chatAction?: string | null}) {
  return (
    <div className="overflow-y-auto px-2">
      {userQuery.length > 0 && 
      <div className="py-2 w-[75%] ms-auto border-r border-neutral-50/50">
        <pre className="whitespace-pre-wrap text-stone-400 px-1">{userQuery}</pre>
      </div>}
      
      {chatAction && <div className="text-stone-400">{chatAction}</div>}
      {chatResponse.response.length > 0 && 
      <div className="py-2">
        {chatResponse?.error ? 
          <span className="text-red-500">Error processing your request.</span> : 
          <pre className="whitespace-pre-wrap text-stone-200 px-1">{chatResponse.response}</pre>}
      </div>}
    </div>
  )
}

function AgentPicker({ selectedAgent, onChangeAgent, large }: { selectedAgent: string; onChangeAgent: (agentId: string) => void, large?: boolean }) {
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const togglePicker = () => {
    setShowPicker(!showPicker);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChangeAgent = (agentId: string) => {
    console.log("Changing agent to ", agentId);
    onChangeAgent(agentId);
  };
  
  if ( large ) {
    return (
    <div ref={pickerRef} className="flex flex-col gap-2 items-center">
      <h2>Choose Agent</h2>
      <div className={`z-10 overflow-hidden transition-all duration-200 ease-in-out flex flex-row`}>
        <button className={`px-1 ${selectedAgent === 'a0' ? 'border' : ''}`} onClick={() => handleChangeAgent('a0')}>🧑‍🎓</button>
        <button className={`px-1 ${selectedAgent === 'a1' ? 'border' : ''}`} onClick={() => handleChangeAgent('a1')}>🧑‍🏫</button>
      </div>
    </div>
    )
  }
  return (
    <div ref={pickerRef} className="flex flex-row gap-2 items-center">
      <FontAwesomeIcon icon={faRobot} className="text-xl hover:cursor-pointer" onClick={togglePicker}/>
      <div className={`${showPicker ? 'w-20' : 'w-0'} z-10 overflow-hidden transition-all duration-200 ease-in-out flex flex-row`}>
        <button className={`px-1 ${selectedAgent === 'a0' ? 'border' : ''}`} onClick={() => handleChangeAgent('a0')}>🧑‍🎓</button>
        <button className={`px-1 ${selectedAgent === 'a1' ? 'border' : ''}`} onClick={() => handleChangeAgent('a1')}>🧑‍🏫</button>
      </div>
    </div>
  )
}

function ChatForm({onSubmit, isLoading, responseId}: {onSubmit: (event: React.FormEvent<HTMLFormElement>) => void, isLoading: boolean, responseId: string | null}) {
  return (
    <form onSubmit={onSubmit} className="rounded-lg p-2 pr-4 relative  bg-custom-gray-3 border border-custom-gray-1 h-12 focus-within:h-32 transition-all duration-200 ease-in-out">
      <textarea name="userQuery" className="chat-input" placeholder="Discuss with ChatGPT"></textarea>
      {responseId && <input type="hidden" name="previousResponseId" value={responseId}/>}
      <div className="absolute -top-4 -right-4"><SecondaryButton color="green" className="px-1 py-1 text-[20px]" disabled={isLoading}>{isLoading ? <Loader withText={false}/> : <FontAwesomeIcon icon={faPaperPlane} className="text-gray-800"/>}</SecondaryButton></div>
    </form>
  )
}