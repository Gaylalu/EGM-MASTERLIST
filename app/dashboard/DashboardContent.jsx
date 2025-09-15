"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { supabase } from "../../lib/supabaseClient";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// --- Helper: Export chart as PNG ---
function exportChart(ref, filename) {
  if (!ref.current) return;
  const svg = ref.current.querySelector("svg");
  if (!svg) return;

  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  img.onload = function () {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  img.src = url;
}

export default function DashboardContent() {
  const { theme, setTheme } = useTheme();
  const [machines, setMachines] = useState([]);
  const [filters, setFilters] = useState({
    FLOOR: "",
    "MACHINE STATUS": "",
    "POWER STATUS": "",
    "CABINET MODEL": "",
    MANUFACTURER: "",
  });

  // --- Chart Refs for Export ---
  const floorRef = useRef(null);
  const statusRef = useRef(null);
  const powerRef = useRef(null);
  const cabinetRef = useRef(null);
  const manufacturerRef = useRef(null);

  // --- Batch Fetch All Machines ---
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
  }

  useEffect(() => {
    loadAllMachines();
  }, []);

  // --- Filtering logic ---
  const filteredMachines = machines.filter((m) => {
    return Object.entries(filters).every(([field, value]) => {
      if (!value) return true;
      return (m[field] || "").trim() === value;
    });
  });

  // --- Dynamic Filter Options ---
  function uniqueValues(field) {
    return [
      ...new Set(
        machines
          .filter((m) => {
            let match = true;
            Object.entries(filters).forEach(([key, value]) => {
              if (key !== field && value && (m[key] || "").trim() !== value) {
                match = false;
              }
            });
            return match;
          })
          .map((m) => (m[field] ? m[field].trim() : "Unknown"))
          .filter(Boolean)
      ),
    ];
  }

  // --- Count Helper ---
  const getCounts = (field) => {
    const counts = {};
    filteredMachines.forEach((m) => {
      let value = m[field];
      if (typeof value === "string") value = value.trim();
      if (!value) value = "Unknown";
      counts[value] = (counts[value] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  // --- Data Sets ---
  const floorData = getCounts("FLOOR");
  const statusData = getCounts("MACHINE STATUS");
  const powerData = getCounts("POWER STATUS");
  const cabinetModelData = getCounts("CABINET MODEL");
  const manufacturerData = getCounts("MANUFACTURER");

  // --- Stats ---
  const totalMachines = filteredMachines.length;
  const totalOnline = filteredMachines.filter(
    (m) => m["POWER STATUS"]?.trim() === "ON"
  ).length;
  const totalOffline = filteredMachines.filter(
    (m) => m["POWER STATUS"]?.trim() === "OFF"
  ).length;
  const uniqueFloors = [
    ...new Set(filteredMachines.map((m) => m["FLOOR"]?.trim() || "Unknown")),
  ].length;

  const COLORS = [
    "#6366F1",
    "#F59E0B",
    "#10B981",
    "#EF4444",
    "#3B82F6",
    "#8B5CF6",
  ];

  return (
    <div className="space-y-6">
      {/* Header with Dark Mode Toggle */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          📊 Machine Dashboard
        </h1>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>

      {/* Multi-Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {Object.keys(filters).map((field) => (
          <select
            key={field}
            value={filters[field]}
            onChange={(e) =>
              setFilters({ ...filters, [field]: e.target.value })
            }
            className="border p-2 rounded dark:bg-gray-800 dark:text-gray-100"
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
          className="bg-gray-200 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Reset Filters
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 text-center">
          <p className="text-sm text-white-500 dark:text-gray-400">
            Total Machines
          </p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {totalMachines}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Online</p>
          <p className="text-2xl font-bold text-green-600">{totalOnline}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Offline</p>
          <p className="text-2xl font-bold text-red-600">{totalOffline}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Floors Covered
          </p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {uniqueFloors}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Floor Chart */}
        <div
          ref={floorRef}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4"
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Machines by Floor
            </h2>
            <button
              onClick={() => exportChart(floorRef, "floor_chart.png")}
              className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Export PNG
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={floorData}>
              <XAxis dataKey="name" stroke="#8884d8" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#6366F1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Chart */}
        <div
          ref={statusRef}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4"
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Machine Status
            </h2>
            <button
              onClick={() => exportChart(statusRef, "status_chart.png")}
              className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Export PNG
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="count"
                nameKey="name"
                outerRadius={100}
                label
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Power Chart */}
        <div
          ref={powerRef}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4"
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Power Status
            </h2>
            <button
              onClick={() => exportChart(powerRef, "power_chart.png")}
              className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Export PNG
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={powerData}>
              <XAxis dataKey="name" stroke="#8884d8" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cabinet Chart */}
        <div
          ref={cabinetRef}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4"
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Cabinet Models
            </h2>
            <button
              onClick={() => exportChart(cabinetRef, "cabinet_models_chart.png")}
              className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Export PNG
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cabinetModelData}>
              <XAxis dataKey="name" stroke="#8884d8" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Manufacturer Chart */}
        <div
          ref={manufacturerRef}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow p-4 md:col-span-2"
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Manufacturers
            </h2>
            <button
              onClick={() => exportChart(manufacturerRef, "manufacturers_chart.png")}
              className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Export PNG
            </button>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={manufacturerData}>
              <XAxis dataKey="name" stroke="#8884d8" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
