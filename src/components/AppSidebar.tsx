import { NavLink as RouterNavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, FileText, Building2, Briefcase, LogOut, User, ChevronLeft, ChevronRight, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const AppSidebar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/evaluate", label: "Evaluate", icon: FileText },
    { to: "/jobs", label: "Job Posts", icon: Briefcase },
    { to: "/my-companies", label: "Companies", icon: Building2 },
  ];

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-col border-r bg-card transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && <span className="font-display text-lg font-bold">Emplyoo</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <RouterNavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </RouterNavLink>
        ))}
      </nav>

      {/* User + Collapse */}
      <div className="border-t p-3 space-y-2">
        {!collapsed && (
          <div
            className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5 cursor-pointer hover:bg-secondary transition-colors"
            onClick={() => navigate("/account")}
            title="Account Settings"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Account Settings</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div
            className="flex items-center justify-center rounded-xl bg-secondary/50 p-2 cursor-pointer hover:bg-secondary transition-colors"
            onClick={() => navigate("/account")}
            title="Account Settings"
          >
            <User className="h-5 w-5 text-primary" />
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

export default AppSidebar;
