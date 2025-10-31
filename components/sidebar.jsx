"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Users, Menu, X, ChevronDown, ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "./providers";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, name, image, loading, logout } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mapsOpen, setMapsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const mapLocations = [
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
  
  const [expandedFloors, setExpandedFloors] = useState(
    mapLocations.reduce((acc, f) => ({ ...acc, [f]: false }), {})
  );

  const toggleFloor = (floor) =>
    setExpandedFloors((prev) => ({ ...prev, [floor]: !prev[floor] }));

  const mainMenuItems = [
    { name: "Dashboard", href: "/dashboard", icon: "📊" },
    { name: "Machines", href: "/machines", icon: "📋" },
    { name: "Jackpot", href: "/jackpot", icon: "🎰" },
  ];

  const branchesMenuItems = [
    { name: "JCU", href: "/jcu", icon: "🎮" },
    { name: "JPC", href: "/jpc", icon: "💻" },
  ];

  const orgChartMenuItems = [
    { name: "Team Structure", href: "/team", icon: <Users size={16} /> },
  ];

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const sidebarTitle = (() => {
    if (pathname.startsWith("/dashboard")) return "📊 Dashboard";
    if (pathname.startsWith("/jackpot")) return "🎰 Jackpot";
    if (pathname.startsWith("/machines")) return "📋 Machines";
    if (pathname.startsWith("/jcu")) return "🎮 JCU";
    if (pathname.startsWith("/jpc")) return "💻 JPC";
    if (pathname.startsWith("/team")) return "👥 Org Chart";
    return "";
  })();

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center w-8 h-8 bg-gray-700 rounded hover:bg-gray-600"
        >
          <Menu size={20} />
        </button>
        <span className="md:hidden text-gray-200 text-lg font-bold">
          {sidebarTitle}
        </span>
      </div>

      {/* User Info */}
      {loading ? (
        <p className="text-xs text-gray-500 mb-4">Loading user...</p>
      ) : user ? (
        <div className="mb-4 flex items-center gap-3 border-b border-gray-700 pb-3">
          <img
            src={
              image ||
              "https://ui-avatars.com/api/?name=" +
                encodeURIComponent(name || user?.email || "User") +
                "&background=random"
            }
            alt="Profile"
            className="w-10 h-10 rounded-full border border-gray-600 object-cover"
          />
          <div>
            <p className="font-semibold text-gray-100">
              {name || user?.user_metadata?.full_name || user?.email?.split("@")[0]}
            </p>
            <p className="text-gray-400 text-xs">{role || "No role assigned"}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500 mb-4">Not logged in</p>
      )}

      {/* Main Menu */}
      <nav className="flex flex-col gap-3 flex-grow">
        {mainMenuItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-gray-100 hover:bg-gray-700 ${
                isActive ? "bg-gray-700 font-semibold" : ""
              }`}
            >
              {item.icon} {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      {!collapsed && (
        <div className="mt-auto">
          <div className="border-t border-gray-700 my-4" />

          {/* Branches */}
          <h2 className="text-sm font-semibold text-gray-400 mb-2">Branches</h2>
          <nav className="flex flex-col gap-3 mb-4">
            {branchesMenuItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-gray-100 hover:bg-gray-700 ${
                    isActive ? "bg-gray-700 font-semibold" : ""
                  }`}
                >
                  {item.icon} {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Maps */}
          <button
            onClick={() => setMapsOpen(!mapsOpen)}
            className="flex justify-between items-center w-full px-3 py-2 rounded-lg text-gray-400 font-semibold hover:bg-gray-700"
          >
            <span>Maps</span>
            {mapsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {mapsOpen &&
            mapLocations.map((loc) => (
              <div key={loc} className="flex flex-col gap-1 pl-4">
                <button
                  onClick={() => toggleFloor(loc)}
                  className="flex justify-between items-center w-full px-3 py-2 rounded-lg text-gray-400 font-semibold hover:bg-gray-700"
                >
                  🗺️ {loc} {expandedFloors[loc] ? "▾" : "▸"}
                </button>
                {expandedFloors[loc] && (
                  <div className="flex flex-col ml-4 gap-1">
                    <Link
                      href={`/map/${loc
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/\//g, "")}?status=machine`}
                      className="pl-4 text-gray-100 hover:bg-gray-700 rounded"
                    >
                      ⚙️ Machine Status
                    </Link>
                    <Link
                      href={`/map/${loc
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/\//g, "")}?status=power`}
                      className="pl-4 text-gray-100 hover:bg-gray-700 rounded"
                    >
                      🔌 Power Status
                    </Link>
                  </div>
                )}
              </div>
            ))}

          {/* Org Chart */}
          <div className="border-t border-gray-700 my-4" />
          <nav className="flex flex-col gap-3">
            {orgChartMenuItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-gray-100 hover:bg-gray-700 ${
                    isActive ? "bg-gray-700 font-semibold" : ""
                  }`}
                >
                  {item.icon} {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Management */}
          {user && !["System Support"].includes(role) && (
            <>
              <div className="border-t border-gray-700 my-4" />
              <Link
                href="/user-management"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-gray-100 hover:bg-gray-700 ${
                  pathname.startsWith("/user-management")
                    ? "bg-gray-700 font-semibold"
                    : ""
                }`}
              >
                👤 User Management
              </Link>
            </>
          )}

          {/* Logout */}
          {user && (
            <>
              <div className="border-t border-gray-700 my-4" />
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full flex items-center gap-2 px-3 py-2 bg-red-600 rounded-lg hover:bg-red-700 text-sm text-white"
              >
                <LogOut size={16} />
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 left-0 h-screen bg-gray-900 p-4 transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
        style={{ overflowY: "visible", overflowX: "hidden", zIndex: 40 }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 bg-gray-700 rounded"
        >
          <Menu size={20} />
        </button>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => setMobileOpen(false)}
            />
            <aside
              className="relative w-64 bg-gray-900 p-4 flex flex-col h-screen"
              style={{ overflowY: "visible", overflowX: "hidden" }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="self-end mb-4 p-2 bg-gray-700 rounded"
              >
                <X size={20} />
              </button>
              <SidebarContent />
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
