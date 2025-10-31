"use client";
import { motion } from "framer-motion";

export default function DeleteConfirmDialog({ machineName, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 max-w-sm w-full text-center space-y-4 border dark:border-gray-700"
      >
        <h2 className="text-xl font-semibold text-red-600">Confirm Deletion</h2>
        <p className="text-gray-700 dark:text-gray-300">
          Are you sure you want to delete{" "}
          <span className="font-bold">{machineName || "this machine"}</span>?
        </p>

        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-700 text-black dark:text-white hover:bg-gray-400 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-semibold text-white ${
              loading ? "bg-red-400" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
