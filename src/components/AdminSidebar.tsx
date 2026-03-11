import { NavLink as RouterNavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield, Users, LogOut, ChevronLeft, ChevronRight, LayoutDashboard,
  Settings, BarChart3, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const AdminSidebar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/admin/notifications", label: "Notifications", icon: Bell },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const navLinkClass = (isActive: boolean) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    }`;

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-col border-r bg-card transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive">
          <Shield className="h-5 w-5 text-destructive-foreground" />
        </div>
        {!collapsed && (
          <div>
            <span className="font-display text-lg font-bold">Emplyoo</span>
            <span className="ml-1.5 text-xs font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
              Admin
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <RouterNavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </RouterNavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
              <Shield className="h-4 w-4 text-destructive" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Super Admin</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="flex-1 justify-start gap-2 rounded-xl text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Sign out"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 rounded-lg text-muted-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
