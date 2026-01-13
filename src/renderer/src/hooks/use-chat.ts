// import { getChatLog, initializeAgent, chatStream } from '/services/chat-service';
import { ChatResponse, Conversation } from '../../../types'
import { useEffect, useState, useCallback, useContext, useRef } from 'react'
import { ChatSessionContext } from '@renderer/components/session'

export default function useChat(projectDirectory: string, folders: string[] | null) {
  const [conversation, setConversation] = useState<Conversation[]>([])
  const [responseId, setResponseId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [chatIndex, setChatIndex] = useState<number>(0)
  const [timeLastRequest, setTimeLastRequest] = useState<string>(new Date().toISOString())
  const { sessionValue, updateSession } = useContext(ChatSessionContext)
  const [streamContent, setStreamContent] = useState<string>('')
  const [chatStreamAction, setChatStreamAction] = useState<string | null>(null)
  const [lastUserQuery, setLastUserQuery] = useState<string>('')
  const streamCount = useRef<number>(0)
  const [agentId, setAgentId] = useState<string | null>(null)

  useEffect(() => {
    console.log(
      'Initializing agent in useChat with projectDirectory:',
      projectDirectory,
      'folders:',
      folders,
      'agentId:',
      agentId
    )
    if (folders)
      window.electron.ipcRenderer.invoke('initialize-agent', projectDirectory, folders, agentId)
  }, [projectDirectory, folders, agentId]) // Re-initialize agent when project directory changes

  const newChat = useCallback(() => {
    setConversation([])
    setLastUserQuery('')
    setChatStreamAction(null)
    setStreamContent('')
    setResponseId(null)
    setChatIndex(0)
  }, [])

  useEffect(() => {
    const { ipcRenderer } = window.electron

    const chunkQueue: string[] = []

    const handleChunk = (_event: unknown, chunk: string) => {
      while (chunk) {
        const colonIndex = chunk.indexOf(':')
        if (colonIndex === -1) {
          // Incomplete chunk length, wait for more data
          break
        }

        const lengthStr = chunk.slice(0, colonIndex)
        const length = parseInt(lengthStr, 10)
        if (isNaN(length)) {
          console.error('Invalid chunk length:', lengthStr)
          break
        }

        if (chunk.length < colonIndex + 1 + length) {
          // Incomplete chunk data, wait for more data
          break
        }

        const completeChunk = chunk.slice(colonIndex + 1, colonIndex + 1 + length)
        chunkQueue.push(completeChunk)

        // Remove processed chunk from the original chunk
        chunk = chunk.slice(colonIndex + 1 + length)
      }

      const parsedChunk = JSON.parse(chunkQueue.shift() || '{}')

      console.log('Received stream chunk: ', parsedChunk, { depth: null })

      if (parsedChunk.message_chunk) {
        setStreamContent((prev) => prev + parsedChunk.message_chunk)
      } else if (parsedChunk.using_tool) {
        setChatStreamAction(parsedChunk.using_tool)
      } else if (parsedChunk.modelAction) {
        setChatStreamAction(parsedChunk.modelAction)
      } else if (parsedChunk.final) {
        setResponseId(parsedChunk.final.lastResponseId)
        setTimeLastRequest(new Date().toISOString())

        setConversation((prevConversation) => {
          const chatResponse: ChatResponse = {
            response: parsedChunk.final.finalOutput,
            lastResponseId: parsedChunk.final.lastResponseId,
            error: false
          }

          const newConversation: Conversation = {
            request: parsedChunk.final.originalQuery,
            response: chatResponse
          }

          setChatIndex(prevConversation.length) // +1 for new entry but -1 for 0 index.
          const nextConversation = [...prevConversation, newConversation]
          return nextConversation
        })
      }
    }

    const handleEnd = () => {
      setChatStreamAction('Completed')
    }

    if (streamCount.current < 1) {
      // Defensive: clear any prior listeners that may linger after HMR/StrictMode mount cycles
      ipcRenderer.on('stream-chunk', handleChunk)
      ipcRenderer.on('stream-end', handleEnd)
      streamCount.current += 1
    }

    return () => {
      // ipcRenderer.removeAllListeners('stream-chunk');
      // ipcRenderer.removeAllListeners('stream-end');
      ipcRenderer.removeListener('stream-chunk', handleChunk)
      ipcRenderer.removeListener('stream-end', handleEnd)
    }
  }, [])

  const chatRequestStream = useCallback(
    async (userQuery: string, projectName: string, folders: string[]) => {
      setIsLoading(true)
      setStreamContent('')
      setChatStreamAction(null)
      setLastUserQuery(userQuery)

      setChatStreamAction('Sending Request To AI...')

      try {
        window.electron.ipcRenderer.send(
          'chat-stream',
          userQuery,
          responseId,
          folders,
          sessionValue,
          timeLastRequest
        )
      } catch (error) {
        console.error('Streaming error:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [responseId, timeLastRequest, sessionValue]
  )

  return {
    conversation,
    setConversation,
    responseId,
    setResponseId,
    chatIndex,
    setChatIndex,
    isLoading,
    error,
    // loadChatByProjectName,
    newChat,
    chatRequestStream,
    streamContent,
    chatStreamAction,
    lastUserQuery,
    agentId,
    setAgentId
  }
}
