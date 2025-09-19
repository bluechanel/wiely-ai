'use client';

import { useState } from 'react';

interface WelcomeScreenProps {
  onSendMessage: (message: string) => void;
  onStartChatting: () => void;
}

export default function WelcomeScreen({ onSendMessage, onStartChatting }: WelcomeScreenProps) {
  const [inputValue, setInputValue] = useState('');

  const suggestions = [
    {
      icon: '💡',
      title: '解释复杂概念',
      description: '用简单的语言解释量子计算',
    },
    {
      icon: '✍️',
      title: '帮助写作',
      description: '写一封专业的邮件',
    },
    {
      icon: '🧮',
      title: '解决问题',
      description: '帮我分析数据趋势',
    },
    {
      icon: '🎨',
      title: '创意灵感',
      description: '为我的项目想一些创新想法',
    },
  ];

  const handleSuggestionClick = (description: string) => {
    if (description.trim()) {
      onSendMessage(description);
      onStartChatting();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      onStartChatting();
      setInputValue('');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-4xl w-full">
        {/* 标题区域 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            W
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300">
            我们先从哪里开始呢？
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg transition-colors duration-300">
            我是您的AI助手，可以帮助您解答问题、完成任务
          </p>
        </div>

        {/* 建议卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion.description)}
              className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-left group"
            >
              <div className="flex items-start space-x-3">
                <div className="text-2xl">{suggestion.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">
                    {suggestion.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm transition-colors">
                    {suggestion.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 输入框 */}
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end space-x-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors duration-300">
              <div className="flex-1">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="询问任何问题..."
                  className="w-full resize-none border-none outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-transparent transition-colors duration-300"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22,2 15,22 11,13 2,9"></polygon>
                </svg>
              </button>
            </div>
          </form>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3 transition-colors duration-300">
            按 Enter 发送消息，Shift + Enter 换行
          </p>
        </div>
      </div>
    </div>
  );
}