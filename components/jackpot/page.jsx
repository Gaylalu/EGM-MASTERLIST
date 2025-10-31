"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function JackpotPage() {
  const [jackpotGroups, setJackpotGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("theme");

  const searchTimeout = useRef(null);

  useEffect(() => {
    fetchJackpotData();
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      applyFilterAndSort();
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [search, sortField, jackpotGroups]);

  const fetchJackpotData = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("machines")
      .select(
        '"id","MACHINE #","JACKPOT THEME","JACKPOT TYPE","JACKPOT CONTROLLER","PROGRESSIVE JACKPOT LINK ID"'
      )
      .not('"JACKPOT THEME"', "is", null);

    if (error) {
      console.error("Error fetching jackpot data:", error);
      setLoading(false);
      return;
    }

    const groups = {};
    data.forEach((row) => {
      const key = `${row["JACKPOT THEME"]}|${row["JACKPOT TYPE"]}|${row["JACKPOT CONTROLLER"]}|${row["PROGRESSIVE JACKPOT LINK ID"]}`;
      if (!groups[key]) {
        groups[key] = {
          theme: row["JACKPOT THEME"],
          type: row["JACKPOT TYPE"],
          controller: row["JACKPOT CONTROLLER"],
          linkId: row["PROGRESSIVE JACKPOT LINK ID"],
          machines: [],
        };
      }
      groups[key].machines.push(row["MACHINE #"]);
    });

    setJackpotGroups(Object.values(groups));
    setLoading(false);
  };

  const applyFilterAndSort = () => {
    let groups = [...jackpotGroups];

    if (search.trim() !== "") {
      const lowerSearch = search.toLowerCase();
      groups = groups.filter(
        (g) =>
          g.theme.toLowerCase().includes(lowerSearch) ||
          g.type.toLowerCase().includes(lowerSearch) ||
          g.controller.toLowerCase().includes(lowerSearch) ||
          g.linkId.toLowerCase().includes(lowerSearch) ||
          g.machines.some((m) => m.toLowerCase().includes(lowerSearch))
      );
    }

    groups.sort((a, b) => {
      const aVal = a[sortField] || "";
      const bVal = b[sortField] || "";
      return aVal.localeCompare(bVal);
    });

    setFilteredGroups(groups);
  };

  const toggleGroup = (index) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const highlightText = (text) => {
    if (!search) return text;
    const regex = new RegExp(`(${search})`, "gi");
    return text.split(regex).map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-300 dark:bg-yellow-600">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const exportCSV = () => {
    const rows = [
      ["Jackpot Theme", "Jackpot Type", "Jackpot Controller", "Progressive Link ID", "Machines"],
      ...filteredGroups.map((g) => [
        g.theme,
        g.type,
        g.controller,
        g.linkId,
        g.machines.join(", "),
      ]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," +
      rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "jackpot_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <p>Loading Jackpot Information...</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">🎰 Jackpot Information</h1>

          {/* Search & Sort & Export */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <input
                type="text"
                placeholder="Search Jackpot / Machine..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 sm:w-64"
              />

              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              >
                <option value="theme">Jackpot Theme</option>
                <option value="type">Jackpot Type</option>
                <option value="controller">Jackpot Controller</option>
                <option value="linkId">Progressive Link ID</option>
              </select>
                  <button
                onClick={exportCSV}
                className="px-3 py-2 rounded-md bg-green-500 text-white hover:bg-green-600"
              >
                Export CSV
              </button>
            </div>
          </div>


      {filteredGroups.length === 0 ? (
        <p>No Jackpot data available.</p>
      ) : (
        filteredGroups.map((group, idx) => (
          <div
            key={idx}
            className="bg-gray-200 dark:bg-gray-800 rounded-lg shadow-md"
          >
            {/* Header */}
            <button
              onClick={() => toggleGroup(idx)}
              className="w-full flex justify-between items-center p-4 text-left font-semibold hover:bg-gray-300 dark:hover:bg-gray-700"
            >
              <span>
                {highlightText(group.theme)} 🎰 ({group.machines.length} Machines)
              </span>
              <span>{expandedGroups[idx] ? "▼" : "▶"}</span>
            </button>

            {/* Collapsible Content */}
            {expandedGroups[idx] && (
              <div className="px-4 pb-4 space-y-1">
                <p>
                  <strong>Jackpot Type:</strong> {highlightText(group.type)}
                </p>
                <p>
                  <strong>Jackpot Controller:</strong> {highlightText(group.controller)}
                </p>
                <p>
                  <strong>Progressive Link ID:</strong> {highlightText(group.linkId)}
                </p>
                <p>
                  <strong>Machines:</strong>{" "}
                  {group.machines.map((m, i) => (
                    <span key={i}>{highlightText(m)}{i < group.machines.length - 1 ? ", " : ""}</span>
                  ))}
                </p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
