'use client';

import {
  ChatCanvas,
  ChatInput,
  ChatMessage,
  ChatMessages,
  ChatSection,
  useChatUI,
} from '@llamaindex/chat-ui';
import {useChat} from '@ai-sdk/react';
import {WeatherPart} from '@/components/custom-weather';
import {DefaultChatTransport} from 'ai';
import {WikiPart} from '@/components/custom-wiki';

export default function Page() {
  const handler = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-300">
      <ChatSection handler={handler} className="h-full flex flex-col">
        <div className="flex-1 flex flex-col min-h-0">
          <ChatMessages className="flex-1">
            <ChatMessages.List className="px-4 py-6 max-w-4xl mx-auto w-full">
              <CustomChatMessages />
            </ChatMessages.List>
          </ChatMessages>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-4xl mx-auto">
              <ChatInput>
                <ChatInput.Form>
                  <ChatInput.Field
                    placeholder="输入您的问题..."
                    className="dark:bg-gray-800 dark:text-white"
                  />
                  <ChatInput.Submit />
                </ChatInput.Form>
              </ChatInput>
            </div>
          </div>
        </div>
        <ChatCanvas className="hidden" />
      </ChatSection>
    </div>
  );
}

function CustomChatMessages() {
  const {messages} = useChatUI();

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col justify-center items-center pt-4 text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-6">
          W
        </div>
        <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">
          欢迎使用 Wiley AI
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          我在这里帮助您解答问题
        </p>
      </div>
    );
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
  );
}
