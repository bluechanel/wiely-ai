'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';

interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
}

export default function ChatSidebar({
  currentChatId,
  onSelectChat,
  onNewChat,
}: {
  currentChatId: string;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  // 从本地存储加载聊天会话
  useEffect(() => {
    if (session?.user?.email) {
      const savedSessions = localStorage.getItem(`chat-sessions-${session.user.email}`);
      if (savedSessions) {
        try {
          const parsedSessions = JSON.parse(savedSessions);
          setChatSessions(parsedSessions.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt)
          })));
        } catch (error) {
          console.error('Failed to parse saved sessions:', error);
        }
      }
    }
  }, [session]);

  // 保存聊天会话到本地存储
  useEffect(() => {
    if (session?.user?.email && chatSessions.length > 0) {
      localStorage.setItem(`chat-sessions-${session.user.email}`, JSON.stringify(chatSessions));
    }
  }, [chatSessions, session]);

  // 创建新聊天
  const createNewChat = () => {
    const newChatId = uuidv4();
    const newChat: ChatSession = {
      id: newChatId,
      title: `新对话 ${new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      createdAt: new Date(),
    };
    
    setChatSessions(prev => [newChat, ...prev]);
    onSelectChat(newChatId);
    onNewChat();
  };

  // 删除聊天
  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatSessions(prev => prev.filter(chat => chat.id !== chatId));
    
    // 如果删除的是当前聊天，创建一个新的
    if (chatId === currentChatId) {
      createNewChat();
    }
  };

  return (
    <div className={`flex flex-col border-r bg-gray-50 ${isCollapsed ? 'w-16' : 'w-64'} h-full transition-all duration-300`}>
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className={`font-semibold ${isCollapsed ? 'hidden' : 'block'}`}>聊天历史</h2>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md hover:bg-gray-200"
        >
          {isCollapsed ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7"></polyline>
              <polyline points="6 17 11 12 6 7"></polyline>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7"></polyline>
              <polyline points="18 17 13 12 18 7"></polyline>
            </svg>
          )}
        </button>
      </div>
      
      <div className="p-2">
        <button
          onClick={createNewChat}
          className={`w-full flex items-center justify-center p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors ${isCollapsed ? 'px-2' : 'px-4'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          {!isCollapsed && <span className="ml-2">新建聊天</span>}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {chatSessions.map((chat) => (
          <div 
            key={chat.id} 
            onClick={() => onSelectChat(chat.id)}
            className={`flex items-center justify-between p-3 cursor-pointer hover:bg-gray-200 ${currentChatId === chat.id ? 'bg-gray-200' : ''}`}
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              {!isCollapsed && (
                <span className="ml-2 text-sm truncate">{chat.title}</span>
              )}
            </div>
            
            {!isCollapsed && (
              <button 
                onClick={(e) => deleteChat(chat.id, e)}
                className="p-1 rounded-full hover:bg-gray-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}