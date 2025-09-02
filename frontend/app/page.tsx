'use client'

import {
  ChatCanvas,
  ChatInput,
  ChatMessage,
  ChatMessages,
  ChatSection,
  useChatUI,
} from '@llamaindex/chat-ui'
import { UIMessage, useChat } from '@ai-sdk/react'
import { WeatherPart } from '@/components/custom-weather'
import { DefaultChatTransport } from 'ai'
import { WikiPart } from '../components/custom-wiki'
import { useState, useEffect } from 'react'
import Navbar from '@/components/navbar'
import { useSession } from 'next-auth/react'
import ChatSidebar from '@/components/chat/chat-sidebar'
import ChatHeader from '@/components/chat/chat-header'
import { v4 as uuidv4 } from 'uuid'

const initialMessages: UIMessage[] = [
  {
    id: '1',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: 'Hello! How can I help you today?',
      },
    ],
  },
]

export default function Page(){
  const [chatId, setChatId] = useState(() => {
    // 尝试从本地存储获取最后使用的聊天ID，如果没有则创建新的
    if (typeof window !== 'undefined') {
      const lastChatId = localStorage.getItem('lastChatId');
      return lastChatId || uuidv4();
    }
    return uuidv4();
  });
  const { data: session } = useSession()
  
  // 保存最后使用的聊天ID到本地存储
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastChatId', chatId);
    }
  }, [chatId]);

  // 创建新聊天的处理函数
  const handleNewChat = () => {
    // 重置聊天状态，但保持相同的chatId
    window.location.reload();
  };

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <header className="w-full border-b p-4 text-center">
        <h1 className="text-2xl font-bold">
          Wiley AI - 智能助手
        </h1>
        <p className="text-gray-600">
          {session ? `欢迎回来，${session.user?.email}` : '请登录以获得完整体验'}
        </p>
      </header>
      <div className="min-h-0 flex-1 flex">
        {session && (
          <ChatSidebar 
            currentChatId={chatId} 
            onSelectChat={setChatId} 
            onNewChat={handleNewChat}
          />
        )}
        <div className="flex-1">
          <ChatExample sessionId={chatId} />
        </div>
      </div>
    </div>
  )
}

function ChatExample({sessionId}: {sessionId: string}) {
  const handler = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    messages: initialMessages,
    id: sessionId,
  })

  return (
    <ChatSection
      handler={handler}
      className="block h-full flex-row gap-4 p-0 md:flex md:p-5"
    >
      <div className="md:max-w-1/2 mx-auto flex h-full min-w-0 max-w-full flex-1 flex-col gap-4">
        <div className="sticky top-0 bg-white z-10">
          <ChatHeader chatId={sessionId} />
        </div>
        <ChatMessages>
          <ChatMessages.List className="px-4 py-6">
            <CustomChatMessages />
          </ChatMessages.List>
        </ChatMessages>
        <div className="border-t p-4">
          <ChatInput>
            <ChatInput.Form>
              <ChatInput.Field placeholder="输入消息..." />
              <ChatInput.Submit />
            </ChatInput.Form>
          </ChatInput>
        </div>
      </div>
      <ChatCanvas className="w-full md:w-2/3" />
    </ChatSection>
  )
}

function CustomChatMessages() {
  const { messages } = useChatUI()

  return (
    <>
      {messages.map((message, index) => (
        <ChatMessage
          key={index}
          message={message}
          isLast={index === messages.length - 1}
          className="mb-4"
        >
          <ChatMessage.Avatar>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-semibold text-white">
              {message.role === 'user' ? 'U' : 'AI'}
            </div>
          </ChatMessage.Avatar>
          <ChatMessage.Content>
            <ChatMessage.Part.File />
            <ChatMessage.Part.Event />
            <ChatMessage.Part.Markdown />
            <ChatMessage.Part.Artifact />
            <ChatMessage.Part.Source />
            <ChatMessage.Part.Suggestion />
            <WikiPart />
            <WeatherPart />
          </ChatMessage.Content>
          <ChatMessage.Actions />
        </ChatMessage>
      ))}
    </>
  )
}
