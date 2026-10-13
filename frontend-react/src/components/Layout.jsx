import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '../utils/helpers';
import {
  MessageSquare,
  Database,
  Settings,
  BarChart2,
  BookOpen,
  Sparkles,
  Bot,
  ChevronRight,
  Folder,
} from 'lucide-react';
import { healthCheckAPI } from '../services/api';

const navigation = [
  { name: 'Query & Chat', href: '/', icon: MessageSquare, badge: 'AI' },
  { name: 'Documents', href: '/documents', icon: Database, badge: 'KNOWLEDGE' },
  { name: 'Analytics', href: '/analytics', icon: BarChart2, badge: 'STATS' },
  { name: 'Settings', href: '/settings', icon: Settings, badge: 'CONFIG' },
];

export default function Layout() {
  const location = useLocation();
  const [health, setHealth] = useState({ status: 'checking', total_chunks: 0 });

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await healthCheckAPI();
        if (isMounted) {
          setHealth({
            status: res.status === 'healthy' ? 'online' : res.status === 'initializing' ? 'checking' : 'unhealthy',
            total_chunks: res.stats?.total_chunks ?? 0,
          });
        }
      } catch {
        if (isMounted) {
          setHealth({ status: 'offline', total_chunks: 0 });
        }
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const activeNav = navigation.find((n) =>
    n.href === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(n.href)
  ) || navigation[0];

  return (
    <div className="min-h-screen bg-[#f4f7fc] text-slate-800 flex flex-col lg:flex-row font-['Plus_Jakarta_Sans']">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-72 bg-white border-r border-slate-200/90 lg:fixed lg:inset-y-0 z-50 flex flex-col justify-between shadow-sm">
        <div>
          {/* Brand Header */}
          <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/40 to-transparent">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                <Bot className="h-5 w-5 text-white stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <span className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5 font-['Outfit']">
                  IntelliRAG
                </span>
                <p className="text-[11px] text-slate-500 font-medium tracking-tight truncate">
                  AI-Powered Document Intelligence
                </p>
              </div>
            </Link>
          </div>

          {/* System Status Card */}
          <div className="px-5 py-4">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  {health.status === 'online' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={cn(
                      'relative inline-flex rounded-full h-2.5 w-2.5',
                      health.status === 'online'
                        ? 'bg-emerald-500'
                        : health.status === 'checking'
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    )}
                  ></span>
                </span>
                <span className="text-xs font-semibold text-slate-700 capitalize">
                  {health.status === 'online' ? 'System Online' : health.status === 'checking' ? 'Initializing Pipeline...' : 'System Offline'}
                </span>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60">
                {health.total_chunks} chunks
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-4 py-2" aria-label="Main navigation">
            <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 font-['Outfit']">
              Navigation
            </p>
            <ul className="space-y-1.5" role="list">
              {navigation.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={cn(
                        'group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative',
                        isActive
                          ? 'bg-blue-50/90 text-blue-600 font-bold shadow-xs'
                          : 'text-slate-600 hover:text-blue-600 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon
                          className={cn(
                            'h-4 w-4 transition-colors',
                            isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'
                          )}
                        />
                        <span>{item.name}</span>
                      </div>
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider transition-colors',
                          isActive
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-500 group-hover:text-slate-700'
                        )}
                      >
                        {item.badge}
                      </span>
                      {isActive && (
                        <div className="absolute right-0 top-2 bottom-2 w-1 bg-blue-600 rounded-l-full" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Footer Info Box */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between group hover:border-blue-200 transition-colors cursor-pointer">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate font-['Outfit']">Groq + FAISS Engine</p>
                <p className="text-[11px] text-slate-500 truncate">Dense, BM25 & Re-ranker</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-40 h-20 flex items-center justify-between px-6 lg:px-8 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Folder className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight font-['Outfit']">
              {activeNav.name}
            </h1>
          </div>

          <div className="flex items-center gap-3.5">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all shadow-xs"
            >
              <BookOpen className="h-3.5 w-3.5 text-slate-500" />
              <span>Swagger Docs</span>
            </a>

            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
              <Sparkles className="h-3.5 w-3.5 fill-white/20" />
              <span>IntelliRAG Active</span>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}