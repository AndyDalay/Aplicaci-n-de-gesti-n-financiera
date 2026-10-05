import { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

export function Modal({ open, onClose, title, children, color = "bg-paper" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; color?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-center justify-center p-3"
          style={{ height: "100dvh" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className={`${color} sketch-border sketch-shadow-lg rounded-3xl w-full max-w-md overflow-hidden flex flex-col my-auto`}
            style={{ maxHeight: "82dvh" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-ink bg-white/60">
              <h3 className="font-display text-2xl">{title}</h3>
              <button onClick={onClose} className="sketch-border rounded-full bg-white p-1.5 sketch-shadow-sm">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
