"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- Member Box ---
const roleColors = {
  "System Support Engineer Assistant Manager":
    "border-blue-500 bg-blue-100 dark:border-blue-400 dark:bg-blue-900/60",
  "System Support Engineer Supervisor":
    "border-green-500 bg-green-100 dark:border-green-400 dark:bg-green-900/60",
  "System Support Admin":
    "border-purple-500 bg-purple-100 dark:border-purple-400 dark:bg-purple-900/60",
  "Senior System Support Engineer":
    "border-yellow-500 bg-yellow-100 dark:border-yellow-400 dark:bg-yellow-900/60",
  "System Support Engineer":
    "border-teal-500 bg-teal-100 dark:border-teal-400 dark:bg-teal-900/60",
};

const MemberBox = ({ member, onClick, isSelected }) => {
  const roleClass =
    roleColors[member?.role] ||
    "border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800";

  return (
    <div
      onClick={() => onClick(member)}
      className={`p-4 border-2 rounded-lg flex flex-col items-center w-48 shadow-2xl backdrop-blur-md cursor-pointer hover:scale-105 transform transition ${
        isSelected ? "ring-4 ring-indigo-400 dark:ring-indigo-600" : ""
      } ${roleClass}`}
    >
      {member?.image_url ? (
        <div className="relative w-28 h-28 mb-3">
          <div className="absolute inset-0 rounded-full bg-white dark:bg-gray-800 shadow-lg"></div>
          <img
            src={member.image_url}
            alt={member.name}
            className="relative w-28 h-28 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
          />
        </div>
      ) : (
        <div className="w-28 h-28 rounded-full mb-3 bg-gray-300 dark:bg-gray-600 animate-pulse" />
      )}
      <p className="font-semibold text-center text-gray-900 dark:text-gray-100">
        {member?.name}
      </p>
      <p className="text-sm text-gray-700 dark:text-gray-300 text-center">
        {member?.role}
      </p>
    </div>
  );
};

export default function TeamPage() {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const modalRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      let { data, error } = await supabase
      .from("team")
      .select("*")
      .neq("role", "Super Admin") // 👈 hide Super Admin from the structure
      .order("level", { ascending: true })
      .order("position", { ascending: true });

      if (error) {
        console.error("Error fetching team:", error);
        return;
      }
      setMembers(data);
    };
    fetchData();
  }, []);

  // Close modal if clicked outside
  const handleClickOutside = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setSelectedMember(null);
    }
  };

  useEffect(() => {
    if (selectedMember) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedMember]);

  if (members.length === 0)
    return <p className="p-4 text-center text-gray-700 dark:text-gray-200">Loading team...</p>;

  const levels = [...new Set(members.map((m) => m.level))].sort((a, b) => a - b);

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
      <div className="bg-gray-100/25 dark:bg-gray-900/25 min-h-screen p-6">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
          SYSTEM SUPPORT DEPARTMENT
        </h1>
        <h2 className="text-xl font-semibold text-center mb-8 text-gray-800 dark:text-gray-300">
          ORGANIZATIONAL CHART
        </h2>

        <div className="flex flex-col items-center gap-y-12">
          {levels.map((lvl) => {
            const membersAtLevel = members
              .filter((m) => m.level === lvl)
              .sort((a, b) => a.position - b.position);

            return (
              <div key={lvl} className="flex justify-center gap-6 flex-wrap">
                {membersAtLevel.map((m) => (
                  <MemberBox
                    key={m.id}
                    member={m}
                    onClick={setSelectedMember}
                    isSelected={selectedMember?.id === m.id}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
{selectedMember && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div
      ref={modalRef}
      className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden"
    >
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://lfvyrhoikcbtcfjtvtwb.supabase.co/storage/v1/object/public/team-images/mod.jpg')",
        }}
      ></div>

      {/* Foreground content */}
      <div className="relative p-10 z-10 flex flex-col items-center text-center">
        {/* Close button */}
        <button
          className="absolute top-4 right-5 text-white font-bold text-3xl hover:text-red-500 transition drop-shadow-lg"
          onClick={() => setSelectedMember(null)}
        >
          &times;
        </button>

        {/* Image */}
        {selectedMember.image_url && (
          <img
            src={selectedMember.image_url}
            alt={selectedMember.name}
            className="w-48 h-48 rounded-full mb-6 border-4 border-gray-300 dark:border-gray-600 shadow-xl object-cover"
          />
        )}

        {/* Banner for name + role */}
        <div className="bg-black/50 px-6 py-3 rounded-xl mb-6 max-w-xl">
          <h3 className="text-3xl font-extrabold text-white drop-shadow-lg">
            {selectedMember.name}
          </h3>
          <p className="text-lg font-medium text-gray-100 drop-shadow-md">
            {selectedMember.role}
          </p>
        </div>

        {/* Extra details with glassy background */}
        <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg shadow-inner space-y-3 text-left max-w-xl mx-auto">
          {selectedMember.id_number && (
            <p className="text-md text-gray-100">
              🆔 <span className="font-semibold">ID Number:</span> {selectedMember.id_number}
            </p>
          )}
          {selectedMember.email && (
            <p className="text-md text-gray-100">
              📧 <span className="font-semibold">Email:</span> {selectedMember.email}
            </p>
          )}
          {selectedMember.contact && (
            <p className="text-md text-gray-100">
              📱 <span className="font-semibold">Contact:</span> {selectedMember.contact}
            </p>
          )}
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
