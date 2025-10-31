"use client";
import { motion, AnimatePresence } from "framer-motion";

export default function BulkConfirmDialog({
  count,
  machineStatus,
  powerStatus,
  onConfirm,
  onCancel,
  loading,
}) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-[#1e1e2f] rounded-2xl shadow-2xl p-6 w-full max-w-md text-center border border-gray-700"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          <h2 className="text-xl font-semibold text-gray-100 mb-3">
            Confirm Bulk Update
          </h2>

          <p className="text-gray-300 mb-4">
            You are about to update{" "}
            <span className="font-bold text-blue-400">{count}</span>{" "}
            machine{count > 1 ? "s" : ""}.
          </p>

          <div className="bg-[#2b2b3c] rounded-lg p-3 mb-5 text-left text-sm border border-gray-700">
            <p className="mb-1">
              <span className="font-medium text-gray-200">Machine Status:</span>{" "}
              <span
                className={`${
                  machineStatus ? "text-blue-400 font-medium" : "text-gray-500"
                }`}
              >
                {machineStatus || "— no change —"}
              </span>
            </p>
            <p>
              <span className="font-medium text-gray-200">Power Status:</span>{" "}
              <span
                className={`${
                  powerStatus ? "text-blue-400 font-medium" : "text-gray-500"
                }`}
              >
                {powerStatus || "— no change —"}
              </span>
            </p>
          </div>

          <p className="text-xs text-gray-500 mb-5">
            Please confirm before applying. This will update all selected
            machine records in Supabase.
          </p>

          <div className="flex justify-center gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium transition"
            >
              Cancel
            </button>

            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
            >
              {loading ? "Saving..." : "Apply Changes"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
