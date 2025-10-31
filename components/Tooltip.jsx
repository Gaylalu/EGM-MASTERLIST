"use client";

export default function Tooltip({ children, text, show }) {
  return show ? (
    <div className="relative group">
      {children}
      <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {text}
      </span>
    </div>
  ) : (
    children
  );
}
