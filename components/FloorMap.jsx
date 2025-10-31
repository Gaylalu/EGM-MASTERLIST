"use client";

import { useAuth } from "../app/providers";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useSearchParams } from "next/navigation";

export default function FloorMap({ initialFloor = "CYBER STUDIO" }) {
  const { role } = useAuth();
  const isSystemSupport = role === "System Support";
  const mapRef = useRef(null);
  const GRID_PX = 40;
  const BOX_W = 80;
  const BOX_H = 35;

  const floors = [
    "CYBER STUDIO",
    "GREEN ROOM",
    "GF LEFT WING",
    "GF RIGHT WING",
    "2F LEFT WING",
    "2F RIGHT WING",
    "H1/F",
    "H2/F",
    "H3/F",
  ];

  const backgroundImage = "/floors/floor-map.jpg"; // adjust path if needed

  // Machine status gradients
  const statusColors = {
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

  // Power status classes (Tailwind utility strings)
  const powerStatusColors = {
    on: "bg-green-600 text-white",
    off: "bg-red-600 text-white",
    unknown: "bg-gray-400 text-white",
  };

  const searchParams = useSearchParams();
  const statusTypeParam = searchParams.get("status") || "machine"; // "machine" | "power"

  // --- state ---
  const [floor] = useState(initialFloor || floors[0]);
  const [machines, setMachines] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [mode, setMode] = useState("single"); // single | multi | all
  const [selectedIds, setSelectedIds] = useState([]);
  const [dragState, setDragState] = useState(null);
  const [dragCoords, setDragCoords] = useState(null);
  const [selRect, setSelRect] = useState({ active: false, x1: 0, y1: 0, x2: 0, y2: 0 });
  const [gridVisible, setGridVisible] = useState(false);
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // fetch + live subscribe
  useEffect(() => {
    fetchMachines();
    const channel = supabase
      .channel("machines-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "machines" }, fetchMachines)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor]);

  async function fetchMachines() {
    const { data, error } = await supabase.from("machines").select("*").eq("FLOOR", floor);
    if (error) {
      console.error("fetchMachines error:", error);
      return;
    }
    // ensure numeric x,y (they may be negative or >100)
    setMachines((data || []).map((r) => ({ ...r, x: Number(r.x ?? 0), y: Number(r.y ?? 0) })));
  }

  // auto-expand map minHeight based on machine positions (so negative and large positive coords fit)
  useEffect(() => {
    if (!mapRef.current) return;
    // base viewport height
    const vh = Math.max(window.innerHeight, 800);
    // find min and max Y among machines (percent)
    const ys = machines.map((m) => Number(m.y ?? 0));
    const minY = ys.length ? Math.min(...ys) : 0;
    const maxY = ys.length ? Math.max(...ys) : 100;
    // compute needed height: we treat 100% => vh (base), so percent -> px
    // expand top/bottom margins + padding
    const topExtraPx = Math.max(0, (Math.abs(Math.min(0, minY)) / 100) * vh + 200);
    const bottomExtraPx = Math.max(0, ((Math.max(100, maxY) - 100) / 100) * vh + 200);
    const newMinHeight = Math.max(vh + topExtraPx + bottomExtraPx, vh * 1.5);
    mapRef.current.style.minHeight = `${Math.ceil(newMinHeight)}px`;
  }, [machines]);

  // helper to compute background / classes
  const bgFor = (row) => {
    if (statusTypeParam === "machine") {
      return statusColors[(row["MACHINE STATUS"] || "").toLowerCase()] || "linear-gradient(90deg,#6b7280,#4b5563)";
    } else {
      const s = (row["POWER STATUS"] || "unknown").toLowerCase();
      return powerStatusColors[s] || powerStatusColors.unknown;
    }
  };

  // selection helpers
  const clearSelection = () => setSelectedIds([]);
  const toggleSelect = (id) => setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // search/filtered list
  const displayedMachines = machines.filter((m) => {
    if (!searchQuery) return true;
    const t = searchQuery.toString().toLowerCase();
    const label = (m["MACHINE #"] ?? "").toString().toLowerCase();
    return label.includes(t) || (m["MACHINE NAME"] ?? "").toString().toLowerCase().includes(t);
  });

  // when search changes, optionally highlight first match and scroll to it
  useEffect(() => {
    if (!searchQuery) {
      setHighlightedId(null);
      return;
    }
    const found = machines.find((m) =>
      (m["MACHINE #"] ?? "").toString().toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (found) {
      setHighlightedId(found.id);
      // scroll to element smoothly (centered)
      setTimeout(() => {
        const el = document.getElementById(`machine-${found.id}`);
        if (el && mapRef.current) {
          const scrollLeft = el.offsetLeft - mapRef.current.clientWidth / 2 + el.clientWidth / 2;
          const scrollTop = el.offsetTop - mapRef.current.clientHeight / 2 + el.clientHeight / 2;
          mapRef.current.scrollTo({ left: scrollLeft, top: scrollTop, behavior: "smooth" });
        }
      }, 50);
    } else {
      setHighlightedId(null);
    }
  }, [searchQuery, machines]);

  // --- Drag / multi-drag logic (group aligned + snapped while dragging) ---
  const onBoxMouseDown = (e, box) => {
    e.stopPropagation();
    if (!editMode) return;

    const rect = mapRef.current.getBoundingClientRect();

    // --- compute which boxes are being dragged ---
    let draggingIds = [];
    if (mode === "all") draggingIds = machines.map((m) => m.id);
    else if (mode === "multi") {
      const additive = e.shiftKey || e.ctrlKey;
      if (!selectedIds.includes(box.id) && !additive) setSelectedIds([box.id]);
      else if (additive) toggleSelect(box.id);
      draggingIds = selectedIds.length ? selectedIds : [box.id];
    } else {
      draggingIds = [box.id];
      setSelectedIds([box.id]);
    }

    // --- store each box’s initial pixel position ---
    const initialPositionsPx = {};
    draggingIds.forEach((id) => {
      const r = machines.find((m) => m.id === id);
      if (r) {
        initialPositionsPx[id] = {
          // allow negative % to map to pixel beyond top/left by using container rect as baseline
          x: ((r.x ?? 0) / 100) * rect.width,
          y: ((r.y ?? 0) / 100) * rect.height,
        };
      } else {
        initialPositionsPx[id] = { x: 0, y: 0 };
      }
    });

    // --- save history for undo ---
    setHistory((h) =>
      [...h, machines.map((r) => ({ id: r.id, x: r.x, y: r.y }))].slice(-20)
    );

    // --- update drag state ---
    setDragState({
      anchorId: box.id,
      draggingIds,
      initialMousePx: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      initialPositionsPx,
    });

    // --- safe access for display ---
    const init = initialPositionsPx[box.id] || { x: 0, y: 0 };
    setDragCoords({
      x: parseFloat(((init.x / rect.width) * 100).toFixed(2)),
      y: parseFloat(((init.y / rect.height) * 100).toFixed(2)),
    });
  };

  // Updated: allow negative coordinates and >100% while dragging
  const onMapMouseMove = (e) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (selRect.active) {
      // update selection rectangle while drawing
      return setSelRect((s) => ({ ...s, x2: e.clientX - rect.left, y2: e.clientY - rect.top }));
    }
    if (!dragState) return;

    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const curPx = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // delta from initial anchor
    let deltaPx = {
      x: curPx.x - dragState.initialMousePx.x,
      y: curPx.y - dragState.initialMousePx.y,
    };

    // snap delta to grid (in pixels)
    deltaPx.x = Math.round(deltaPx.x / GRID_PX) * GRID_PX;
    deltaPx.y = Math.round(deltaPx.y / GRID_PX) * GRID_PX;

    setMachines((prev) =>
      prev.map((row) => {
        if (!dragState.draggingIds.includes(row.id)) return row;
        const init = dragState.initialPositionsPx[row.id] || { x: 0, y: 0 };
        const newPxX = init.x + deltaPx.x;
        const newPxY = init.y + deltaPx.y;

        // convert px to percent (allow negatives and >100%)
        const newX = parseFloat(((newPxX / rect.width) * 100).toFixed(2));
        const newY = parseFloat(((newPxY / rect.height) * 100).toFixed(2));

        return { ...row, x: newX, y: newY };
      })
    );

    // update drag coords shown in toolbar (for anchor)
    const anchorInit = dragState.initialPositionsPx[dragState.anchorId] || { x: 0, y: 0 };
    const anchorNewPx = { x: anchorInit.x + deltaPx.x, y: anchorInit.y + deltaPx.y };
    setDragCoords({
      x: parseFloat(((anchorNewPx.x / rect.width) * 100).toFixed(2)),
      y: parseFloat(((anchorNewPx.y / rect.height) * 100).toFixed(2)),
    });
  };

  const onMapMouseUp = async () => {
    if (selRect.active) {
      // selection rectangle finished - compute selected machines
      const rect = mapRef.current.getBoundingClientRect();
      const x1 = Math.min(selRect.x1, selRect.x2);
      const y1 = Math.min(selRect.y1, selRect.y2);
      const x2 = Math.max(selRect.x1, selRect.x2);
      const y2 = Math.max(selRect.y1, selRect.y2);

      const selected = machines
        .filter((m) => {
          const cx = (m.x / 100) * rect.width;
          const cy = (m.y / 100) * rect.height;
          return cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2;
        })
        .map((m) => m.id);

      setIsPanning(false);
      setSelectedIds(selected);
      setSelRect({ active: false, x1: 0, y1: 0, x2: 0, y2: 0 });
      return;
    }

    if (!dragState) return;

    const rect = mapRef.current.getBoundingClientRect();

    // Snap and save to DB - snapping in pixels, but allow negative px values
    const toSave = dragState.draggingIds.map((id) => {
      const row = machines.find((m) => m.id === id);
      if (!row) return null;

      let pxX = (row.x / 100) * rect.width;
      let pxY = (row.y / 100) * rect.height;

      // final snap (allow negative px values to snap)
      pxX = Math.round(pxX / GRID_PX) * GRID_PX;
      pxY = Math.round(pxY / GRID_PX) * GRID_PX;

      // convert back to percent (can be negative or >100)
      const newX = parseFloat(((pxX / rect.width) * 100).toFixed(2));
      const newY = parseFloat(((pxY / rect.height) * 100).toFixed(2));

      // update local state so UI shows snapped position
      row.x = newX;
      row.y = newY;
      return { id, x: newX, y: newY };
    }).filter(Boolean);

    // persist
    await Promise.all(toSave.map(async (r) => {
      const { error } = await supabase.from("machines").update({ x: r.x, y: r.y }).eq("id", r.id);
      if (error) console.error("update error", error);
    }));

    toast.success(`Saved ${toSave.length} position(s)`);
    setDragState(null);
    setDragCoords(null);
  };

  const onMapMouseDown = (e) => {
    // start selection rect if in multi-mode draw area
    if (!editMode || mode !== "multi") return;
    const rect = mapRef.current.getBoundingClientRect();
    setSelRect({ active: true, x1: e.clientX - rect.left, y1: e.clientY - rect.top, x2: e.clientX - rect.left, y2: e.clientY - rect.top });
    setSelectedIds([]);

    if (isSpacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }
  };

  const setSingle = () => { setMode("single"); clearSelection(); };
  const setMulti = () => { setMode("multi"); clearSelection(); };
  const setAll = () => { setMode("all"); clearSelection(); };

  const undoLast = async () => {
    const last = history[history.length - 1];
    if (!last) return toast("Nothing to undo");
    setMachines((prev) => prev.map((r) => {
      const found = last.find((s) => s.id === r.id);
      return found ? { ...r, x: found.x, y: found.y } : r;
    }));
    await Promise.all(last.map(async (s) => {
      const { error } = await supabase.from("machines").update({ x: s.x, y: s.y }).eq("id", s.id);
      if (error) console.error(error);
    }));
    setHistory((h) => h.slice(0, -1));
    toast.success("Undo applied");
  };

  const exportCSV = () => {
    const rows = machines.map((m) => ({ id: m.id, machine: m["MACHINE #"], floor: m["FLOOR"], x: m.x, y: m.y }));
    const header = ["id", "machine", "floor", "x", "y"];
    const csv = [header.join(",")].concat(rows.map((r) => header.map((h) => `"${(r[h] ?? "").toString().replace(/\"/g, '""')}"`).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `machines_${floor.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!mapRef.current) return;
    // hide selection rect if present (just in case)
    const prevGrid = gridVisible;
    setGridVisible(false);
    await new Promise((res) => setTimeout(res, 80));
    const canvas = await html2canvas(mapRef.current, { backgroundColor: null, scale: 3, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`floor-map-${floor.replace(/\s+/g,"_")}.pdf`);
    setGridVisible(prevGrid);
  };

  return (
    <div className="relative h-[calc(100vh-1rem)] w-full flex flex-col bg-gray-100 dark:bg-gray-900">
      <Toaster position="bottom-center" />

      {/* Header */}
      <div className="p-3 flex items-center justify-between bg-gray-200 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">🗺️ Floor Map — {floor} ({statusTypeParam === "power" ? "Power Status" : "Machine Status"})</h3>
          <div className="hidden sm:flex items-center gap-2">
            {!isSystemSupport && (
              <button
                onClick={() => { setEditMode((s) => !s); setDragState(null); setSelRect({ active: false, x1: 0, y1: 0, x2: 0, y2: 0 }); setGridVisible(!editMode); }}
                className={`px-3 py-1 rounded ${editMode ? "bg-red-600 text-white" : "bg-blue-600 text-white"}`}
              >
                {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
              </button>
            )}
            <button onClick={exportPDF} className="px-3 py-1 rounded bg-green-600 text-white">📄 Export PDF</button>
            <button onClick={exportCSV} className="px-3 py-1 rounded bg-gray-600 text-white">📥 Export CSV</button>
          </div>
        </div>

        {/* Search + small controls */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="🔍 Search machine # or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
          />
          <div className="sm:hidden flex items-center gap-1">
            <button onClick={() => { setEditMode((s) => !s); setGridVisible(!editMode); }} className={`px-2 py-1 rounded ${editMode ? "bg-red-600 text-white" : "bg-blue-600 text-white"}`}>{editMode ? "Exit" : "Edit"}</button>
          </div>
        </div>
      </div>

      {/* Map container */}
      <div
        ref={mapRef}
        className="relative w-full h-[120vh] bg-gray-100 overflow-auto"
        onMouseMove={onMapMouseMove}
        onMouseUp={onMapMouseUp}
        onMouseDown={onMapMouseDown}
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          cursor: isSpacePressed ? (isPanning ? "grabbing" : "grab") : "default",
          backgroundImage: gridVisible
            ? `linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px),
              url(${backgroundImage})`
            : `url(${backgroundImage})`,
          backgroundSize: gridVisible
            ? `${GRID_PX}px ${GRID_PX}px, ${GRID_PX}px ${GRID_PX}px, cover`
            : "cover",
          backgroundPosition: "center",
        }}
      >
        {/* selection rectangle */}
        {selRect.active && (
          <div
            style={{
              position: "absolute",
              left: Math.min(selRect.x1, selRect.x2),
              top: Math.min(selRect.y1, selRect.y2),
              width: Math.abs(selRect.x2 - selRect.x1),
              height: Math.abs(selRect.y2 - selRect.y1),
              background: "rgba(59,130,246,0.12)",
              border: "1px solid rgba(59,130,246,0.6)",
              zIndex: 40,
              pointerEvents: "none",
            }}
          />
        )}

        {/* machines */}
        {displayedMachines.map((m) => {
          const left = `${Number(m.x ?? 0)}%`;
          const top = `${Number(m.y ?? 0)}%`;
          const isSelected = selectedIds.includes(m.id);
          const isDragging = dragState?.draggingIds?.includes(m.id) && !!dragState;
          const bg = bgFor(m); // either gradient string or tailwind class string
          const powerClasses = statusTypeParam === "power" ? bg : "";
          const machineStyleBg = statusTypeParam === "machine" ? { background: bg } : {};

          return (
            <div
              key={m.id}
              id={`machine-${m.id}`}
              onMouseDown={(e) => onBoxMouseDown(e, m)}
              className={`absolute flex items-center justify-center rounded-md border shadow-md select-none transition-transform duration-75
                ${isSelected ? "ring-2 ring-offset-1 ring-blue-400" : ""}
                ${isDragging ? "scale-105" : ""}
                ${powerClasses}`}
              style={{
                left,
                top,
                width: `${BOX_W}px`,
                height: `${BOX_H}px`,
                transform: "translate(-50%, -50%)",
                ...machineStyleBg,
                borderColor: "rgba(255, 255, 255, 0.23)",
                zIndex: isSelected ? 30 : 20,
                textAlign: "center",
                pointerEvents: editMode ? "auto" : "none",
              }}
            >
              <div
                style={{
                  pointerEvents: "none",
                  userSelect: "none",
                  padding: "6px 8px",
                  borderRadius: 6,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  lineHeight: 1,
                  textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                  background: statusTypeParam === "power" ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.35)",
                }}
              >
                {m["MACHINE #"] ?? `#${m.id}`}
              </div>
            </div>
          );
        })}

        {/* floating toolbar (edit mode) */}
        {editMode && (
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 18, zIndex: 80 }}>
            <div style={{ display: "flex", gap: 8, background: "rgba(0,0,0,0.6)", padding: "8px", borderRadius: 12, backdropFilter: "blur(4px)" }}>
              <button onClick={setSingle} style={{ padding: "6px 10px", borderRadius: 8, background: mode === "single" ? "#fff" : "transparent", color: mode === "single" ? "#000" : "#fff", fontWeight: 700 }}>🖱️ Single</button>
              <button onClick={setMulti} style={{ padding: "6px 10px", borderRadius: 8, background: mode === "multi" ? "#fff" : "transparent", color: mode === "multi" ? "#000" : "#fff", fontWeight: 700 }}>🧩 Multi</button>
              <button onClick={setAll} style={{ padding: "6px 10px", borderRadius: 8, background: mode === "all" ? "#fff" : "transparent", color: mode === "all" ? "#000" : "#fff", fontWeight: 700 }}>🌐 Move All</button>
              <div style={{ width: 1, background: "rgba(255,255,255,0.15)", margin: "0 6px" }} />
              <button onClick={() => setGridVisible((s) => !s)} style={{ padding: "6px 8px", borderRadius: 8, color: "#fff" }}>🔳 {gridVisible ? "Grid" : "No Grid"}</button>
              <button onClick={undoLast} style={{ padding: "6px 8px", borderRadius: 8, color: "#fff" }}>↩️ Undo</button>
              <button onClick={exportCSV} style={{ padding: "6px 8px", borderRadius: 8, color: "#fff" }}>📥 CSV</button>
              {dragCoords && <span style={{ color: "#fff", fontWeight: 600 }}>{`X: ${dragCoords.x}% Y: ${dragCoords.y}%`}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
