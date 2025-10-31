"use client";

import { useAuth } from "../app/providers";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import BulkConfirmDialog from "./BulkConfirmDialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Trash2,
  Copy,
  PlusCircle,
  X,
} from "lucide-react";

export default function Machines() {
  const { role } = useAuth();
  const isSystemSupport = role === "System Support";
  const [machines, setMachines] = useState([]);
  const [query, setQuery] = useState("");
  // keep initial commonly-used filters; drawer can add more keys dynamically
  const [filters, setFilters] = useState({
    FLOOR: "",
    "MACHINE STATUS": "",
    "POWER STATUS": "",
    "CABINET MODEL": "",
    MANUFACTURER: "",
  });
  const [editingMachine, setEditingMachine] = useState(null);
  const [viewingMachine, setViewingMachine] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false); // NEW: drawer visibility
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [darkMode, setDarkMode] = useState(false);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [toast, setToast] = useState(null);
  const [openCategories, setOpenCategories] = useState([]); // collapsed by default
  const [userRole, setUserRole] = useState(null);

  // Bulk status states
  const [machineStatusBulk, setMachineStatusBulk] = useState("");
  const [powerStatusBulk, setPowerStatusBulk] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingIds, setPendingIds] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
    async function fetchUserRole() {
      // get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // NOTE: you asked role to come from team.role (not profiles.role)
      // We'll try to read from team where id = user.id (matches previous approach).
      // If your team table uses a different FK name, adjust this query.
      const { data, error } = await supabase
        .from("team")
        .select("role")
        .eq("email", user.email)
        .single();

      if (error) {
        // fallback: try profiles table (in case team doesn't exist)
        const fallback = await supabase
          .from("profiles")
          .select("role")
          .eq("email", user.email)
          .single();
        if (fallback.error) {
          console.error("Role fetch error:", error, fallback.error);
          setUserRole("System Support");
        } else setUserRole(fallback.data?.role || "System Support");
      } else {
        setUserRole(data?.role || "System Support");
      }
    }

    fetchUserRole();
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

  // --- Filtering with multi-search support ---
  // Multi-search: allow comma or whitespace separated MACHINE # tokens.
  function parseTokens(q) {
    if (!q) return [];
    // split on commas or whitespace
    return q
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  }

  const tokens = parseTokens(query);

  const filtered = machines.filter((m) => {
    // If user provided multiple tokens and they look like MACHINE # queries,
    // match any machine whose "MACHINE #" equals one of the tokens (case-insensitive).
    if (tokens.length > 1) {
      const machineNum = (m["MACHINE #"] || "").toString().trim();
      const found = tokens.some(
        (t) => machineNum.toLowerCase() === t.toLowerCase()
      );
      if (found) {
        // still apply other filters (FLOOR, MACHINE STATUS etc.)
        let match = true;
        Object.entries(filters).forEach(([key, value]) => {
          if (value && m[key] !== value) match = false;
        });
        return match;
      }
      // If not found in MACHINE # tokens, exclude
      return false;
    }

    // fallback: previous behavior (full-text search across object)
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
// Open Add modal — always start with clean object
function openAdd() {
  setEditingMachine({}); // start fresh, no id
  setShowModal(true);
}

// Open Edit modal — keep id for updates
function openEdit(m) {
  setEditingMachine({ ...m });
  setShowModal(true);
}

// Open Copy modal — remove id completely
function openCopy(m) {
  const { id, ...copyWithoutId } = m; // remove id
  setEditingMachine(copyWithoutId);
  setShowModal(true);
}

// Close modal
function closeModal() {
  setEditingMachine(null);
  setShowModal(false);
}

  async function handleDeleteClick(machine) {
  setDeleteTarget(machine);
  setShowDeleteDialog(true);
}

async function confirmDelete() {
  if (!deleteTarget?.id) {
    console.error("❌ No machine ID to delete!", deleteTarget);
    showToast("❌ Cannot delete: missing machine ID.");
    return;
  }

  try {
    setDeleting(true);
    const { error } = await supabase
      .from("machines")
      .delete()
      .eq("id", deleteTarget.id); // use the correct ID

    if (error) {
      console.error("❌ Supabase delete error:", error);
      showToast("❌ Delete failed: " + error.message);
      return;
    }

    setMachines((ms) => ms.filter((x) => x.id !== deleteTarget.id));
    showToast("✅ Deleted successfully");
  } catch (e) {
    console.error(e);
    showToast("❌ Delete failed");
  } finally {
    setDeleting(false);
    setShowDeleteDialog(false);
    setDeleteTarget(null);
  }
}

async function confirmDelete() {
  if (!deleteTarget) return;

  try {
    setDeleting(true);
    console.log(`🚮 Deleting machine with ID: ${deleteTarget.id}`);

    const { error } = await supabase.from("machines").delete().eq("id", deleteTarget.id);
    if (error) {
      console.error("❌ Supabase delete error:", error);
      showToast("❌ Failed to delete: " + error.message);
      return;
    }

    setMachines((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    showToast(`✅ Deleted ${deleteTarget.name || "machine"} successfully!`);
  } catch (err) {
    console.error("❌ Unexpected delete error:", err);
    showToast("❌ Something went wrong while deleting.");
  } finally {
    setDeleting(false);
    setShowDeleteDialog(false);
    setDeleteTarget(null);
  }
}

  async function handleSave() {
    if (!editingMachine) return;

    const allowedEditorRoles = [
      "Manager",
      "Supervisor",
      "Senior",
      "System Support Engineer Assistant Manager",
      "System Support Engineer Supervisor",
      "Senior System Support Engineer",
      "Super Admin",
    ];

    if (!allowedEditorRoles.includes(userRole)) {
      showToast("❌ You don't have permission to save or modify data.");
      return;
    }

    try {
      const machineObj = { ...editingMachine };
      // Remove undefined values
      Object.keys(machineObj).forEach(
        (key) => machineObj[key] === undefined && delete machineObj[key]
      );

      console.log("📝 Saving machine data:", machineObj);

      let error = null;

      if (editingMachine.id) {
        const res = await supabase
          .from("machines")
          .update(machineObj)
          .eq("id", editingMachine.id);
        error = res.error;
      } else {
        delete machineObj.id;
        const res = await supabase.from("machines").insert(machineObj);
        error = res.error;
      }

      if (error) {
        console.error("❌ Supabase error:", error);
        showToast("❌ Save failed: " + error.message);
        return;
      }

      showToast("✅ Machine saved successfully!");
      setEditingMachine(null);
      loadAllMachines();
    } catch (err) {
      console.error("❌ Save failed:", err);
      showToast("❌ Save failed: " + err.message);
    }
  }

  // --- Bulk Save (applies to all currently filtered machines: `sorted`) ---
  async function handleBulkSave() {
  const allowedEditorRoles = [
    "Manager",
    "Supervisor",
    "Senior",
    "System Support Engineer Assistant Manager",
    "System Support Engineer Supervisor",
    "Senior System Support Engineer",
    "Super Admin"
  ];

  if (!allowedEditorRoles.includes(userRole)) {
    showToast("❌ You don't have permission to perform bulk updates.");
    return;
  }

  if (!machineStatusBulk && !powerStatusBulk) {
    showToast("❗ Select at least one bulk change before saving.");
    return;
  }

  const ids = sorted.map((m) => m.id).filter(Boolean);
  if (ids.length === 0) {
    showToast("❗ No machines match the current search/filters.");
    return;
  }

  console.log("✅ Ready to show modal for IDs:", ids); // debug

  setPendingIds(ids);
  setShowConfirm(true);
}

function openDeleteDialog(machine) {
  if (!machine?.id) {
    console.error("❌ Machine has no ID:", machine);
    showToast("❌ Cannot delete: machine has no ID");
    return;
  }
  setDeleteTarget(machine);
  setShowDeleteDialog(true);
}

  async function confirmAndSave() {
  console.log("Applying bulk update for IDs:", pendingIds); // debug
  try {
    setBulkSaving(true);
    setShowConfirm(false);

    const { error } = await supabase
      .from("machines")
      .update({
        ...(machineStatusBulk && { ['MACHINE STATUS']: machineStatusBulk }),
        ...(powerStatusBulk && { ['POWER STATUS']: powerStatusBulk }),
      })
      .in("id", pendingIds);

    if (error) {
      console.error("Supabase bulk update error:", error);
      showToast("❌ Bulk update failed: " + error.message);
      return;
    }

    await loadAllMachines();
    showToast(`✅ Updated ${pendingIds.length} machine(s).`);
  } catch (err) {
    console.error("Bulk save failed:", err);
    showToast("❌ Something went wrong while updating.");
  } finally {
    setBulkSaving(false);
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

  // keep toggleCategory function name consistent with usage
  function toggleCategory(title) {
    setOpenCategories((prev) =>
      prev.includes(title)
        ? prev.filter((c) => c !== title)
        : [...prev, title]
    );
  }

  // Fields to exclude from the filter list (as requested)
  const EXCLUDE_FIELDS = ["MACHINE #", "MID", "SLOT BASE", "CABINET SERIAL", "BATCH"];

  // Categories to show in the drawer (as requested)
  const FILTER_CATEGORIES = [
    "MACHINE INFORMATION",
    "BUTTON INFORMATION",
    "JACKPOT INFORMATION",
    "ISC INFORMATION",
  ];

  // Roles allowed to see bulk controls (same as allowedEditorRoles)
  const allowedEditorRoles = [
    "Manager",
    "Supervisor",
    "Senior",
    "System Support Engineer Assistant Manager",
    "System Support Engineer Supervisor",
    "Senior System Support Engineer",
    "Super Admin"
  ];

  return (
    <div className={darkMode ? "dark" : ""}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold mb-4">📋 EGM Masterlist</h1>

        {/* Toolbar: Search + Filters (drawer) + Bulk controls */}
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <input
            placeholder="Search (any field)... — supports comma or space separated MACHINE # (eg. 101,102 103)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="p-2 border rounded w-full max-w-sm dark:bg-gray-800 dark:text-white"
          />

          {/* Filters button opens drawer */}
          <button
            onClick={() => setShowFilters(true)}
            className="p-2 border rounded bg-purple-600 text-white"
          >
            Filters
          </button>

          {/* Clear filters quick button */}
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

          {/* Refresh resets search/sort/filters/page and reloads data */}
          <button
            onClick={() => {
              setQuery("");
              setFilters({
                FLOOR: "",
                "MACHINE STATUS": "",
                "POWER STATUS": "",
                "CABINET MODEL": "",
                MANUFACTURER: "",
              });
              setSortColumn(null);
              setSortDirection("asc");
              setCurrentPage(1);
              loadAllMachines();
            }}
            className="p-2 border rounded"
          >
            Refresh
          </button>

          {/* Only for Manager / Supervisor / Senior and the System Support Engineer roles */}
          {allowedEditorRoles.includes(userRole) && (
            <>
              <button
                onClick={openAdd}
                className="flex items-center gap-1 p-2 bg-green-600 text-white rounded"
              >
                <PlusCircle size={18} /> Add
              </button>
            </>
          )}

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


          {/* --- BULK CONTROLS (above the table) --- */}
          {allowedEditorRoles.includes(userRole) && (
            <div className="ml-auto flex items-center gap-2">
              <select
                value={machineStatusBulk}
                onChange={(e) => setMachineStatusBulk(e.target.value)}
                className="border p-2 rounded w-52 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Bulk Machine Status</option>
                <option value="GO LIVE">GO LIVE</option>
                <option value="ISLOT INSTALLED">ISLOT INSTALLED</option>
                <option value="PROJECT">PROJECT</option>
                <option value="CONFIGURED">CONFIGURED</option>
                <option value="FREEPLAY">FREEPLAY</option>
                <option value="UAT TESTING">UAT TESTING</option>
                <option value="GREEN ROOM">GREEN ROOM</option>
                <option value="PENDING TO SLOT TECH">PENDING TO SLOT TECH</option>
                <option value="PENDING INSTALLATION">PENDING INSTALLATION</option>
                <option value="ONGOING INSTALLATION">ONGOING INSTALLATION</option>
                <option value="FIRMWARE UPDATE">FIRMWARE UPDATE</option>
              </select>

              <select
                value={powerStatusBulk}
                onChange={(e) => setPowerStatusBulk(e.target.value)}
                className="border p-2 rounded w-36 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Bulk Power Status</option>
                <option value="ON">ON</option>
                <option value="OFF">OFF</option>
              </select>

              <button
                onClick={handleBulkSave}
                disabled={bulkSaving}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  bulkSaving ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
                } text-white`}
              >
                {bulkSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
        
              {showConfirm && (
                <BulkConfirmDialog
                  count={pendingIds.length}
                  machineStatus={machineStatusBulk}
                  powerStatus={powerStatusBulk}
                  loading={bulkSaving}
                  onConfirm={confirmAndSave}
                  onCancel={() => setShowConfirm(false)}
                />
              )}

              {showDeleteDialog && (
                <DeleteConfirmDialog
                  machineName={deleteTarget?.["MACHINE #"]}
                  onConfirm={confirmDelete}
                  onCancel={() => setShowDeleteDialog(false)}
                  loading={deleting}
                />
              )}
       
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
                  <td colSpan={tableColumns.length + 1} className="p-4 text-center">
                    No machines found.
                  </td>
                </tr>
              ) : (
                paginated.map((m) => {
                  // --- Gradient row per MACHINE STATUS ---
                  const statusGradients = {
                    "go live": "linear-gradient(90deg, #ffe5a0 0%, #d4b063 100%)",
                    "uat testing": "linear-gradient(90deg, #d4edbc 0%, #a6d79b 100%)",
                    "ongoing installation": "linear-gradient(90deg, #753800 0%, #5a2400 100%)",
                    "pending to slot tech": "linear-gradient(90deg, #ffc8aa 0%, #e5997e 100%)",
                    "islot installed": "linear-gradient(90deg, #ffcfc9 0%, #e29c9b 100%)",
                    "pending installation": "linear-gradient(90deg, #3d3d3d 0%, #1e1e1e 100%)",
                    "green room": "linear-gradient(90deg, #11734b 0%, #0a4b2d 100%)",
                    "configured": "linear-gradient(90deg, #0a53a8 0%, #06366e 100%)",
                    "freeplay": "linear-gradient(90deg, #5a3286 0%, #3b1f63 100%)",
                    "firmware update": "linear-gradient(90deg, #e6e6e6 0%, #bfbfbf 100%)",
                    "project": "linear-gradient(90deg, #b10202 0%, #7a0101 100%)",
                  };

                  const bgGradient =
                    statusGradients[(m["MACHINE STATUS"] || "").toLowerCase()] ||
                    (darkMode
                      ? "linear-gradient(90deg, #2c2c2c 0%, #1e1e1e 100%)"
                      : "linear-gradient(90deg, #f0f0f0 0%, #d9d9d9 100%)");

                  const getTextColor = (bg) =>
                    bg.includes("#3d3d3d") ||
                    bg.includes("#753800") ||
                    bg.includes("#1e1e1e") ||
                    bg.includes("#0a4b2d") ||
                    bg.includes("#06366e") ||
                    bg.includes("#3b1f63") ||
                    bg.includes("#7a0101")
                      ? "#fff"
                      : "#000";

                  const textColor = getTextColor(bgGradient);

                  // --- Power Status badges ---
                  const powerStatusColors = {
                    on: "bg-green-600 text-white",
                    off: "bg-red-600 text-white",
                    unknown: "bg-gray-400 text-white",
                  };

                  return (
                    <tr
                      key={m.id ?? Math.random()}
                      className={`border-t even:bg-gray-50 dark:even:bg-gray-800 hover-bright fade-in-row`}
                      style={{ background: bgGradient, color: textColor }}
                    >
                      {tableColumns.map((col) => {
                        const value = m[col] ?? (col === "MACHINE STATUS" ? "N/A" : "");

                        // --- Power Status badges ---
                        if (col === "POWER STATUS") {
                          const statusClass =
                            powerStatusColors[(value || "unknown").toLowerCase()] ||
                            powerStatusColors["unknown"];
                          return (
                            <td key={col} className="py-2 px-2 align-top break-words max-w-[220px]">
                              <span
                                className={`px-2 py-1 rounded-full font-semibold text-sm ${statusClass}`}
                              >
                                {value || "N/A"}
                              </span>
                            </td>
                          );
                        }

                        // --- Machine Status badges (match row gradient theme) ---
                        if (col === "MACHINE STATUS") {
                          const statusBadgeColors = {
                            "go live": "bg-yellow-500 text-black",
                            "uat testing": "bg-green-600 text-white",
                            "ongoing installation": "bg-amber-900 text-white",
                            "pending to slot tech": "bg-orange-500 text-black",
                            "handover ops": "bg-rose-500 text-white",
                            "out of service": "bg-gray-800 text-white",
                            "ready to go live": "bg-emerald-700 text-white",
                            "sys passed": "bg-blue-700 text-white",
                            "free play": "bg-purple-700 text-white",
                            "firmware update": "bg-gray-500 text-black",
                            "project": "bg-red-700 text-white",
                          };

                          const badgeClass =
                            statusBadgeColors[(value || "").toLowerCase()] ||
                            "bg-gray-500 text-white";

                          return (
                            <td key={col} className="py-2 px-2 align-top break-words max-w-[220px]">
                              <span
                                className={`px-2 py-1 rounded-full font-semibold text-sm ${badgeClass}`}
                              >
                                {value || "N/A"}
                              </span>
                            </td>
                          );
                        }

                        // --- Default cells ---
                        return (
                          <td
                            key={col}
                            className="py-2 px-2 align-top break-words max-w-[220px]"
                          >
                            {value}
                          </td>
                        );
                      })}

                      {/* Action Buttons */}
                      <td className="py-2 px-2 space-x-2 flex flex-wrap gap-1">
                        <button
                          onClick={() => setViewingMachine(m)}
                          className="px-2 py-1 rounded font-semibold bg-green-700 text-white hover:bg-green-800 transition-colors"
                        >
                          👁 View
                        </button>
                        {allowedEditorRoles.includes(userRole) && (
                          <>
                            <button
                              onClick={() => openEdit(m)}
                              className="px-2 py-1 rounded font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-colors"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => openDeleteDialog(m)}
                              className="px-2 py-1 rounded font-semibold bg-red-700 text-white hover:bg-red-800 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              onClick={() => openCopy(m)}
                              className="px-2 py-1 rounded font-semibold bg-gray-700 text-white hover:bg-gray-800 transition-colors"
                            >
                              <Copy size={16} />
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

        {/* Modal (Add/Edit/Copy) */}
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
                      <span>{openCategories.includes(cat.title) ? "−" : "+"}</span>
                    </button>
                    {openCategories.includes(cat.title) && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cat.fields.map((field) => (
                          <label key={field} className="flex flex-col text-sm">
                            <span className="mb-1">{field}</span>

                            {/* Special dropdowns for MACHINE INFORMATION */}

                            {field === "MACHINE STATUS" ? (
                              <select
                                value={editingMachine[field] ?? ""}
                                onChange={(e) =>
                                  setEditingMachine({ ...editingMachine, [field]: e.target.value })
                                }
                                className="border p-2 rounded w-full dark:bg-gray-700 dark:text-white"
                              >
                                <option value="GO LIVE">GO LIVE</option>
                                <option value="ISLOT INSTALLED">ISLOT INSTALLED</option>
                                <option value="PROJECT">PROJECT</option>
                                <option value="CONFIGURED">CONFIGURED</option>
                                <option value="FREEPLAY">FREEPLAY</option>
                                <option value="UAT TESTING">UAT TESTING</option>
                                <option value="GREEN ROOM">GREEN ROOM</option>
                                <option value="PENDING TO SLOT TECH">PENDING TO SLOT TECH</option>
                                <option value="PENDING INSTALLATION">PENDING INSTALLATION</option>
                                <option value="ONGOING INSTALLATION">ONGOING INSTALLATION</option>
                                <option value="FIRMWARE UPDATE">FIRMWARE UPDATE</option>
                              </select>
                            ) : field === "FLOOR" ? (
                              <select
                                value={editingMachine[field] ?? ""}
                                onChange={(e) =>
                                  setEditingMachine({ ...editingMachine, [field]: e.target.value })
                                }
                                className="border p-2 rounded w-full dark:bg-gray-700 dark:text-white"
                              >
                                <option value="CYBER STUDIO">CYBER STUDIO</option>
                                <option value="GREEN ROOM">GREEN ROOM</option>
                                <option value="2F LEFT WING">2F LEFT WING</option>
                                <option value="2F RIGHT WING">2F RIGHT WING</option>
                                <option value="GF LEFT WING">GF LEFT WING</option>
                                <option value="GF RIGHT WING">GF RIGHT WING</option>
                                <option value="H1/F">H1/F</option>
                                <option value="H2/F">H2/F</option>
                                <option value="H3/F">H3/F</option>
                              </select>
                            ) : field === "POWER STATUS" ? (
                              <select
                                value={editingMachine[field] ?? ""}
                                onChange={(e) =>
                                  setEditingMachine({ ...editingMachine, [field]: e.target.value })
                                }
                                className="border p-2 rounded w-full dark:bg-gray-700 dark:text-white"
                              >
                                <option value="ON">ON</option>
                                <option value="OFF">OFF</option>
                              </select>
                            ) : field === "CABINET MODEL" ? (
                              <select
                                value={editingMachine[field] ?? ""}
                                onChange={(e) =>
                                  setEditingMachine({ ...editingMachine, [field]: e.target.value })
                                }
                                className="border p-2 rounded w-full dark:bg-gray-700 dark:text-white"
                              >
                                <option value="HELIX UPRIGHT">HELIX UPRIGHT</option>
                                <option value="TWINSTAR">TWINSTAR</option>
                                <option value="KASCADA 43">KASCADA 43</option>
                                <option value="J43">J43</option>
                                <option value="DUALOS C">DUALOS C</option>
                                <option value="EQUINOX">EQUINOX</option>
                                <option value="DUALOS">DUALOS</option>
                                <option value="VIRIDIAN WIDE SCREEN">VIRIDIAN WIDE SCREEN</option>
                                <option value="ARC">ARC</option>
                                <option value="HELIX C">HELIX C</option>
                                <option value="V27">V27</option>
                                <option value="MARSX UPRIGHT">MARSX UPRIGHT</option>
                                <option value="HELIX+ UPRIGHT">HELIX+ UPRIGHT</option>
                                <option value="PROWAVE">PROWAVE</option>
                                <option value="GENESIS CREST">GENESIS CREST</option>
                                <option value="HELIX+ SLANT">HELIX+ SLANT</option>
                                <option value="HELIX XT">HELIX XT</option>
                                <option value="MUSO T27">MUSO T27</option>
                                <option value="CUBE X V40">CUBE X V40</option>
                                <option value="HELIX SLANT">HELIX SLANT</option>
                                <option value="EQUINOX SLV">EQUINOX SLV</option>
                                <option value="HELIX C+">HELIX C+</option>
                                <option value="SPEAR 27">SPEAR 27</option>
                                <option value="CUBEX STEPPER">CUBEX STEPPER</option>
                                <option value="CRYSTAL DUAL G23">CRYSTAL DUAL G23</option>
                                <option value="MARSX PORTRAIT">MARSX PORTRAIT</option>
                                <option value="HELIX + UPRIGHT">HELIX + UPRIGHT</option>
                                <option value="MUSO CURVE 43">MUSO CURVE 43</option>
                                <option value="CRYSTAL CURVE 43">CRYSTAL CURVE 43</option>
                                <option value="CRYSTAL CURVE DUAL 27">CRYSTAL CURVE DUAL 27</option>
                                <option value="DRACO S">DRACO S</option>
                                <option value="S3000">S3000</option>
                                <option value="CRYSTAL DUAL 27">CRYSTAL DUAL 27</option>
                                <option value="CRYSTAL DUAL 23">CRYSTAL DUAL 23</option>
                              </select>
                            ) : field === "MANUFACTURER" ? (
                              <select
                                value={editingMachine[field] ?? ""}
                                onChange={(e) =>
                                  setEditingMachine({ ...editingMachine, [field]: e.target.value })
                                }
                                className="border p-2 rounded w-full dark:bg-gray-700 dark:text-white"
                              >
                                <option value="LNW">LNW</option>
                                <option value="ARISTOCRAT">ARISTOCRAT</option>
                                <option value="ARUZE">ARUZE</option>
                                <option value="SEGA SAMMY">SEGA SAMMY</option>
                                <option value="IGT">IGT</option>
                                <option value="PLAYTECH">PLAYTECH</option>
                                <option value="VELA PLAY">VELA PLAY</option>
                              </select>
                            ) : ["MAIN SCD VERSION", "TOP SCD VERSION"].includes(field) ? (
                              <textarea
                                value={editingMachine[field] ?? ""}
                                onChange={(e) =>
                                  setEditingMachine({ ...editingMachine, [field]: e.target.value })
                                }
                                className="border p-5 rounded w-full h-28 dark:bg-gray-700 dark:text-white resize-y"
                              />
                            ) : (
                              <input
                                value={editingMachine[field] ?? ""}
                                onChange={(e) =>
                                  setEditingMachine({ ...editingMachine, [field]: e.target.value })
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
                <button
                  onClick={closeModal}
                  className="p-2 border rounded bg-gray-200 dark:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="p-2 border rounded bg-blue-600 text-white"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Modal */}
        {viewingMachine && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 dark:text-white p-6 rounded max-h-[90vh] overflow-auto w-full max-w-4xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Machine Details</h2>
                <button
                  onClick={() => setViewingMachine(null)}
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
                      <span>{openCategories.includes(cat.title) ? "−" : "+"}</span>
                    </button>
                    {openCategories.includes(cat.title) && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {cat.fields.map((field) => (
                          <div key={field} className="flex flex-col text-sm">
                            <span className="mb-1 font-semibold">{field}</span>
                            {["MAIN SCD VERSION", "TOP SCD VERSION"].includes(field) ? (
                              <div className="border p-3 rounded w-full whitespace-pre-wrap break-words dark:bg-gray-700 dark:text-white">
                                {viewingMachine[field] ?? ""}
                              </div>
                            ) : (
                              <div className="border p-2 rounded w-full dark:bg-gray-700 dark:text-white">
                                {viewingMachine[field] ?? ""}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setViewingMachine(null)}
                  className="p-2 border rounded bg-gray-200 dark:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Drawer (responsive: bottom on mobile, right on desktop) */}
        {showFilters && (
          <div className="fixed inset-0 z-50">
            {/* Overlay (fade) */}
            <div
              className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
              onClick={() => setShowFilters(false)}
            />

            {/* Drawer */}
            <div
              // slide from bottom (mobile) or from right (md+)
              className={`absolute bg-white dark:bg-gray-800 dark:text-white w-full md:w-96 max-h-[90vh] overflow-auto
                transform transition-transform duration-300 ease-in-out
                bottom-0 md:bottom-auto md:top-0 md:right-0
                rounded-t-2xl md:rounded-none shadow-lg
                translate-y-0 md:translate-x-0`}
              style={{
                // initial hidden transform is handled by mounting only when showFilters=true,
                // but we keep CSS transitions for smoothness.
              }}
            >
              <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-600 hover:text-black dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Show only selected categories and exclude certain fields */}
                {categories
                  .filter((cat) => FILTER_CATEGORIES.includes(cat.title))
                  .map((cat) => (
                    <div key={cat.title}>
                      <h3 className="font-semibold mb-2">{cat.title}</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {cat.fields
                          .filter((f) => !EXCLUDE_FIELDS.includes(f))
                          .map((field) => (
                            <select
                              key={field}
                              value={filters[field] || ""}
                              onChange={(e) => {
                                setFilters({ ...filters, [field]: e.target.value });
                                setCurrentPage(1);
                              }}
                              className="border p-2 rounded w-full dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">{field}</option>
                              {uniqueValues(field).map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="p-4 border-t dark:border-gray-700 flex justify-between">
                <button
                  onClick={() => {
                    setFilters({
                      FLOOR: "",
                      "MACHINE STATUS": "",
                      "POWER STATUS": "",
                      "CABINET MODEL": "",
                      MANUFACTURER: "",
                    });
                    setCurrentPage(1);
                  }}
                  className="p-2 border rounded bg-gray-200 dark:bg-gray-700"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    // Apply filters and auto-close drawer
                    setShowFilters(false);
                    setCurrentPage(1);
                  }}
                  className="p-2 border rounded bg-blue-600 text-white"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded shadow">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
function DeleteConfirmDialog({ machineName, onConfirm, onCancel }) {
          return (
            <motion.div
              className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-6 w-[90%] max-w-sm"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <h2 className="text-lg font-semibold text-center mb-4">
                  Confirm Deletion
                </h2>
                <p className="text-center text-sm text-gray-600 dark:text-gray-300 mb-6">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{machineName || "this machine"}</span>?
                  <br />
                  This action cannot be undone.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        };