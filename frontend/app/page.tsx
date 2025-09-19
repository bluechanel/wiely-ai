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
import { useSession } from 'next-auth/react'
import MainLayout from '@/components/layout/main-layout'
import { v4 as uuidv4 } from 'uuid'
import Link from 'next/link'

const initialMessages: UIMessage[] = [
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
    // 生成新的聊天ID
    const newChatId = uuidv4();
    setChatId(newChatId);
    // 清除本地存储的消息历史
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`chat-${newChatId}`);
      localStorage.setItem('lastChatId', newChatId);
    }
  };

  // 如果用户未登录，显示登录界面
  if (!session) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center transition-all duration-300">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center transition-all duration-300">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6">
              W
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              欢迎使用 Wiley AI
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              智能助手，随时为您提供帮助
            </p>
            <div className="space-y-3">
              <Link href="/login" className="block">
                <button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all">
                  登录
                </button>
              </Link>
              <Link href="/register" className="block">
                <button className="w-full border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-lg font-semibold hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                  注册账号
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <MainLayout 
        currentChatId={chatId} 
        onSelectChat={setChatId} 
        onNewChat={handleNewChat}
      >
        <Chat sessionId={chatId} />
      </MainLayout>
    </>
  )
}

function Chat({sessionId}: {sessionId: string}) {
  const handler = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    messages: initialMessages,
    id: sessionId,
  })
  
  return (
    <div className="h-full flex flex-col duration-300">
      <ChatSection
        handler={handler}
        className="h-full flex flex-col"
      >
        <div className="flex-1 flex flex-col min-h-0">
          <ChatMessages className="flex-1">
            <ChatMessages.List className="px-4 py-6 max-w-4xl mx-auto w-full">
              <CustomChatMessages />
            </ChatMessages.List>
          </ChatMessages>
          <div className="p-4">
            <div className="max-w-4xl mx-auto">
              <ChatInput>
                <ChatInput.Form>
                  <ChatInput.Field placeholder="Type your message..." />
                  <ChatInput.Submit />
                </ChatInput.Form>
              </ChatInput>
            </div>
          </div>
        </div>
        <ChatCanvas className="hidden" />
      </ChatSection>
    </div>
  )
}

function CustomChatMessages() {
  const { messages } = useChatUI()

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col justify-center pt-4 ">
        <h1 className="mb-2 text-3xl font-bold">
          Hello there!
        </h1>
        <h1 className="text-xl">
          I'm here to help you with your questions.
        </h1>
      </div>
    )
  }

  return (
    <>
      {messages.map((message, index) => (
        <ChatMessage
          key={index}
          message={message}
          isLast={index === messages.length - 1}
          className="mb-4"
        >
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
