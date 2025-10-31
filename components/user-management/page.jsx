"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers";
import {
  Pencil,
  Trash2,
  PlusCircle,
  X,
  Eye,
  EyeOff,
  RefreshCcw,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "../../lib/supabaseClient";

const ALLOWED_ROLES = ["Manager", "Supervisor", "Senior", "Super Admin"];
const FIXED_PARENT_ID = "a084fabb-5cca-4ce9-a15b-f7143d0a9b38";
const IMAGE_BUCKET = "team-images";

export default function UserManagementPage() {
  const router = useRouter();
  const { user, role, loading } = useAuth();

  const [team, setTeam] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  // 🟥 New state for delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ----- Load Team -----
  async function loadTeam(showToast = false) {
    setLoadingTeam(true);
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load team");
      setTeam(Array.isArray(data) ? data : []);
      if (showToast) toast.success("✅ Team refreshed");
    } catch (e) {
      console.error("Load team error:", e);
      toast.error("❌ Failed to load team");
    } finally {
      setLoadingTeam(false);
    }
  }

  useEffect(() => {
    if (!loading && !ALLOWED_ROLES.includes(role)) {
      toast.error("Access denied — only managers and above.");
      router.push("/dashboard");
      return;
    }
    if (!loading) loadTeam();
  }, [loading, role]);

  const filtered = useMemo(() => {
    const list = (team || []).filter(Boolean);
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((t) =>
      [
        t?.name,
        t?.email,
        t?.role,
        t?.id_number,
        t?.contact,
        t?.created_by,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [team, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // ----- Image upload -----
  async function uploadImageToSupabase(file) {
    if (!file) return null;
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `user-${Date.now()}.${fileExt}`;
      const path = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from(IMAGE_BUCKET)
        .getPublicUrl(path);
      return publicData?.publicUrl || null;
    } catch (err) {
      console.error("Image upload failed:", err);
      throw err;
    }
  }

  // ----- Modal Controls -----
  function openAdd() {
    setEditing({
      id: null,
      auth_id: null,
      name: "",
      role: "System Support Engineer",
      parent_id: FIXED_PARENT_ID,
      image_url: "",
      level: 1,
      position: 1,
      id_number: "",
      email: "",
      contact: "",
      created_by: user?.email ?? "",
      password: "",
    });
    setImageFile(null);
    setImagePreview("");
    setShowPassword(false);
    setShowModal(true);
  }

  function openEdit(row) {
    setEditing({
      id: row?.id ?? null,
      auth_id: row?.auth_id ?? null,
      name: row?.name ?? "",
      role: row?.role ?? "System Support Engineer",
      parent_id: row?.parent_id ?? FIXED_PARENT_ID,
      image_url: row?.image_url ?? "",
      level: row?.level ?? 1,
      position: row?.position ?? 1,
      id_number: row?.id_number ?? "",
      email: row?.email ?? "",
      contact: row?.contact ?? "",
      created_by: row?.created_by ?? user?.email ?? "",
      password: "",
    });
    setImageFile(null);
    setImagePreview(row?.image_url ?? "");
    setShowPassword(false);
    setShowModal(true);
  }

  function closeModal() {
    setEditing(null);
    setShowModal(false);
    setImageFile(null);
    setImagePreview("");
  }

  // ----- Save -----
  async function handleSave() {
    if (!editing) return;
    setSaving(true);

    try {
      let image_url = editing.image_url || null;
      if (imageFile) {
        const uploadedUrl = await uploadImageToSupabase(imageFile);
        image_url = uploadedUrl || image_url;
      }

      const payload = {
        id: editing.id || null,
        auth_id: editing.auth_id || null,
        name: editing.name,
        role: editing.role,
        email: editing.email,
        password: editing.password || null,
        id_number: editing.id_number,
        contact: editing.contact,
        image_url,
        parent_id: editing.parent_id || FIXED_PARENT_ID,
        level: Number(editing.level) || 1,
        position: Number(editing.position) || 1,
        created_by: editing.id
          ? undefined
          : editing.created_by || user?.email || "",
      };

      const res = await fetch("/api/team/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || "Save failed");

      toast.success(result.message || "✅ Saved successfully!");
      closeModal();
      await loadTeam();
    } catch (e) {
      console.error("Save error:", e);
      toast.error(e.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  }

  // ----- Delete -----
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch("/api/team/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: deleteTarget.id,
          auth_id: deleteTarget.auth_id,
        }),
      });

      const text = await res.text();
      let result = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = { error: text || "Unknown response" };
      }

      if (!res.ok) throw new Error(result?.error || "Delete failed");

      toast.success(result.message || "✅ User deleted successfully");
      setDeleteTarget(null);
      await loadTeam();
    } catch (e) {
      console.error("Delete error:", e);
      toast.error(e.message || "Failed to delete user");
    } finally {
      setDeleting(false);
    }
  }

  // ----- UI -----
  return (
    <div className="p-6">
      <Toaster />
      <h1 className="text-2xl font-bold mb-4">👥 User Management</h1>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <input
          placeholder="Search name / email / id..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="p-3 border rounded-md w-full max-w-md dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
        />

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => loadTeam(true)}
            disabled={loadingTeam}
            className="flex items-center gap-2 p-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <RefreshCcw size={16} />
            {loadingTeam ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 p-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <PlusCircle size={16} /> Add User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto border rounded">
        <table className="w-full min-w-[900px] border-collapse bg-white dark:bg-gray-900">
          <thead className="bg-gray-100 dark:bg-gray-800 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">ID #</th>
              <th className="px-3 py-2 text-left">Level/Pos</th>
              <th className="px-3 py-2 text-left">Contact</th>
              <th className="px-3 py-2 text-left">Created By</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {paginated.length === 0 && !loadingTeam ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-6 text-center text-gray-500 dark:text-gray-400"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              paginated.map((t) => (
                <tr key={t?.id || Math.random()} className="border-t">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      {t?.image_url ? (
                        <img
                          src={t.image_url}
                          alt={t?.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                          --
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">{t?.name || "-"}</div>
                        <div className="text-xs text-gray-500">
                          {t?.email || "-"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">{t?.role}</td>
                  <td className="px-3 py-2">{t?.email}</td>
                  <td className="px-3 py-2">{t?.id_number}</td>
                  <td className="px-3 py-2">
                    {t?.level}/{t?.position}
                  </td>
                  <td className="px-3 py-2">{t?.contact}</td>
                  <td className="px-3 py-2">{t?.created_by}</td>
                  <td className="px-3 py-2 flex gap-2">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(t)}
                      className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center gap-3">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          className="p-2 border rounded disabled:opacity-50"
        >
          Prev
        </button>
        <div>
          Page {currentPage} / {totalPages} — {filtered.length} total
        </div>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          className="p-2 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* 🟥 Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-sm shadow-2xl text-center relative">
            <button
              onClick={() => setDeleteTarget(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-semibold mb-2">
              Confirm Deletion
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold text-red-500">
                {deleteTarget.name}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && editing && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                {editing.id ? "Edit User" : "Add User"} <span className="text-sm text-gray-500">(Edited by: {user?.email || "Unknown"})</span>
              </h2>
              <button onClick={closeModal} className="p-1"><X /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Name */}
              <label className="flex flex-col">
                <span className="text-sm font-medium">Name</span>
                <input className="p-3 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </label>

              {/* Role */}
              <label className="flex flex-col">
                <span className="text-sm font-medium">Role</span>
                <select className="p-3 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={editing.role ?? "System Support Engineer"} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                  <option>System Support Engineer</option>
                  <option>System Support Engineer Supervisor</option>
                  <option>Senior System Support Engineer</option>
                  <option>System Support Engineer Assistant Manager</option>
                  <option>Super Admin</option>
                </select>
              </label>

              {/* Email */}
              <label className="flex flex-col">
                <span className="text-sm font-medium">Email</span>
                <input type="email" className="p-3 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </label>

              {/* Password */}
              <label className="flex flex-col relative">
                <span className="text-sm font-medium">Password (new/reset)</span>
                <input type={showPassword ? "text" : "password"} placeholder="Leave blank to keep current password"
                  className="p-3 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white pr-10"
                  value={editing.password ?? ""} onChange={(e) => setEditing({ ...editing, password: e.target.value })} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-gray-500">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </label>

              {/* ID Number */}
              <label className="flex flex-col">
                <span className="text-sm font-medium">ID Number</span>
                <input className="p-3 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={editing.id_number ?? ""} onChange={(e) => setEditing({ ...editing, id_number: e.target.value })} />
              </label>

              {/* Contact */}
              <label className="flex flex-col">
                <span className="text-sm font-medium">Contact</span>
                <input className="p-3 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={editing.contact ?? ""} onChange={(e) => setEditing({ ...editing, contact: e.target.value })} />
              </label>

              {/* Image upload (file + url fallback) */}
              <label className="flex flex-col">
                <span className="text-sm font-medium">Image (file or URL)</span>
                <input type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setImageFile(f);
                    setImagePreview(URL.createObjectURL(f));
                  }
                }} className="mb-2" />
                <input placeholder="or paste image URL" className="p-3 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={editing.image_url ?? ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
                {imagePreview && <img src={imagePreview} alt="preview" className="mt-2 w-24 h-24 object-cover rounded-full border" />}
              </label>

              {/* Level */}
              <label className="flex flex-col">
                <span className="text-sm font-medium">Level</span>
                <input type="number" className="p-3 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={editing.level ?? 1} onChange={(e) => setEditing({ ...editing, level: Number(e.target.value) })} />
              </label>

              {/* Position */}
              <label className="flex flex-col">
                <span className="text-sm font-medium">Position</span>
                <input type="number" className="p-3 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  value={editing.position ?? 1} onChange={(e) => setEditing({ ...editing, position: Number(e.target.value) })} />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={closeModal} className="p-2 border rounded">Cancel</button>
              <button disabled={saving} onClick={handleSave} className="p-2 bg-green-600 text-white rounded">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
