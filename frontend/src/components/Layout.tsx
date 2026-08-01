import { Link, Outlet, useLocation } from "react-router-dom";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5 group">
              <img src="/logo.png" alt="TicketRush Logo" className="w-8 h-8 object-contain group-hover:scale-105 transition-transform drop-shadow-sm" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                TicketRush
              </span>
            </Link>

            <nav className="flex items-center gap-5 text-sm font-medium text-slate-300">
              <Link
                to="/"
                className={`transition-colors hover:text-brand-gold ${
                  location.pathname === "/" ? "text-white font-bold" : "text-slate-400"
                }`}
              >
                Home
              </Link>
              <Link
                to="/events"
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all duration-300 flex items-center gap-1.5 ${
                  location.pathname === "/events"
                    ? "bg-brand-purple text-white shadow-glow-purple scale-105"
                    : "bg-slate-800/80 border border-slate-700 hover:border-brand-purple/50 text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>Explore Events</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <img src="/logo.png" alt="TicketRush" className="h-6 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity" />
            <span className="font-bold tracking-tight text-slate-300">TicketRush</span>
          </div>
          <p>© {new Date().getFullYear()} TicketRush. High-Volume Booking Demo.</p>
        </div>
      </footer>
    </div>
  );
}
