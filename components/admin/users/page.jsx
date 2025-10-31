"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../providers";
import { supabase } from "../../../lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";

const SUPER_ADMIN_EMAIL = "markjoshuareyno@gmail.com"; // hidden from lists

export default function UsersAdminPage() {
  const { user, role, loading } = useAuth();
  const [members, setMembers] = useState([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "System Support",
    id_number: "",
    contact: "",
    image_url: "",
    level: 99,
    position: 999,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !["Super Admin", "Manager", "Supervisor", "Senior"].includes(role)) {
      // not authorized: redirect to dashboard
      window.location.href = "/dashboard";
    }
  }, [loading, role]);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const { data, error } = await supabase
        .from("team")
        .select("*")
        .order("level", { ascending: true })
        .order("position", { ascending: true });

      if (error) throw error;
      // hide super admin
      setMembers((data || []).filter((m) => m.email !== SUPER_ADMIN_EMAIL));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load users");
    }
  }

  const filtered = members.filter(
    (m) =>
      !q ||
      (m.name && m.name.toLowerCase().includes(q.toLowerCase())) ||
      (m.email && m.email.toLowerCase().includes(q.toLowerCase())) ||
      (m.role && m.role.toLowerCase().includes(q.toLowerCase()))
  );

  function openAdd() {
    setForm({
      name: "",
      email: "",
      role: "System Support",
      id_number: "",
      contact: "",
      image_url: "",
      level: 99,
      position: 999,
      password: "",
    });
    setModalMode("add");
    setSelected(null);
  }

  function openEdit(m) {
    setForm({ ...m });
    setModalMode("edit");
    setSelected(m);
  }

  async function handleCreateOrUpdate(e) {
    e?.preventDefault();
    setBusy(true);
    try {
      if (modalMode === "add") {
        // call server create
        const res = await fetch("/api/users/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.message || "Create failed");
        toast.success("User created");
      } else if (modalMode === "edit") {
        const res = await fetch("/api/users/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.message || "Update failed");
        toast.success("User updated");
      }
      await fetchMembers();
      setModalMode(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(m) {
    if (!confirm(`Delete ${m.name}? This will remove their team entry and delete their auth user.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, email: m.email }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Delete failed");
      toast.success("Deleted");
      await fetchMembers();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <Toaster />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex gap-2">
          <input
            placeholder="Search name, email, role..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border p-2 rounded"
          />
          <button onClick={openAdd} className="px-3 py-2 bg-green-600 text-white rounded">
            Add User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map((m) => (
          <div key={m.id} className="p-4 border rounded shadow bg-white dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                {m.image_url ? <img src={m.image_url} alt={m.name} className="w-full h-full object-cover"/> : null}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{m.name}</div>
                <div className="text-sm text-gray-500">{m.email}</div>
                <div className="text-xs text-gray-400">{m.role}</div>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={() => openEdit(m)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
              <button onClick={() => handleDelete(m)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <form
            onSubmit={handleCreateOrUpdate}
            className="bg-white dark:bg-gray-800 p-6 rounded w-full max-w-2xl"
          >
            <h2 className="text-xl font-semibold mb-4">{modalMode === "add" ? "Create User" : "Edit User"}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input required placeholder="Name" value={form.name || ""} onChange={(e) => setForm({...form,name:e.target.value})} className="border p-2 rounded" />
              <input required placeholder="Email" value={form.email || ""} onChange={(e) => setForm({...form,email:e.target.value})} className="border p-2 rounded" />
              <input placeholder="ID Number" value={form.id_number || ""} onChange={(e) => setForm({...form,id_number:e.target.value})} className="border p-2 rounded" />
              <input placeholder="Contact" value={form.contact || ""} onChange={(e) => setForm({...form,contact:e.target.value})} className="border p-2 rounded" />
              <select value={form.role || "System Support"} onChange={(e)=>setForm({...form,role:e.target.value})} className="border p-2 rounded">
                <option>System Support</option>
                <option>Supervisor</option>
                <option>Senior</option>
                <option>Manager</option>
                <option>Super Admin</option>
              </select>
              <input type="number" placeholder="Level" value={form.level || ""} onChange={(e)=>setForm({...form,level: Number(e.target.value)})} className="border p-2 rounded" />
              <input type="number" placeholder="Position" value={form.position || ""} onChange={(e)=>setForm({...form,position: Number(e.target.value)})} className="border p-2 rounded" />
              <input placeholder="Image URL" value={form.image_url || ""} onChange={(e)=>setForm({...form,image_url:e.target.value})} className="border p-2 rounded" />
              {modalMode === "add" && (
                <input required placeholder="Password" value={form.password || ""} onChange={(e)=>setForm({...form,password:e.target.value})} className="border p-2 rounded" />
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={()=>setModalMode(null)} className="px-3 py-2 border rounded">Cancel</button>
              <button type="submit" disabled={busy} className="px-3 py-2 bg-blue-600 text-white rounded">{busy ? "Working..." : (modalMode === "add" ? "Create" : "Update")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
