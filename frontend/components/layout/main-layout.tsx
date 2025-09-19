'use client';

import { ReactNode, useState } from 'react';
import { useSession } from 'next-auth/react';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { useIsMobile } from '@/hooks/use-responsive';

interface MainLayoutProps {
  children: ReactNode;
  currentChatId?: string;
  onSelectChat?: (chatId: string) => void;
  onNewChat?: () => void;
}

export default function MainLayout({ 
  children, 
  currentChatId, 
  onSelectChat, 
  onNewChat 
}: MainLayoutProps) {
  const { data: session } = useSession();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* 移动端遮罩层 */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* 侧边栏 - 只在用户登录时显示 */}
      {session && (
        <div className={`
          ${isMobile ? 'fixed left-0 top-0 h-full z-50' : 'relative'} 
          ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          transition-transform duration-300 ease-in-out
        `}>
          <ChatSidebar 
            currentChatId={currentChatId || ''} 
            onSelectChat={onSelectChat || (() => {})} 
            onNewChat={onNewChat || (() => {})}
          />
        </div>
      )}
      
      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 移动端顶部栏 */}
        {isMobile && session && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between transition-colors duration-300">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700 dark:text-gray-300">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">Wiley AI</h1>
            <div className="w-8"></div> {/* 占位符保持居中 */}
          </div>
        )}
        
        {children}
      </div>
    </div>
  );
}