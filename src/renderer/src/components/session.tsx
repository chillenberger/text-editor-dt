'use client';
import { createContext, useState } from "react";

const ChatSessionContext = createContext({sessionValue: Math.random().toString(36).substring(2), updateSession: () => {}})

export default function ChatSessionContextProvider(props: {children: React.ReactNode}) {
  const [sessionValue, setSessionValue] = useState(Math.random().toString(36).substring(2));

  const updateSession = () => {
    setSessionValue(Math.random().toString(36).substring(2));
  }

  const sessionValueObj = {
    sessionValue: sessionValue,
    updateSession,
  }


  return (
    <ChatSessionContext.Provider value={sessionValueObj}>
      {props.children}
    </ChatSessionContext.Provider>
  )
}

export { ChatSessionContext };