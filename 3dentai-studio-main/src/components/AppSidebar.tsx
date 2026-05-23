import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Box,
  ImageIcon,
  BarChart3,
  Settings,
  LogOut,
  Plus,
} from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

const items = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/patients", label: "Patients", icon: Users },
  { to: "/app/reconstruction", label: "3D Reconstruction", icon: Box },
  { to: "/app/imaging", label: "Imaging", icon: ImageIcon },
  { to: "/app/analytics", label: "AI Analytics", icon: BarChart3 },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const { location } = useRouterState();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const fullName  = (user?.user_metadata?.full_name as string | undefined) ?? "";
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? null;
  const displayName = fullName || user?.email?.split("@")[0] || "Doctor";
  const initials    = fullName
    ? fullName.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <Logo />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => {
          const active = location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? "text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl gradient-navy-cyan ai-glow"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className="relative h-4.5 w-4.5 shrink-0" />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 space-y-2 border-t border-sidebar-border">
        <Button
          className="w-full gradient-navy-cyan text-white rounded-xl shadow-md hover:opacity-90 ai-glow"
          onClick={() => navigate({ to: "/app/reconstruction" })}
        >
          <Plus className="h-4 w-4" />
          New Scan
        </Button>

        {/* User info strip */}
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-sidebar-accent transition-colors">
          <Avatar className="h-8 w-8 border border-sidebar-border shrink-0">
            {avatarUrl && (
              <AvatarImage src={avatarUrl} alt={displayName} className="object-cover" />
            )}
            <AvatarFallback className="gradient-navy-cyan text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-sidebar-foreground truncate">{displayName}</div>
            <div className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email}</div>
          </div>
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
