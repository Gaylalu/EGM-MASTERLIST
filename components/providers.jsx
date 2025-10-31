"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const AuthContext = createContext();

// ✅ Normalize user roles
function normalizeRole(rawRole = "") {
  const r = rawRole.toLowerCase();

  if (r.includes("super admin")) return "Super Admin";
  if (r.includes("assistant manager")) return "Manager";
  if (r.includes("manager")) return "Manager";
  if (r.includes("supervisor")) return "Supervisor";
  if (r.includes("senior")) return "Senior";
  if (r.includes("system support")) return "System Support";

  return "System Support"; // fallback
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [name, setName] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forcePasswordChange, setForcePasswordChange] = useState(false); // ✅ NEW
  const router = useRouter();

  // ✅ Login method
  const login = async (userData, userRole) => {
    const normalizedRole = normalizeRole(userRole);
    setUser(userData);
    setRole(normalizedRole);
    localStorage.setItem("userRole", normalizedRole);
    localStorage.setItem("userEmail", userData?.email);

    // Check password change flag
    if (userData?.user_metadata?.forcePasswordChange) {
      setForcePasswordChange(true);
    } else {
      setForcePasswordChange(false);
    }
  };

  // ✅ Logout method
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setName(null);
    setImage(null);
    setForcePasswordChange(false);
    localStorage.clear();
    toast.success("👋 Logged out successfully");
    router.push("/login");
  };

  // ✅ Fetch user info from "team" table
  const fetchTeamInfo = async (email) => {
    const { data, error } = await supabase
      .from("team")
      .select("name, role, image_url")
      .eq("email", email)
      .single();

    if (error || !data) {
      console.warn("⚠️ No team record found for:", email);
      return;
    }

    const normalizedRole = normalizeRole(data.role);
    setRole(normalizedRole);
    setName(data.name);
    setImage(data.image_url || null);

    localStorage.setItem("userRole", normalizedRole);
    localStorage.setItem("userName", data.name);
    localStorage.setItem("userImage", data.image_url || "");
  };

  // ✅ Initialize session + listen for auth changes
  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const userData = session.user;
        setUser(userData);
        setForcePasswordChange(!!userData?.user_metadata?.forcePasswordChange);

        const storedRole = localStorage.getItem("userRole");
        const storedName = localStorage.getItem("userName");
        const storedImage = localStorage.getItem("userImage");

        if (storedRole) setRole(storedRole);
        if (storedName) setName(storedName);
        if (storedImage) setImage(storedImage);

        await fetchTeamInfo(userData.email);
      }

      setLoading(false);
    };

    loadSession();

    // 🔁 Listen for Supabase auth events
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setRole(null);
          setName(null);
          setImage(null);
          setForcePasswordChange(false);
          localStorage.clear();
          router.push("/login");
        } else if (session?.user) {
          const userData = session.user;
          setUser(userData);
          setForcePasswordChange(!!userData?.user_metadata?.forcePasswordChange);
          await fetchTeamInfo(userData.email);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        name,
        image,
        login,
        logout,
        setUser,
        setRole,
        loading,
        forcePasswordChange,
        setForcePasswordChange, // ✅ add these two
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ✅ Custom hook
export const useAuth = () => useContext(AuthContext);
