"use client";

import "./globals.css";
import { useState, useEffect } from "react";
import Sidebar from "./sidebar";
import { AuthProvider, useAuth } from "./providers";
import { usePathname } from "next/navigation";
import ChangePasswordDialog from "../components/ChangePasswordDialog";
import { Toaster } from "react-hot-toast"; // ✅ Add this import

function LayoutContent({ children, theme, setTheme }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [checkedUser, setCheckedUser] = useState(false);

  useEffect(() => {
    if (!loading) {
      const forceFlag =
        user?.user_metadata?.forcePasswordChange ||
        user?.app_metadata?.forcePasswordChange;
      setForcePasswordChange(!!forceFlag);
      setCheckedUser(true);
    }
  }, [user, loading]);

  if (!checkedUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-100">
        Loading...
      </div>
    );
  }

  const hideSidebar =
    !user ||
    ["/login", "/signup", "/reset-password"].some((path) =>
      pathname.startsWith(path)
    );

  const mainClasses = hideSidebar
    ? "flex-1 p-6 overflow-y-auto"
    : "flex-1 p-6 overflow-y-auto ml-64";

  return (
    <div className="flex bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen relative">
      {!hideSidebar && !forcePasswordChange && (
        <Sidebar theme={theme} setTheme={setTheme} />
      )}

      <main className={mainClasses}>{children}</main>

      {user && forcePasswordChange && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <ChangePasswordDialog
            user={user}
            onPasswordChanged={() => setForcePasswordChange(false)}
          />
        </div>
      )}
    </div>
  );
}

export default function RootLayout({ children }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);

  if (!mounted)
    return (
      <html>
        <body />
      </html>
    );

  return (
    <html lang="en" className={theme}>
      <body>
        <AuthProvider>
          <LayoutContent theme={theme} setTheme={setTheme}>
            {children}
          </LayoutContent>
          <Toaster position="top-center" reverseOrder={false} /> {/* ✅ Added here */}
        </AuthProvider>
      </body>
    </html>
  );
}
