'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface ChatHeaderProps {
  chatId: string;
}

export default function ChatHeader({ chatId }: ChatHeaderProps) {
  const [title, setTitle] = useState<string>('');
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.email) {
      // 从本地存储获取聊天会话
      const savedSessions = localStorage.getItem(`chat-sessions-${session.user.email}`);
      if (savedSessions) {
        try {
          const parsedSessions = JSON.parse(savedSessions);
          const currentChat = parsedSessions.find((chat: any) => chat.id === chatId);
          if (currentChat) {
            setTitle(currentChat.title);
          } else {
            setTitle('新对话');
          }
        } catch (error) {
          console.error('Failed to parse saved sessions:', error);
          setTitle('新对话');
        }
      } else {
        setTitle('新对话');
      }
    }
  }, [chatId, session]);

  return (
    <div className="p-2 border-b">
      <h2 className="text-lg font-medium truncate">{title}</h2>
    </div>
  );
}