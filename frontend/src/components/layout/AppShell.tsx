import { useState, useEffect } from "react";
import {
  BarChart3, Building2, FileBarChart, FileSpreadsheet,
  LayoutDashboard, LogOut, Mail, MailPlus, Menu, Send, Settings, User, X,
  Sun, Moon, Palette, Shield,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const themes = [
  {
    id: "corporate" as const,
    name: "Corporate Trust",
    description: "Authority and logic",
    dominant: "#EAF2EF",
    structure: "#0A2463",
    accent: "#FB3640",
  },
  {
    id: "modern" as const,
    name: "Modern Tech / SaaS",
    description: "Fresh, friendly and clean",
    dominant: "#F1FAEE",
    structure: "#1D3557",
    accent: "#A8DADC",
  },
  {
    id: "editorial" as const,
    name: "Editorial Elegance",
    description: "Organic, premium and upscale",
    dominant: "#EDE7E3",
    structure: "#495057",
    accent: "#C5A56F",
  },
  {
    id: "creative" as const,
    name: "Creative Agency",
    description: "Minimalist and balanced",
    dominant: "#FFFFFF",
    structure: "#3D5A80",
    accent: "#98C1D9",
  },
];

const navItems = [
  { href: "/dashboard",    label: "Dashboard",        icon: LayoutDashboard },
  { href: "/organizations", label: "Slots",           icon: Building2 },
  { href: "/campaigns",    label: "Campaigns",         icon: Mail },
  { href: "/import",       label: "Import Excel",      icon: FileSpreadsheet },
  { href: "/reports",      label: "Reports",           icon: FileBarChart },
  { href: "/settings",     label: "Settings",          icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") return stored;
    }
    return "light";
  });

  const [colorTheme, setColorTheme] = useState<"corporate" | "modern" | "editorial" | "creative">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("color-theme");
      if (stored === "corporate" || stored === "modern" || stored === "editorial" || stored === "creative") {
        return stored;
      }
    }
    return "creative";
  });

  const [paletteMenuOpen, setPaletteMenuOpen] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("theme-corporate", "theme-modern", "theme-editorial", "theme-creative");
    root.classList.add(`theme-${colorTheme}`);
    localStorage.setItem("color-theme", colorTheme);
  }, [colorTheme]);

  const SidebarContent = () => {
    const { isAdmin } = useAuth();
    const items = [...navItems];
    if (isAdmin) {
      items.push({ href: "/admin", label: "Admin Panel", icon: Shield });
    }

    return (
      <>
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow shadow-primary/40">
            <Send className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">ApexReach</p>
            <p className="text-xs text-slate-400">Campaign Platform</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {items.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-400 transition-all hover:bg-slate-800 hover:text-white",
                  isActive && "bg-primary/20 text-teal-300 border border-primary/30 font-semibold"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-800 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">{user?.firstName} {user?.lastName}</p>
              <p className="truncate text-xs text-slate-400">{user?.role}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={logout} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-950 transition-transform duration-300 lg:hidden",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button className="absolute right-3 top-3 text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
          <X className="h-5 w-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-950 lg:flex">
        <SidebarContent />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/95 backdrop-blur px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm md:flex">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Campaign Manager</span>
            </div>
            
            {/* Palette Switcher dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors shrink-0"
                onClick={() => setPaletteMenuOpen(!paletteMenuOpen)}
                title="Select Theme Palette"
              >
                <Palette className="h-4 w-4 text-slate-700 dark:text-slate-300" />
              </Button>

              {paletteMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setPaletteMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 z-40 w-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-xl">
                    <p className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Light Theme Scheme
                    </p>
                    <div className="space-y-1 mt-1">
                      {themes.map((t) => (
                        <button
                          key={t.id}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-900",
                            colorTheme === t.id && "bg-slate-100 dark:bg-slate-900 font-semibold text-primary"
                          )}
                          onClick={() => {
                            setColorTheme(t.id);
                            setPaletteMenuOpen(false);
                          }}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-800 dark:text-slate-200">{t.name}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">{t.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1">
                              <span className="h-2.5 w-2.5 rounded-full border border-white dark:border-slate-950" style={{ backgroundColor: t.dominant }} />
                              <span className="h-2.5 w-2.5 rounded-full border border-white dark:border-slate-950" style={{ backgroundColor: t.structure }} />
                              <span className="h-2.5 w-2.5 rounded-full border border-white dark:border-slate-950" style={{ backgroundColor: t.accent }} />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors shrink-0"
              onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4 text-slate-700" />
              ) : (
                <Sun className="h-4 w-4 text-amber-400" />
              )}
            </Button>

            <Button onClick={() => navigate("/campaigns/new")} size="sm" className="gap-2">
              <MailPlus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
