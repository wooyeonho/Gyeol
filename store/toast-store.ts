import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastState {
  toasts: Toast[];
  add: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (toast) => {
    const id = `toast-${toastId++}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    const ms = toast.duration ?? 4000;
    if (ms > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, ms);
    }
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience helpers */
export const toast = {
  success: (message: string, action?: Toast["action"]) =>
    useToastStore.getState().add({ type: "success", message, action }),
  error: (message: string, action?: Toast["action"]) =>
    useToastStore.getState().add({ type: "error", message, action }),
  info: (message: string, action?: Toast["action"]) =>
    useToastStore.getState().add({ type: "info", message, action }),
  warning: (message: string, action?: Toast["action"]) =>
    useToastStore.getState().add({ type: "warning", message, action }),
};
