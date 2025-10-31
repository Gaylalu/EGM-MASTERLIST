"use client";

import { useAuth } from "../providers";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Pencil, Trash2, PlusCircle, X, Download } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";
import autoTable from "jspdf-autotable";

export default function JcuPage() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalType, setModalType] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const { role } = useAuth();
  const isSystemSupport = role === "System Support";

  const headers = [
    "id",
    "JACKPOT LINK",
    "LOCATION",
    "JCU LOCATION",
    "JACKPOT CONTROLLER",
    "JCU TYPE",
    "MID",
    "JCU IP",
    "GATEWAY",
    "SERVER IP",
    "STATUS",
    "EDITED BY", // 👈 New column
  ];

  // --- Fetch Data ---
  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("jcu").select("*").order("id");
    if (error) {
      console.error("❌ Error fetching JCU:", error.message);
      toast.error("Failed to fetch data");
    } else {
      setMachines(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Export CSV ---
  const exportCSV = () => {
    if (machines.length === 0) {
      toast.error("No data to export");
      return;
    }

    const rows = machines.map((row) => headers.map((h) => `"${row[h] || ""}"`).join(","));
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "jcu_list.csv";
    link.click();

    toast.success("✅ Exported CSV");
  };

  // --- Export PDF ---
  const exportPDF = () => {
    if (machines.length === 0) {
      toast.error("No data to export");
      return;
    }

    const doc = new jsPDF();
    doc.text("🎮 JCU List", 14, 15);

    const data = machines.map((row) => headers.map((h) => row[h] || ""));

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 20,
      styles: { fontSize: 8 },
    });

    doc.save("jcu_list.pdf");
    toast.success("✅ Exported PDF");
  };

  // --- Modal Handlers ---
  const openModal = (type, row = null) => {
    setModalType(type);
    setSelectedRow(row);
  };
  const closeModal = () => {
    setModalType(null);
    setSelectedRow(null);
  };

  // --- Add ---
  const handleAdd = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newRow = Object.fromEntries(formData.entries());

    newRow["EDITED BY"] = "Admin"; // 👈 placeholder

    const { error } = await supabase.from("jcu").insert([newRow]);
    if (error) {
      console.error("❌ Error adding JCU:", error.message);
      toast.error("Failed to add JCU");
    } else {
      toast.success("✅ JCU added");
      fetchData();
      closeModal();
    }
  };

  // --- Edit ---
  const handleEdit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedRow = Object.fromEntries(formData.entries());

    updatedRow["EDITED BY"] = "Admin"; // 👈 placeholder

    const { error } = await supabase.from("jcu").update(updatedRow).eq("id", selectedRow.id);

    if (error) {
      console.error("❌ Error editing JCU:", error.message);
      toast.error("Failed to update JCU");
    } else {
      toast.success("✅ JCU updated");
      fetchData();
      closeModal();
    }
  };

  // --- Delete ---
  const handleDelete = async () => {
    const { error } = await supabase.from("jcu").delete().eq("id", selectedRow.id);

    if (error) {
      console.error("❌ Error deleting JCU:", error.message);
      toast.error("Failed to delete JCU");
    } else {
      toast.success("🗑️ JCU deleted");
      fetchData();
      closeModal();
    }
  };

  // --- Filtered List ---
  const filtered = machines.filter((m) =>
    Object.values(m).some((val) => String(val).toLowerCase().includes(search.toLowerCase()))
  );

  // --- Category Counts ---
  const getCategoryCounts = (field) => {
    const counts = {};
    machines.forEach((m) => {
      const val = m[field] || "N/A";
      counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
  };

  const locationCounts = getCategoryCounts("LOCATION");
  const controllerCounts = getCategoryCounts("JACKPOT CONTROLLER");
  const typeCounts = getCategoryCounts("JCU TYPE");

  if (loading) return <p className="p-4">Loading...</p>;

  return (
    <div
      className="p-6 min-h-screen"
      style={{
        backgroundImage:
          "url('https://lfvyrhoikcbtcfjtvtwb.supabase.co/storage/v1/object/public/team-images/background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >

      <Toaster position="top-right" reverseOrder={false} />

      {/* --- Header & Controls --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
        <h1 className="text-2xl font-bold">🎮 Jackpot Controller Unit Masterlist</h1>
        <div className="flex gap-2 relative">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-3 py-1 rounded dark:bg-gray-800 dark:text-white"
          />
          {!isSystemSupport && (
            <button
              onClick={() => openModal("add")}
              className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              <PlusCircle size={18} /> Add
            </button>
          )}
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              <Download size={18} /> Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded border w-32 z-10">
                <button
                  onClick={() => {
                    exportPDF();
                    setExportOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  PDF
                </button>
                <button
                  onClick={() => {
                    exportCSV();
                    setExportOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Category Summary --- */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
          <h2 className="font-semibold mb-1">📍 Locations</h2>
          {Object.entries(locationCounts).map(([key, val]) => (
            <p key={key}>{key}: {val}</p>
          ))}
        </div>
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
          <h2 className="font-semibold mb-1">🎛 Jackpot Controllers</h2>
          {Object.entries(controllerCounts).map(([key, val]) => (
            <p key={key}>{key}: {val}</p>
          ))}
        </div>
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
          <h2 className="font-semibold mb-1">💾 JCU Types</h2>
          {Object.entries(typeCounts).map(([key, val]) => (
            <p key={key}>{key}: {val}</p>
          ))}
        </div>
      </div>

      {/* --- Table --- */}
      <table className="w-full border border-gray-300 dark:border-gray-700 text-sm">
        <thead className="bg-gray-200 dark:bg-gray-700 dark:text-white">
          <tr>
            {headers.map((h) => (
              <th key={h} className="p-2 border">{h}</th>
            ))}
            <th className="p-2 border">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={headers.length + 1} className="p-4 text-center text-gray-500">
                No data found
              </td>
            </tr>
          ) : (
            filtered.map((m, index) => (
              <tr
                key={m.id}
                className={`border-t dark:border-gray-700 ${
                  m.STATUS === "ONLINE"
                    ? "bg-green-100 dark:bg-green-800"
                    : m.STATUS === "OFFLINE"
                    ? "bg-red-100 dark:bg-red-800"
                    : m.STATUS === "MAINTENANCE"
                    ? "bg-yellow-100 dark:bg-yellow-700"
                    : index % 2 === 0
                    ? "bg-gray-50 dark:bg-gray-800"
                    : "bg-white dark:bg-gray-900"
                } hover:bg-blue-50 dark:hover:bg-blue-900 transition`}
              >
                {headers.map((h) => (
                  <td key={h} className="p-2 border font-medium">
                    {m[h]}
                  </td>
                ))}
                <td className="p-2 border flex gap-2 justify-center">
                  {isSystemSupport ? (
                    <span className="text-gray-500 italic">View Only</span>
                  ) : (
                    <>
                      <button onClick={() => openModal("edit", m)} className="text-blue-600 hover:text-blue-800">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => openModal("delete", m)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* --- Modals --- */}
      {modalType && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-900 dark:text-white p-6 rounded shadow-lg w-full max-w-3xl relative">
            <button onClick={closeModal} className="absolute top-2 right-2 text-gray-500 hover:text-black dark:hover:text-gray-300">
              <X size={20} />
            </button>

            {/* Add */}
            {modalType === "add" && (
              <form onSubmit={handleAdd} className="space-y-6">
                <h2 className="text-xl font-bold mb-2">➕ Add JCU</h2>
                <FormFields />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={closeModal} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                    Cancel
                  </button>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    Add
                  </button>
                </div>
              </form>
            )}

            {/* Edit */}
            {modalType === "edit" && selectedRow && (
              <form onSubmit={handleEdit} className="space-y-6">
                <h2 className="text-xl font-bold mb-2">✏️ Edit JCU</h2>
                <FormFields defaultValues={selectedRow} />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={closeModal} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                    Cancel
                  </button>
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    Save
                  </button>
                </div>
              </form>
            )}

            {/* Delete */}
            {modalType === "delete" && selectedRow && (
              <div className="text-center">
                <h2 className="text-xl font-bold mb-4">🗑 Delete JCU</h2>
                <p className="mb-6">Are you sure you want to delete <strong>{selectedRow["JACKPOT LINK"]}</strong>?</p>
                <div className="flex justify-center gap-3">
                  <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Delete</button>
                  <button onClick={closeModal} className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Shared Form Component ---
function FormFields({ defaultValues = {} }) {
  const fields = [
    "JACKPOT LINK",
    "LOCATION",
    "JCU LOCATION",
    "JACKPOT CONTROLLER",
    "JCU TYPE",
    "MID",
    "JCU IP",
    "GATEWAY",
    "SERVER IP",
    "STATUS",
  ];

  const dropdownOptions = {
    LOCATION: ["CP", "2FLW", "2FRW", "GFLW", "GFRW"],
    "JACKPOT CONTROLLER": ["Modulus", "PAL Rev7", "PAL VRX"],
    "JCU TYPE": ["UBOX", "ISC"],
    STATUS: ["ONLINE", "OFFLINE", "MAINTENANCE"],
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map((field) => (
        <div key={field} className="flex flex-col">
          <label className="text-sm font-medium mb-1">{field}</label>
          {dropdownOptions[field] ? (
            <select
              name={field}
              defaultValue={defaultValues[field] || ""}
              className="border px-3 py-2 rounded-md dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Select {field} --</option>
              {dropdownOptions[field].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              name={field}
              defaultValue={defaultValues[field] || ""}
              className="border px-3 py-2 rounded-md dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          )}
        </div>
      ))}
    </div>
  );
}
