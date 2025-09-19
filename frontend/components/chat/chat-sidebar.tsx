'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

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
    // 检查当前聊天是否为空（没有实际对话内容）
    const hasCurrentChatContent = chatSessions.some(chat => chat.id === currentChatId);
    
    // 如果当前没有选中的聊天或者当前聊天已有内容，才创建新聊天
    if (!currentChatId || hasCurrentChatContent) {
      const newChatId = uuidv4();
      const newChat: ChatSession = {
        id: newChatId,
        title: `新对话 ${new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        createdAt: new Date(),
      };
      
      setChatSessions(prev => [newChat, ...prev]);
      onSelectChat(newChatId);
      onNewChat();
    } else {
      // 如果当前聊天为空，直接切换到欢迎界面
      onNewChat();
    }
  };

  // 删除聊天
  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 检查是否为最新的空聊天（不能删除）
    const chatToDelete = chatSessions.find(chat => chat.id === chatId);
    const isNewestChat = chatSessions[0]?.id === chatId;
    
    // 如果是最新的聊天且当前没有其他聊天，不允许删除
    if (isNewestChat && chatSessions.length === 1) {
      return;
    }
    
    setChatSessions(prev => prev.filter(chat => chat.id !== chatId));
    
    // 如果删除的是当前聊天，切换到第一个可用的聊天或创建新聊天
    if (chatId === currentChatId) {
      const remainingChats = chatSessions.filter(chat => chat.id !== chatId);
      if (remainingChats.length > 0) {
        onSelectChat(remainingChats[0].id);
      } else {
        createNewChat();
      }
    }
  };

  return (
    <div className={`flex flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white ${isCollapsed ? 'w-16' : 'w-64'} h-full transition-all duration-300`}>
      {/* 顶部区域 - Logo和折叠按钮 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              W
            </div>
            <span className="ml-2 font-semibold text-lg text-gray-900 dark:text-white">Wiley AI</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-sm mx-auto">
            W
          </div>
        )}
        
        {/* 折叠按钮 - 只在展开状态显示 */}
        {!isCollapsed && (
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="收起侧边栏"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 17 6 12 11 7"></polyline>
              <polyline points="18 17 13 12 18 7"></polyline>
            </svg>
          </button>
        )}
      </div>
      
      {/* 收起状态下的展开按钮 */}
      {isCollapsed && (
        <div className="p-2">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
            title="展开侧边栏"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="13 17 18 12 13 7"></polyline>
              <polyline points="6 17 11 12 6 7"></polyline>
            </svg>
          </button>
        </div>
      )}
      
      {/* 新建聊天按钮 */}
      <div className="p-3">
        <button
          onClick={createNewChat}
          className={`w-full flex items-center p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-300 dark:border-gray-600 ${isCollapsed ? 'justify-center' : 'justify-start'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
            <path d="M2 17l10 5 10-5"></path>
            <path d="M2 12l10 5 10-5"></path>
          </svg>
          {!isCollapsed && <span className="ml-3 text-sm font-medium">新建聊天</span>}
        </button>
      </div>
      
      {/* 聊天历史列表 */}
      <div className="flex-1 overflow-y-auto px-2 sidebar-scroll">
        <div className="space-y-1">
          {chatSessions.map((chat, index) => (
            <div 
              key={chat.id} 
              onClick={() => onSelectChat(chat.id)}
              className={`group flex items-center justify-between p-3 cursor-pointer rounded-lg transition-colors ${
                currentChatId === chat.id 
                  ? 'bg-gray-200 dark:bg-gray-600' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center w-full' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                {!isCollapsed && (
                  <span className="ml-3 text-sm truncate flex-1">{chat.title}</span>
                )}
              </div>
              
              {!isCollapsed && (
                // 只有在不是最后一个聊天或者有多个聊天时才显示删除按钮
                (chatSessions.length > 1 || index > 0) && (
                  <button 
                    onClick={(e) => deleteChat(chat.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-all flex-shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* 底部用户信息和设置 */}
      <div className="border-t border-gray-200 dark:border-gray-600 p-3">
        {!isCollapsed ? (
          <div className="space-y-2">
            {/* 用户信息 */}
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <div className="w-8 h-8 bg-gray-400 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <span className="ml-2 truncate">{session?.user?.email}</span>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex space-x-1">
              <Link href="/profile" className="flex-1">
                <button className="w-full p-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors">
                  个人资料
                </button>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex-1 p-2 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                注销
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-2 items-center">
            <div className="w-8 h-8 bg-gray-400 dark:bg-gray-600 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
              title="注销"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-300">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}