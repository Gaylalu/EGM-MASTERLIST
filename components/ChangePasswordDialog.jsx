"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../app/providers";
import toast from "react-hot-toast";

export default function ChangePasswordDialog() {
  const { user, setForcePasswordChange } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) return null;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!newPassword || !confirmPassword) {
      setError("Please fill out all fields.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    // Timeout protection: avoid getting stuck
    const timeout = setTimeout(() => {
      setError("Request timed out. Please try again.");
      setLoading(false);
    }, 8000);

    try {
      console.log("🔹 Attempting password update...");

      // Refresh session first to avoid invalid token
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        clearTimeout(timeout);
        setError("Session expired. Please log in again.");
        setLoading(false);
        await supabase.auth.signOut();
        window.location.href = "/login";
        return;
      }

      // Attempt to update the password
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { forcePasswordChange: false },
      });

      console.log("🔹 Supabase response:", { data, error });

      clearTimeout(timeout);

      if (error) {
        if (error.message.includes("different from the old password")) {
          setError("New password must be different from the old one.");
        } else {
          setError(error.message);
        }
        setLoading(false);
        return;
      }

      // ✅ Success: clear the forcePasswordChange flag locally
      setForcePasswordChange(false);
      toast.success("Password changed successfully! Please log in again.");

      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err) {
      console.error("Unexpected error:", err);
      clearTimeout(timeout);
      setError("Something went wrong while updating password.");
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }

    // ✅ Inside handleChangePassword (after successful password update)
    if (!error) {
    // Clear the flag in Supabase Auth metadata
    const { error: metaError } = await supabase.auth.updateUser({
        data: { forcePasswordChange: false },
    });

    if (metaError) {
        console.warn("Metadata update failed:", metaError.message);
    }

    setForcePasswordChange(false);
    toast.success("Password changed successfully! Please log in again.");

    await supabase.auth.signOut();
    window.location.href = "/login";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white p-6 rounded-xl w-full max-w-md shadow-lg border border-gray-700">
        <h2 className="text-xl font-semibold mb-2 text-center">
          ⚠️ Password Change Required
        </h2>
        <p className="text-sm text-gray-400 mb-4 text-center">
          You must change your password before continuing.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 focus:outline-none focus:ring focus:ring-blue-500"
              placeholder="Enter new password"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 focus:outline-none focus:ring focus:ring-blue-500"
              placeholder="Re-enter password"
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
