import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
    id: number;
    type: ToastType;
    title?: string;
    message: string;
    duration: number;
}

interface ToastContextValue {
    toast: (
        message: string,
        options?: { type?: ToastType; title?: string; duration?: number }
    ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within a ToastProvider");
    return ctx;
};

const TOAST_STYLES: Record<ToastType, { icon: LucideIcon; iconClass: string; borderClass: string; barClass: string }> = {
    success: {
        icon: CheckCircle2,
        iconClass: "text-emerald-600",
        borderClass: "border-emerald-200",
        barClass: "bg-emerald-600",
    },
    error: {
        icon: AlertCircle,
        iconClass: "text-rose-600",
        borderClass: "border-rose-200",
        barClass: "bg-rose-600",
    },
    warning: {
        icon: AlertTriangle,
        iconClass: "text-amber-600",
        borderClass: "border-amber-200",
        barClass: "bg-amber-600",
    },
    info: {
        icon: Info,
        iconClass: "text-blue-600",
        borderClass: "border-blue-200",
        barClass: "bg-blue-600",
    },
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const idRef = useRef(0);

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toast = useCallback<ToastContextValue["toast"]>((message, options) => {
        const id = ++idRef.current;
        const type = options?.type ?? "info";
        const duration = options?.duration ?? 5000;
        setToasts((prev) => [...prev, { id, type, message, title: options?.title, duration }]);
        if (duration > 0) {
            window.setTimeout(() => dismiss(id), duration);
        }
    }, [dismiss]);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}

            {/* Toast Viewport */}
            <div
                className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
                aria-live="polite"
            >
                {toasts.map((t) => {
                    const styles = TOAST_STYLES[t.type];
                    const Icon = styles.icon;
                    return (
                        <div
                            key={t.id}
                            role="status"
                            className={`pointer-events-auto relative overflow-hidden rounded-xl border ${styles.borderClass} bg-white/95 backdrop-blur-md shadow-xl p-4 pr-10 animate-[toast-in_0.25s_ease-out]`}
                        >
                            <div className="flex items-start gap-3">
                                <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${styles.iconClass}`} />
                                <div className="min-w-0">
                                    {t.title && (
                                        <div className="text-sm font-bold text-slate-900 leading-snug">{t.title}</div>
                                    )}
                                    <div className={`text-xs text-slate-600 leading-relaxed ${t.title ? "mt-1" : ""}`}>
                                        {t.message}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => dismiss(t.id)}
                                className="absolute top-3 right-3 p-0.5 text-slate-400 hover:text-slate-700 transition-colors"
                                aria-label="Dismiss notification"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            {t.duration > 0 && (
                                <div
                                    className={`absolute bottom-0 left-0 h-0.5 ${styles.barClass} opacity-70`}
                                    style={{ animation: `toast-progress ${t.duration}ms linear forwards` }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}
