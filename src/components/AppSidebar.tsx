import { NavLink as RouterNavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, FileText, Building2, Briefcase, LogOut, User, ChevronLeft, ChevronRight, Sparkles,
  ChevronDown, FileUp, PenTool, Wrench, UserCircle, Shield,
} from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const AppSidebar = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdminRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const toolkitPaths = ["/resumes", "/cover-letters", "/resume-builder", "/career-profiles"];
  const isToolkitActive = toolkitPaths.some((p) => location.pathname.startsWith(p));
  const [toolkitOpen, setToolkitOpen] = useState(isToolkitActive);

  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/evaluate", label: "Evaluate", icon: FileText },
    { to: "/jobs", label: "Job Posts", icon: Briefcase },
    { to: "/my-companies", label: "Companies", icon: Building2 },
  ];

  const toolkitItems = [
    { to: "/career-profiles", label: "Career Profiles", icon: UserCircle },
    { to: "/resumes", label: "My Resumes", icon: FileUp },
    { to: "/cover-letters", label: "Cover Letters", icon: PenTool },
    { to: "/resume-builder", label: "Resume Builder", icon: Sparkles },
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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && <span className="font-display text-lg font-bold">Emplyoo</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <RouterNavLink
            key={to}
            to={to}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </RouterNavLink>
        ))}

        {/* Career Toolkit Group */}
        {!collapsed ? (
          <div className="pt-2">
            <button
              onClick={() => setToolkitOpen(!toolkitOpen)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isToolkitActive
                  ? "text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Wrench className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left">Career Toolkit</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${toolkitOpen ? "rotate-180" : ""}`}
              />
            </button>
            {toolkitOpen && (
              <div className="ml-4 mt-1 space-y-0.5 border-l pl-3">
                {toolkitItems.map(({ to, label, icon: Icon }) => (
                  <RouterNavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                  </RouterNavLink>
                ))}
              </div>
            )}
          </div>
        ) : (
          toolkitItems.map(({ to, icon: Icon }) => (
            <RouterNavLink
              key={to}
              to={to}
              className={({ isActive }) => navLinkClass(isActive)}
            >
              <Icon className="h-5 w-5 shrink-0" />
            </RouterNavLink>
          ))
        )}
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
