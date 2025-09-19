'use client';

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
  <div className="absolute right-0 flex items-center">
    {theme === "dark" ? (
      <button className="p-2 rounded-full hover:bg-gray-700" onClick={() => setTheme("light")}>
        <Sun className="h-5 w-5 text-gray-100" />
      </button>
    ) : (
      <button className="p-2 rounded-full hover:bg-gray-200" onClick={() => setTheme("dark")}>
        <Moon className="h-5 w-5 text-gray-900" />
      </button>
    )}
  </div>
);
}