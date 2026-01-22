import { Link, Outlet, useLocation } from "react-router-dom";
import { Ticket } from "lucide-react";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-gradient-to-tr from-indigo-500 to-purple-500 p-2 rounded-lg group-hover:scale-105 transition-transform">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                TicketRush
              </span>
            </Link>

            <nav className="flex gap-4 text-sm font-medium text-slate-400">
               {location.pathname !== "/" && (
                  <Link to="/" className="hover:text-white transition-colors">
                    Back to Events
                  </Link>
               )}
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
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} TicketRush. High-Volume Booking Demo.</p>
        </div>
      </footer>
    </div>
  );
}
