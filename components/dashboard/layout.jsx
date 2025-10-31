"use client";

import { ThemeProvider } from "next-themes";
import { useState, useEffect } from "react";

export default function DashboardLayout({ children }) {
  const [mounted, setMounted] = useState(false);

  // Only render after mount to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
        <main className="p-6">{children}</main>
    </ThemeProvider>
  );
}
