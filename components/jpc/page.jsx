"use client";

import { useAuth } from "../providers";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Pencil, Trash2, PlusCircle, X, Download } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function JpcPage() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalType, setModalType] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportEnv, setExportEnv] = useState("BOTH"); // "BOTH" | "PROD" | "UAT"
  const { role } = useAuth();
  const isSystemSupport = role === "System Support";

  // 🟢 add EDITED BY to headers
  const headers = [
    "id",
    "JACKPOT",
    "ENVIRONMENT",
    "LOCATION",
    "JPC LOCATION",
    "MID",
    "CONTENT ID",
    "JACKPOT ID",
    "JPC IP",
    "GATEWAY",
    "SUBNET MASK",
    "UTP CABLE TAG/BANK",
    "PASSWORD",
    "EDITED BY",
  ];

  // --- Fetch Data ---
  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("jpc").select("*").order("id");
    if (error) {
      console.error("❌ Error fetching JPC:", error.message);
      toast.error("Failed to fetch data");
    } else {
      setMachines(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Export Filtered Data ---
  const getFilteredData = () => {
    return machines.filter((m) =>
      exportEnv === "BOTH" ? true : m.ENVIRONMENT === exportEnv
    );
  };

  // --- Export CSV ---
  const exportCSV = () => {
    const filteredData = getFilteredData();
    if (!filteredData.length) return toast.error("No data to export");

    const rows = filteredData.map((row) =>
      headers.map((h) => `"${row[h] || ""}"`).join(",")
    );

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `jpc_list_${exportEnv}.csv`;
    link.click();

    toast.success(`✅ CSV Exported (${exportEnv})`);
  };

  // --- Export PDF ---
  const exportPDF = () => {
    const filteredData = getFilteredData();
    if (!filteredData.length) return toast.error("No data to export");

    const doc = new jsPDF();
    doc.text(`💻 JPC List (${exportEnv})`, 14, 15);

    const data = filteredData.map((row) => headers.map((h) => row[h] || ""));

    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 20,
      styles: { fontSize: 8 },
    });

    doc.save(`jpc_list_${exportEnv}.pdf`);
    toast.success(`✅ PDF Exported (${exportEnv})`);
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
    delete newRow.id;

    // 🟢 add EDITED BY placeholder (replace later with logged-in user)
    newRow["EDITED BY"] = "SYSTEM";

    const { error } = await supabase.from("jpc").insert([newRow]);
    if (error) toast.error("Failed to add JPC: " + error.message);
    else {
      toast.success("✅ JPC added");
      fetchData();
      closeModal();
    }
  };

  // --- Edit ---
  const handleEdit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const raw = Object.fromEntries(formData.entries());

    const updateRow = {};
    headers.forEach((h) => {
      if (h !== "id") updateRow[h] = raw[h] || "";
    });

    // 🟢 update EDITED BY
    updateRow["EDITED BY"] = "SYSTEM";

    const { error } = await supabase
      .from("jpc")
      .update(updateRow)
      .eq("id", selectedRow.id);

    if (error) toast.error("Failed to update JPC");
    else {
      toast.success("✅ JPC updated");
      fetchData();
      closeModal();
    }
  };

  // --- Delete ---
  const handleDelete = async () => {
    const { error } = await supabase
      .from("jpc")
      .delete()
      .eq("id", selectedRow.id);
    if (error) toast.error("Failed to delete JPC");
    else {
      toast.success("🗑️ JPC deleted");
      fetchData();
      closeModal();
    }
  };

  const filtered = machines.filter((m) =>
    Object.values(m).some((val) =>
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  );

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
      <Toaster position="top-right" />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">💻 Jackpot Display PC Masterlist</h1>
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
          <div className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              <Download size={18} /> Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 mt-1 bg-white dark:bg-gray-800 shadow-lg rounded border w-44 z-10">
                {/* PDF Exports */}
                <button
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    setExportEnv("BOTH");
                    exportPDF();
                    setExportOpen(false);
                  }}
                >
                  PDF (Both)
                </button>
                <button
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    setExportEnv("PROD");
                    exportPDF();
                    setExportOpen(false);
                  }}
                >
                  PDF (PROD Only)
                </button>
                <button
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    setExportEnv("UAT");
                    exportPDF();
                    setExportOpen(false);
                  }}
                >
                  PDF (UAT Only)
                </button>

                <hr className="my-1 border-gray-300 dark:border-gray-600" />

                {/* CSV Exports */}
                <button
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    setExportEnv("BOTH");
                    exportCSV();
                    setExportOpen(false);
                  }}
                >
                  CSV (Both)
                </button>
                <button
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    setExportEnv("PROD");
                    exportCSV();
                    setExportOpen(false);
                  }}
                >
                  CSV (PROD Only)
                </button>
                <button
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => {
                    setExportEnv("UAT");
                    exportCSV();
                    setExportOpen(false);
                  }}
                >
                  CSV (UAT Only)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border border-gray-300 dark:border-gray-700 text-sm">
        <thead className="bg-gray-200 dark:bg-gray-700 dark:text-white">
          <tr>
            {headers.map((h) => (
              <th key={h} className="p-1 border">
                {h}
              </th>
            ))}
            <th className="p-2 border">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length + 1}
                className="p-4 text-center text-gray-500"
              >
                No data found
              </td>
            </tr>
          ) : (
            filtered.map((m) => {
              let rowBg = "";
              let textColor = "text-black"; // default for light mode

              if (m.ENVIRONMENT === "UAT") {
                rowBg = "bg-yellow-200 dark:bg-yellow-700";
                textColor = "dark:text-white";
              } else if (m.ENVIRONMENT === "PROD") {
                rowBg = "bg-green-200 dark:bg-green-800";
                textColor = "dark:text-white";
              }

              return (
                <tr
                  key={m.id}
                  className={`${rowBg} ${textColor} border-t dark:border-gray-700`}
                >
                  {headers.map((h) => (
                    <td key={h} className="p-2 border">
                      {m[h]}
                    </td>
                  ))}
                  <td className="p-3 border flex gap-2 justify-center">
                    {isSystemSupport ? (
                      <span className="text-gray-500 italic">View Only</span>
                    ) : (
                      <>
                        <button
                          onClick={() => openModal("edit", m)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-300"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => openModal("delete", m)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Modals */}
      {modalType && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-900 dark:text-white p-6 rounded shadow-lg w-full max-w-3xl relative">
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-gray-500 hover:text-black dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>

            {modalType === "add" && (
              <form onSubmit={handleAdd} className="space-y-6">
                <h2 className="text-xl font-bold mb-2">➕ Add JPC</h2>
                <FormFields />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            {modalType === "edit" && selectedRow && (
              <form onSubmit={handleEdit} className="space-y-6">
                <h2 className="text-xl font-bold mb-2">✏️ Edit JPC</h2>
                <FormFields defaultValues={selectedRow} />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {modalType === "delete" && selectedRow && (
              <div className="text-center">
                <h2 className="text-xl font-bold mb-4">🗑 Delete JPC</h2>
                <p className="mb-6">
                  Are you sure you want to delete{" "}
                  <strong>{selectedRow["JACKPOT"]}</strong>?
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleDelete}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={closeModal}
                    className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                  >
                    Cancel
                  </button>
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
    "JACKPOT",
    "ENVIRONMENT",
    "LOCATION",
    "JPC LOCATION",
    "MID",
    "CONTENT ID",
    "JACKPOT ID",
    "JPC IP",
    "GATEWAY",
    "SUBNET MASK",
    "UTP CABLE TAG/BANK",
    "PASSWORD",
    // 🟢 no EDITED BY here (handled automatically)
  ];

  const dropdownOptions = {
    LOCATION: ["CP", "2FLW", "2FRW", "GFLW", "GFRW"],
    ENVIRONMENT: ["PROD", "UAT"],
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
                <option key={option} value={option}>
                  {option}
                </option>
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
