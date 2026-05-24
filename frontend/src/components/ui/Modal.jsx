import { useEffect } from "react";

export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-base/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-xl shadow-glow-md max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-border">
          <h2 className="text-text-primary font-medium">{title}</h2>
          <button
            onClick={onClose}
            className="border border-border hover:border-border-bright text-text-secondary hover:text-text-primary hover:bg-elevated transition-all duration-150 rounded p-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
