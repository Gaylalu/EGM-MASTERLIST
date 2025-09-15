"use client";

import "./globals.css";
import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";

export default function RootLayout({ children }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setMounted(true);
    // read saved theme
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  if (!mounted) return <html><body /></html>; // prevent hydration errors

  return (
    <html lang="en" className={theme}>
      <body className="flex bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {/* Sidebar */}
        <aside className="w-64 h-screen bg-gray-200 dark:bg-gray-800 p-4 flex flex-col justify-between">
          <div>
            <h1 className="text-xl font-bold mb-6">Machine Masterlist</h1>
            <nav className="space-y-3">
              <Link href="/" className="block px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700">
                Machines
              </Link>
              <Link href="/dashboard" className="block px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700">
                Dashboard
              </Link>
            </nav>
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-2 rounded bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600"
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
