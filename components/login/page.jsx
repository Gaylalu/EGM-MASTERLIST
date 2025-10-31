"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../providers";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // ✅ inline error message

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(""); // reset error message

    try {
      await supabase.auth.signOut();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Invalid email or password. Please try again.");
        setLoading(false);
        return;
      }

      // Fetch role + must_change_password
      const { data: teamMember, error: teamError } = await supabase
        .from("team")
        .select("role, must_change_password")
        .eq("email", email)
        .single();

      if (teamError || !teamMember) {
        setError("No team record found for this account.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      await login(data.user, teamMember.role);

      if (teamMember.must_change_password) {
        router.push("/change-password");
      } else {
        router.push("/team"); // ✅ Direct to Team/Org Chart after login
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <form
        onSubmit={handleLogin}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-semibold mb-4 text-center text-gray-900 dark:text-gray-100">
          Login
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-gray-100"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded-lg border dark:bg-gray-700 dark:text-gray-100"
          required
        />

        {error && (
          <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition"
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
