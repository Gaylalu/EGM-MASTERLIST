"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function SignupPage() {
  const router = useRouter();
  const [roleCheckDone, setRoleCheckDone] = useState(false);
  const [allowSignup, setAllowSignup] = useState(false);
  const [creator, setCreator] = useState(null); // who creates the account
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "System Support",
    id_number: "",
  });

  useEffect(() => {
    async function checkPermission() {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      // CASE 1: No logged-in user → allow signup (public registration)
      if (!session) {
        setAllowSignup(true);
        setCreator("Self-Registered");
        setRoleCheckDone(true);
        return;
      }

      // CASE 2: Logged-in user → check role in "team" table
      const userEmail = session.user.email;
      const { data: member } = await supabase
        .from("team")
        .select("role, name")
        .eq("email", userEmail)
        .single();

      // Roles that can create users
      if (["Super Admin", "Manager", "Supervisor", "Senior"].includes(member?.role)) {
        setAllowSignup(true);
        setCreator(member?.name || userEmail);
      } else {
        toast.error("You are not allowed to create accounts.");
        router.push("/dashboard");
      }

      setRoleCheckDone(true);
    }

    checkPermission();
  }, [router]);

  const handleSignup = async (e) => {
    e.preventDefault();
    const { name, email, password, role, id_number } = form;

    // 1️⃣ Create Auth Account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    // 2️⃣ Insert into "team" table
    const { error: insertError } = await supabase.from("team").insert([
      {
        name,
        role,
        id_number,
        email,
        created_by: creator, // track who created
      },
    ]);

    if (insertError) toast.error(insertError.message);
    else {
      toast.success("User created successfully!");
      setTimeout(() => router.push("/login"), 1500);
    }
  };

  if (!roleCheckDone) return <div className="p-6">Checking permission...</div>;
  if (!allowSignup) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <Toaster />
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg w-96">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
          Create Account
        </h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Name"
            className="w-full p-2 border rounded-lg"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="ID Number"
            className="w-full p-2 border rounded-lg"
            onChange={(e) => setForm({ ...form, id_number: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full p-2 border rounded-lg"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-2 border rounded-lg"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select
            className="w-full p-2 border rounded-lg"
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option>System Support</option>
            <option>Supervisor</option>
            <option>Senior</option>
            <option>Manager</option>
            <option>Super Admin</option>
          </select>
          <button
            type="submit"
            className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
}
