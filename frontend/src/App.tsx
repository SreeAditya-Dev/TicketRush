import { useState, useEffect, useCallback } from "react";
import { getSeats, bookSeat, BookSeatResult } from "./api";
import { Seat, BookingStrategy } from "./types";

export default function App() {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<BookingStrategy>("locked");
  const [toasts, setToasts] = useState<{ id: number; msg: string; ok: boolean }[]>([]);
  const [userId] = useState(() => `user-${Math.random().toString(36).slice(2, 9)}`);

  const showToast = (msg: string, ok: boolean) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, ok }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  const fetchSeats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSeats();
      setSeats(data);
    } catch {
      showToast("Failed to load seats", false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeats();
    const interval = setInterval(fetchSeats, 3000);
    return () => clearInterval(interval);
  }, [fetchSeats]);

  const handleBook = async (code: string) => {
    setProcessing(code);
    const result: BookSeatResult = await bookSeat(code, userId, strategy);
    showToast(result.message, result.ok);
    await fetchSeats();
    setProcessing(null);
  };

  const bookedCount = seats.filter((s) => s.isBooked).length;
  const availableCount = seats.length - bookedCount;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full py-6 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 shadow-lg">
        <div className="max-w-5xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight">🎫 TicketRush</h1>
          <p className="text-sm opacity-80">High‑Volume Event Booking Demo</p>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded bg-emerald-500" />
              Available ({availableCount})
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-4 h-4 rounded bg-red-500" />
              Booked ({bookedCount})
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="strategy" className="font-medium">Booking Strategy:</label>
            <select
              id="strategy"
              className="bg-slate-700 px-2 py-1 rounded focus:outline-none"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as BookingStrategy)}
            >
              <option value="locked">🔒 Locked (safe)</option>
              <option value="naive">⚠️ Naive (race demo)</option>
            </select>
          </div>
        </div>

        {/* STAGE / SCREEN representation */}
        <div className="mb-8 text-center">
          <div className="inline-block bg-slate-700 rounded-xl px-12 py-2 text-xs uppercase tracking-widest font-semibold">
            Stage
          </div>
        </div>

        {loading && seats.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-lg">Loading seats...</div>
        ) : (
          <div className="grid grid-cols-10 gap-2 sm:gap-3">
            {seats.map((seat) => {
              const isBooked = seat.isBooked;
              const isProcessing = processing === seat.code;
              return (
                <button
                  key={seat.id}
                  disabled={isBooked || isProcessing}
                  onClick={() => handleBook(seat.code)}
                  title={isBooked ? `Booked` : `Book ${seat.code}`}
                  className={`
                    relative aspect-square rounded-lg flex items-center justify-center text-xs font-semibold
                    transition-all duration-150 ease-out
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-400
                    ${
                      isBooked
                        ? "bg-red-600/80 cursor-not-allowed text-red-200"
                        : "bg-emerald-600 hover:bg-emerald-500 hover:scale-105 active:scale-95 cursor-pointer text-white"
                    }
                    ${isProcessing ? "animate-pulse" : ""}
                  `}
                >
                  {seat.code.replace("S", "")}
                  {isProcessing && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <p className="text-xs text-center mt-8 text-slate-400">Your session: {userId}</p>
      </main>

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded shadow-lg text-sm font-medium ${
              t.ok ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
