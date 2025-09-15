"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Pencil, Trash2, Copy } from "lucide-react";

export default function MachinesPage() {
  const [machines, setMachines] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function fetchMachines() {
      const { data, error } = await supabase.from("machines").select("*");
      if (error) {
        console.error(error);
      } else {
        setMachines(data);
      }
    }
    fetchMachines();
  }, []);

  const filtered = machines.filter((m) =>
    Object.values(m).some((val) =>
      String(val || "").toLowerCase().includes(query.toLowerCase())
    )
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        🛠️ Machines
      </h1>

      <input
        type="text"
        placeholder="Search machines..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border rounded px-3 py-2 w-full dark:bg-gray-800 dark:text-gray-100"
      />

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300 dark:border-gray-700">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="px-3 py-2 border">MACHINE #</th>
              <th className="px-3 py-2 border">MID</th>
              <th className="px-3 py-2 border">SLOT BASE</th>
              <th className="px-3 py-2 border">FLOOR</th>
              <th className="px-3 py-2 border">MACHINE STATUS</th>
              <th className="px-3 py-2 border">POWER STATUS</th>
              <th className="px-3 py-2 border">CABINET SERIAL</th>
              <th className="px-3 py-2 border">CABINET MODEL</th>
              <th className="px-3 py-2 border">MANUFACTURER</th>
              <th className="px-3 py-2 border">BATCH</th>
              <th className="px-3 py-2 border">EDITED BY</th>
              <th className="px-3 py-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr
                key={m.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td className="px-3 py-2 border">{m["MACHINE #"]}</td>
                <td className="px-3 py-2 border">{m["MID"]}</td>
                <td className="px-3 py-2 border">{m["SLOT BASE"]}</td>
                <td className="px-3 py-2 border">{m["FLOOR"]}</td>
                <td className="px-3 py-2 border">{m["MACHINE STATUS"]}</td>
                <td className="px-3 py-2 border">{m["POWER STATUS"]}</td>
                <td className="px-3 py-2 border">{m["CABINET SERIAL"]}</td>
                <td className="px-3 py-2 border">{m["CABINET MODEL"]}</td>
                <td className="px-3 py-2 border">{m["MANUFACTURER"]}</td>
                <td className="px-3 py-2 border">{m["BATCH"]}</td>
                <td className="px-3 py-2 border">{m["EDITED BY"]}</td>
                <td className="px-3 py-2 border flex gap-2">
                  <button className="text-blue-500 hover:text-blue-700">
                    <Pencil size={16} />
                  </button>
                  <button className="text-red-500 hover:text-red-700">
                    <Trash2 size={16} />
                  </button>
                  <button className="text-gray-500 hover:text-gray-700">
                    <Copy size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
