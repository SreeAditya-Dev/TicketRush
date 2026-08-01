import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f9] text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Floating Capsule Header */}
      <div className="sticky top-3 sm:top-5 z-50 px-4 sm:px-6 max-w-5xl mx-auto w-full my-3 sm:my-4 pointer-events-none">
        <header className="bg-slate-950/95 backdrop-blur-2xl border border-slate-800/80 shadow-2xl shadow-slate-950/25 rounded-full px-5 sm:px-6 py-2.5 flex items-center justify-between pointer-events-auto transition-all duration-300">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img 
              src="/logo.png" 
              alt="TicketRush Logo" 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-contain group-hover:scale-105 transition-transform shadow-sm border border-slate-700 bg-white/10 p-0.5" 
            />
            <span className="text-lg sm:text-xl font-black text-white tracking-tight">
              TicketRush
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4 text-sm font-medium">
            <Link
              to="/"
              className={`transition-all duration-200 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold ${
                location.pathname === "/" 
                  ? "bg-white/15 text-white font-bold shadow-2xs" 
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              Home
            </Link>
            <Link
              to="/events"
              className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all duration-300 flex items-center gap-1.5 active:scale-95 ${
                location.pathname === "/events"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.03]"
                  : "bg-white text-slate-950 hover:bg-blue-600 hover:text-white shadow-md shadow-black/20 hover:shadow-blue-600/25"
              }`}
            >
              <span>Explore Events</span>
            </Link>
          </nav>
        </header>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
          <div className="flex items-center gap-2 text-slate-800">
            <img src="/logo.png" alt="TicketRush" className="h-7 w-7 rounded-lg object-contain opacity-95 hover:opacity-100 transition-opacity border border-slate-200 shadow-2xs" />
            <span className="font-black tracking-tight text-slate-900">TicketRush</span>
          </div>
          <p className="text-slate-500 text-xs">© {new Date().getFullYear()} TicketRush. High-Volume Booking Demo.</p>
        </div>
      </footer>
    </div>
  );
}
