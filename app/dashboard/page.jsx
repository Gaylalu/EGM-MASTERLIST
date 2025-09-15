"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient"; // Your Supabase client
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
import html2canvas from "html2canvas";

// --- Export chart using html2canvas ---
function exportChart(ref, filename) {
  if (!ref.current) return;
  html2canvas(ref.current, { backgroundColor: null, scale: 2 }).then((canvas) => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

// --- Export full dashboard including all scrollable content ---
function exportScrollableDashboard(ref, filename) {
  if (!ref.current) return;

  const listElements = ref.current.querySelectorAll("ul");
  const originalStyles = [];

  listElements.forEach((ul) => {
    originalStyles.push({
      el: ul,
      height: ul.style.height,
      maxHeight: ul.style.maxHeight,
      overflowY: ul.style.overflowY,
    });

    // Expand list to fit all items
    ul.style.height = `${ul.scrollHeight}px`;
    ul.style.maxHeight = "none";
    ul.style.overflowY = "visible";
  });

  html2canvas(ref.current, { backgroundColor: null, scale: 2 }).then((canvas) => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();

    // Restore original styles
    originalStyles.forEach(({ el, height, maxHeight, overflowY }) => {
      el.style.height = height;
      el.style.maxHeight = maxHeight;
      el.style.overflowY = overflowY;
    });
  });
}

export default function DashboardPage() {
  const [machines, setMachines] = useState([]);
  const [filters, setFilters] = useState({
    FLOOR: "",
    "MACHINE STATUS": "",
    "POWER STATUS": "",
    "CABINET MODEL": "",
    MANUFACTURER: "",
  });

  const dashboardRef = useRef(null);
  const floorRef = useRef(null);
  const statusRef = useRef(null);
  const powerRef = useRef(null);
  const cabinetRef = useRef(null);
  const manufacturerRef = useRef(null);

  // --- Fetch all machines in batches ---
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

  // --- Filtered machines ---
  const filteredMachines = machines.filter((m) =>
    Object.entries(filters).every(([field, value]) => {
      if (!value) return true;
      return (m[field] || "").trim() === value;
    })
  );

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

  // --- Chart data ---
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

  const COLORS = ["#6366F1", "#F59E0B", "#10B981", "#EF4444", "#3B82F6", "#8B5CF6"];

  return (
    <div ref={dashboardRef} className="space-y-6 dark:bg-gray-900 dark:text-gray-100 p-4">
      <h1 className="text-2xl font-bold">📊 Machine Dashboard</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {Object.keys(filters).map((field) => (
          <select
            key={field}
            value={filters[field]}
            onChange={(e) => setFilters({ ...filters, [field]: e.target.value })}
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

      {/* Filter summary */}
      <div className="text-sm bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded">
        {Object.entries(filters)
          .filter(([_, v]) => v)
          .map(([k, v]) => (
            <span key={k} className="mr-3">
              <strong>{k}:</strong> {v}
            </span>
          ))}
        {Object.values(filters).every((v) => !v) && <span>No filters applied</span>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Machines</p>
          <p className="text-2xl font-bold">{totalMachines}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Online</p>
          <p className="text-2xl font-bold text-green-600">{totalOnline}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Offline</p>
          <p className="text-2xl font-bold text-red-600">{totalOffline}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Floors Covered</p>
          <p className="text-2xl font-bold">{uniqueFloors}</p>
        </div>
      </div>

      {/* Mini Summary Tables */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
        {[
          { title: "Machines per Floor", data: floorData },
          { title: "Machine Status", data: statusData },
          { title: "Power Status", data: powerData },
          { title: "Cabinet Models", data: cabinetModelData },
          { title: "Manufacturers", data: manufacturerData },
        ].map((summary) => (
          <div
            key={summary.title}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 overflow-y-auto max-h-64"
          >
            <h2 className="text-lg font-semibold mb-2 dark:text-gray-100">{summary.title}</h2>
            <ul className="text-sm dark:text-gray-200">
              {summary.data.map((item) => (
                <li key={item.name} className="flex justify-between">
                  <span>{item.name}</span>
                  <span>{item.count}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Floor Chart */}
        <div ref={floorRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 md:col-span-2">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Machines by Floor</h2>
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

        {/* Machine Status Chart */}
        <div ref={statusRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Machine Status</h2>
            <button
              onClick={() => exportChart(statusRef, "status_chart.png")}
              className="text-sm px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Export PNG
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} dataKey="count" nameKey="name" outerRadius={100} label>
                {statusData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Power Status Chart */}
        <div ref={powerRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Power Status</h2>
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

        {/* Cabinet Model Chart */}
        <div ref={cabinetRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 md:col-span-2">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Cabinet Models</h2>
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
        <div ref={manufacturerRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow p-4 md:col-span-2">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">Manufacturers</h2>
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

      {/* Full dashboard export */}
      <button
        onClick={() => exportScrollableDashboard(dashboardRef, "dashboard.png")}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Export Full Dashboard
      </button>
    </div>
  );
}
