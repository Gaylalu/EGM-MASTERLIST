"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function Sidebar() {
  const { theme, setTheme } = useTheme();

  return (
    <aside className="w-64 min-h-screen bg-gray-100 dark:bg-gray-900 p-4 flex flex-col">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        ⚙️ Machines
      </h1>

      {/* Navigation */}
      <nav className="flex flex-col gap-3 flex-1">
        <Link
          href="/dashboard"
          className="px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
        >
          📊 Dashboard
        </Link>
        <Link
          href="/"
          className="px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100"
        >
          📋 Masterlist
        </Link>
      </nav>

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="mt-6 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        Toggle {theme === "dark" ? "Light" : "Dark"}
      </button>
    </aside>
  );
}
