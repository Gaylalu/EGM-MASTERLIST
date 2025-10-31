"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleReset = async () => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated!");
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Toaster />
      <div className="bg-white p-6 rounded-xl shadow-lg w-96">
        <h1 className="text-xl font-bold mb-4 text-center">
          Reset Your Password
        </h1>
        <input
          type="password"
          placeholder="New password"
          className="w-full p-2 border rounded-lg mb-4"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={handleReset}
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
        >
          Update Password
        </button>
      </div>
    </div>
  );
}
