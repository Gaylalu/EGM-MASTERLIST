"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Pencil,
  Trash2,
  Copy,
  PlusCircle,
  X,
} from "lucide-react";

export default function Machines() {
  const [machines, setMachines] = useState([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    FLOOR: "",
    "MACHINE STATUS": "",
    "POWER STATUS": "",
    "CABINET MODEL": "",
    MANUFACTURER: "",
  });
  const [editingMachine, setEditingMachine] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [darkMode, setDarkMode] = useState(false);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [toast, setToast] = useState(null);
  const [openCategories, setOpenCategories] = useState([]); // collapsed by default

  const tableColumns = [
    "id",
    "MACHINE #",
    "MID",
    "SLOT BASE",
    "FLOOR",
    "MACHINE STATUS",
    "POWER STATUS",
    "CABINET MODEL",
    "MANUFACTURER",
    "BATCH",
  ];

  const categories = [
    {
      title: "MACHINE INFORMATION",
      fields: [
        "MACHINE #",
        "MID",
        "SLOT BASE",
        "FLOOR",
        "MACHINE STATUS",
        "POWER STATUS",
        "CABINET SERIAL",
        "CABINET MODEL",
        "MANUFACTURER",
        "BATCH",
      ],
    },
    {
      title: "BUTTON INFORMATION",
      fields: [
        "MACHINE TYPE",
        "MACHINE PROFILE",
        "BUTTON PANEL PROFILE",
        "BUTTON ID",
        "CURRENT BUTTON PANEL PROFILE",
      ],
    },
    {
      title: "JACKPOT INFORMATION",
      fields: [
        "JACKPOT THEME",
        "JACKPOT TYPE",
        "JACKPOT CONTROLLER",
        "PROGRESSIVE JACKPOT LINK ID",
      ],
    },
    {
      title: "NETWORK & IPs",
      fields: [
        "ISC IP",
        "UBOX IP",
        "SCD MAIN IP",
        "SCD MAIN SITE",
        "SCD TOP IP",
        "SCD TOP SITE",
        "CCTV IP",
        "CCTV SITE",
      ],
    },
    {
      title: "STREAMING",
      fields: [
        "MAIN STREAM LOCAL URL",
        "MAIN STREAM LOCAL SUB URL",
        "TOP STREAM LOCAL URL",
        "TOP STREAM LOCAL SUB URL",
        "CCTV STREAM LOCAL URL",
        "CCTV STREAM LOCAL SUB URL",
      ],
    },
    {
      title: "SCD VERSION / ENCODER / MAC",
      fields: [
        "MAIN SCD VERSION",
        "TOP SCD VERSION",
        "MAIN ENCODER SETTING",
        "TOP ENCODER SETTING",
        "MAIN MAC ADDRESS",
        "TOP MAC ADDRESS",
        "MAIN DUPLICATE",
        "TOP DUPLICATE",
      ],
    },
    {
      title: "CABLE TAGGING",
      fields: [
        "ISC CABLE",
        "SCD MAIN CABLE",
        "SCD TOP CABLE",
        "JACKPOT CONTROLLER CABLE",
      ],
    },
    {
      title: "GAME INFORMATION",
      fields: [
        "GAME THEME",
        "UGS GAME NAME",
        "DENOM TYPE",
        "DENOMINATION",
        "GAME ID VERSION",
        "PLATFORM VERSION",
        "VARIATION PAYTABLE ID",
      ],
    },
    {
      title: "ISC INFORMATION",
      fields: ["ISC VERSION", "LSIO VERSION", "APP LAUNCHER VERSION"],
    },
    {
      title: "CHECKLIST",
      fields: ["EGM CHECKLIST", "ISLOT CHECKLIST"],
    },
  ];

  // --- Load Machines (batch) ---
  async function loadMachinesBatch(offset = 0, batchSize = 1000) {
    const { data, error } = await supabase
      .from("machines")
      .select("*")
      .order("id", { ascending: true })
      .range(offset, offset + batchSize - 1);
    if (error) {
      console.error(error);
      return [];
    }
    return data || [];
  }

  async function loadAllMachines() {
    try {
      let all = [];
      let offset = 0;
      const batchSize = 1000;
      let batch = [];
      do {
        batch = await loadMachinesBatch(offset, batchSize);
        all = all.concat(batch);
        offset += batchSize;
      } while (batch.length === batchSize && batch.length > 0);
      setMachines(all);
      setCurrentPage(1);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadAllMachines();
    const saved =
      typeof window !== "undefined" &&
      localStorage.getItem("machines_dark");
    if (saved) setDarkMode(saved === "1");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem("machines_dark", darkMode ? "1" : "0");
  }, [darkMode]);

  // --- Sorting ---
  function handleSort(column) {
    if (sortColumn === column)
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  }

  function compareValues(aVal, bVal) {
    const a = aVal == null ? "" : aVal;
    const b = bVal == null ? "" : bVal;
    const aNum = Number(a);
    const bNum = Number(b);
    const bothNumeric =
      !Number.isNaN(aNum) && !Number.isNaN(bNum);
    if (bothNumeric) {
      if (aNum < bNum) return -1;
      if (aNum > bNum) return 1;
      return 0;
    }
    return String(a).localeCompare(String(b), undefined, {
      sensitivity: "base",
    });
  }

  // --- Filtering ---
  const filtered = machines.filter((m) => {
    let match =
      !query ||
      Object.values(m)
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
    Object.entries(filters).forEach(([key, value]) => {
      if (value && m[key] !== value) match = false;
    });
    return match;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortColumn) return 0;
    const dir = sortDirection === "asc" ? 1 : -1;
    return compareValues(a[sortColumn], b[sortColumn]) * dir;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
    if (currentPage < 1) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const paginated = sorted.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // --- Dynamic filter options ---
  function uniqueValues(field) {
    return [
      ...new Set(
        machines
          .filter((m) => {
            let match = true;
            Object.entries(filters).forEach(([key, value]) => {
              if (key !== field && value && m[key] !== value) match = false;
            });
            if (query)
              match =
                match &&
                Object.values(m)
                  .join(" ")
                  .toLowerCase()
                  .includes(query.toLowerCase());
            return match;
          })
          .map((m) => m[field])
          .filter(Boolean)
      ),
    ];
  }

  // --- Modal Actions ---
  function openAdd() {
    setEditingMachine({});
    setShowModal(true);
  }
  function openEdit(m) {
    setEditingMachine({ ...m });
    setShowModal(true);
  }
  function openCopy(m) {
    const copy = { ...m };
    delete copy.id;
    setEditingMachine(copy);
    setShowModal(true);
  }
  function closeModal() {
    setEditingMachine(null);
    setShowModal(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this machine?")) return;
    try {
      const { error } = await supabase.from("machines").delete().eq("id", id);
      if (error) {
        showToast("❌ " + (error.message || "Delete failed"));
        return;
      }
      setMachines((ms) => ms.filter((x) => x.id !== id));
      showToast("✅ Deleted successfully");
    } catch (e) {
      console.error(e);
      showToast("❌ Delete failed");
    }
  }

  async function handleSave() {
    if (!editingMachine) return;
    try {
      let error = null;
      if (editingMachine.id) {
        const res = await supabase
          .from("machines")
          .update(editingMachine)
          .eq("id", editingMachine.id);
        error = res.error;
      } else {
        const res = await supabase.from("machines").insert(editingMachine);
        error = res.error;
      }
      if (error) {
        showToast("❌ " + (error.message || "Save failed"));
        return;
      }
      await loadAllMachines();
      closeModal();
      showToast("✅ Saved successfully");
    } catch (e) {
      console.error(e);
      showToast("❌ Save failed");
    }
  }

  // --- CSV Export ---
  function exportCSV(all = false) {
    const data = all ? sorted : paginated;
    if (!data || data.length === 0) return alert("No data to export");
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map(
            (h) =>
              `"${(row[h] === null || row[h] === undefined ? "" : row[h])
                .toString()
                .replace(/"/g, '""')}"`
          )
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `machines_${all ? "all" : "page_" + currentPage}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function toggleCategory(title) {
    setOpenCategories((prev) =>
      prev.includes(title)
        ? prev.filter((c) => c !== title)
        : [...prev, title]
    );
  }

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="p-6 bg-white dark:bg-gray-900 dark:text-white min-h-screen">
        <h1 className="text-xl mb-4 font-semibold">EGM MASTERLIST SYSTEM</h1>

        {/* Toolbar: Search + Filters */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <input
            placeholder="Search (any field)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="p-2 border rounded w-full max-w-sm dark:bg-gray-800 dark:text-white"
          />
          {Object.keys(filters).map((field) => (
            <select
              key={field}
              value={filters[field]}
              onChange={(e) => {
                setFilters({ ...filters, [field]: e.target.value });
                setCurrentPage(1);
              }}
              className="border p-1 rounded dark:bg-gray-800 dark:text-white"
            >
              <option value="">{field}</option>
              {uniqueValues(field).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ))}
          <button
            onClick={() =>
              setFilters({
                FLOOR: "",
                "MACHINE STATUS": "",
                "POWER STATUS": "",
                "CABINET MODEL": "",
                MANUFACTURER: "",
              })
            }
            className="p-2 border rounded bg-gray-200 dark:bg-gray-700"
          >
            Clear Filters
          </button>
          <button onClick={loadAllMachines} className="p-2 border rounded">
            Refresh
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1 p-2 bg-green-600 text-white rounded"
          >
            <PlusCircle size={18} /> Add
          </button>
          <button
            onClick={() => setDarkMode((d) => !d)}
            className="p-2 border rounded"
          >
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
          <button
            onClick={() => exportCSV(false)}
            className="p-2 border rounded bg-blue-500 text-white"
          >
            Export Page CSV
          </button>
          <button
            onClick={() => exportCSV(true)}
            className="p-2 border rounded bg-blue-700 text-white"
          >
            Export All CSV
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border rounded">
          <table className="w-full min-w-[900px] border-collapse bg-white dark:bg-gray-900 dark:text-white">
            <thead className="bg-gray-200 dark:bg-gray-800 text-black dark:text-white sticky top-0 z-10">
              <tr>
                {tableColumns.map((col) => (
                  <th
                    key={col}
                    className="px-2 py-2 border text-left cursor-pointer select-none"
                    onClick={() => handleSort(col)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{col}</span>
                      <span className="text-xs">
                        {sortColumn === col
                          ? sortDirection === "asc"
                            ? "▲"
                            : "▼"
                          : ""}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableColumns.length + 1}
                    className="p-4 text-center"
                  >
                    No machines found.
                  </td>
                </tr>
              ) : (
                paginated.map((m) => (
                  <tr
                    key={m.id ?? Math.random()}
                    className="border-t even:bg-gray-50 dark:even:bg-gray-800"
                  >
                    {tableColumns.map((col) => (
                      <td
                        key={col}
                        className="py-2 px-2 align-top break-words max-w-[220px]"
                      >
                        {m[col] ?? ""}
                      </td>
                    ))}
                    <td className="py-2 px-2 space-x-2">
                      <button
                        onClick={() => openEdit(m)}
                        className="text-blue-600 dark:text-blue-300"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={() => openCopy(m)}
                        className="text-gray-600 dark:text-gray-300"
                      >
                        <Copy size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex justify-center items-center gap-3">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-2 border rounded disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {currentPage} of {totalPages} — {sorted.length} total
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((p) => Math.min(totalPages, p + 1))
            }
            className="p-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>

        {/* Modal */}
        {showModal && editingMachine && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 dark:text-white p-6 rounded max-h-[90vh] overflow-auto w-full max-w-4xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {editingMachine.id ? "Edit Machine" : "Add / Copy Machine"}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-600 hover:text-black dark:hover:text-white"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                {categories.map((cat) => (
                  <div key={cat.title} className="border rounded">
                    <button
                      onClick={() => toggleCategory(cat.title)}
                      className="w-full flex justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold"
                    >
                      {cat.title}{" "}
                      <span>
                        {openCategories.includes(cat.title) ? "−" : "+"}
                      </span>
                    </button>
                    {openCategories.includes(cat.title) && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cat.fields.map((field) => (
                          <label key={field} className="flex flex-col text-sm">
                            <span className="mb-1">{field}</span>
                            {field === "MAIN SCD VERSION" ||
                            field === "TOP SCD VERSION" ? (
                              <textarea
                                value={editingMachine[field] ?? ""}
                                onChange={(e) =>
                                  setEditingMachine({
                                    ...editingMachine,
                                    [field]: e.target.value,
                                  })
                                }
                                className="border p-2 rounded w-full h-28 dark:bg-gray-700 dark:text-white resize-y"
                              />
                            ) : (
                              <input
                                value={editingMachine[field] ?? ""}
                                onChange={(e) =>
                                  setEditingMachine({
                                    ...editingMachine,
                                    [field]: e.target.value,
                                  })
                                }
                                className="border p-2 rounded w-full dark:bg-gray-700 dark:text-white"
                              />
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={closeModal} className="p-2 border rounded">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="p-2 bg-blue-600 text-white rounded"
                >
                  {editingMachine.id ? "Save Changes" : "Save New"}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded shadow-lg z-50">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
