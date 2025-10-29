'use client';

import {useTheme} from 'next-themes';
import {Sun, Moon} from 'lucide-react';

export function ThemeToggle() {
  const {theme, setTheme} = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-gray-100" />
      ) : (
        <Moon className="h-5 w-5 text-gray-900" />
      )}
    </button>
  );
}