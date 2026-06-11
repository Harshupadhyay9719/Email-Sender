import { useState } from "react";
import {
  BarChart3, Building2, FileBarChart, FileSpreadsheet,
  LayoutDashboard, LogOut, Mail, MailPlus, Menu, Send, Settings, User, X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { href: "/dashboard",    label: "Dashboard",        icon: LayoutDashboard },
  { href: "/organizations", label: "Organizations",   icon: Building2 },
  { href: "/campaigns",    label: "Campaigns",         icon: Mail },
  { href: "/import",       label: "Import Excel",      icon: FileSpreadsheet },
  { href: "/reports",      label: "Reports",           icon: FileBarChart },
  { href: "/settings",     label: "Settings",          icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow shadow-primary/40">
          <Send className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">OutreachPro</p>
          <p className="text-xs text-slate-400">Campaign Platform</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-400 transition-all hover:bg-slate-800 hover:text-white",
                isActive && "bg-primary/15 text-primary border border-primary/20"
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
