import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, Shield, Mail, Calendar, Clock, Globe, Monitor, FileText,
  Briefcase, Building2, BarChart3, ShieldAlert, ShieldOff, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { toast } from "sonner";

interface UserDetail {
  user: {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    display_name: string | null;
    phone_number: string | null;
    avatar_url: string | null;
  };
  stats: {
    resumes_count: number;
    cover_letters_count: number;
    analyses_count: number;
    career_profiles_count: number;
    followed_companies_count: number;
  };
  login_logs: Array<{
    ip_address: string;
    user_agent: string;
    location: string | null;
    login_at: string;
  }>;
  is_blocked: boolean;
  block_info: { reason: string; description: string; blocked_at: string } | null;
  roles: string[];
}

const AdminUserDetail = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: adminUser } = useAuth();
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockDescription, setBlockDescription] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_get_user_detail", {
      _target_user_id: userId,
    });
    if (!error && data) {
      setDetail(data as unknown as UserDetail);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) fetchDetail();
  }, [userId]);

  const handleBlock = async () => {
    if (!blockReason.trim() || !adminUser || !userId) return;
    setActionLoading(true);
    const { error } = await supabase.from("blocked_accounts").insert({
      user_id: userId,
      reason: blockReason,
      description: blockDescription || null,
      blocked_by: adminUser.id,
    });
    if (!error) {
      // Log the audit
      await supabase.from("admin_audit_logs").insert({
        admin_id: adminUser.id,
        action: "block_user",
        target_user_id: userId,
        details: { reason: blockReason, description: blockDescription },
      });
      toast.success("Account blocked");
      setBlockDialogOpen(false);
      setBlockReason("");
      setBlockDescription("");
      fetchDetail();
    } else {
      toast.error("Failed to block account");
    }
    setActionLoading(false);
  };

  const handleUnblock = async () => {
    if (!adminUser || !userId) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("blocked_accounts")
      .delete()
      .eq("user_id", userId);
    if (!error) {
      await supabase.from("admin_audit_logs").insert({
        admin_id: adminUser.id,
        action: "unblock_user",
        target_user_id: userId,
      });
      toast.success("Account unblocked");
      fetchDetail();
    } else {
      toast.error("Failed to unblock account");
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!detail?.user) {
    return (
      <div className="p-6 md:p-8">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <p className="mt-4 text-muted-foreground">User not found</p>
      </div>
    );
  }

  const u = detail.user;
  const stats = detail.stats;

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/users")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
          {(u.display_name || u.email)?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{u.display_name || u.email}</h1>
            {detail.is_blocked && (
              <Badge variant="destructive">Blocked</Badge>
            )}
            {detail.roles?.map((r) => (
              <Badge key={String(r)} variant="outline" className="capitalize">{String(r)}</Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{u.email}</p>
        </div>
        <div className="flex gap-2">
          {detail.is_blocked ? (
            <Button variant="outline" onClick={handleUnblock} disabled={actionLoading}>
              <ShieldOff className="h-4 w-4 mr-2" /> Unblock
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => setBlockDialogOpen(true)}>
              <ShieldAlert className="h-4 w-4 mr-2" /> Block Account
            </Button>
          )}
        </div>
      </div>

      {/* Block Info */}
      {detail.is_blocked && detail.block_info && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Account Blocked</p>
                <p className="text-sm text-muted-foreground">
                  Reason: {detail.block_info.reason}
                </p>
                {detail.block_info.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {detail.block_info.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Blocked on {format(new Date(detail.block_info.blocked_at), "MMM d, yyyy h:mm a")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Info + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" /> Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</span>
              <span className="font-medium">{u.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Signed Up</span>
              <span>{format(new Date(u.created_at), "MMM d, yyyy h:mm a")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Last Sign In</span>
              <span>{u.last_sign_in_at ? format(new Date(u.last_sign_in_at), "MMM d, yyyy h:mm a") : "Never"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-2"><Shield className="h-3.5 w-3.5" /> Email Verified</span>
              <Badge variant={u.email_confirmed_at ? "default" : "secondary"}>
                {u.email_confirmed_at ? "Verified" : "Unverified"}
              </Badge>
            </div>
            {u.phone_number && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{u.phone_number}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" /> Platform Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Resumes", count: stats.resumes_count, icon: FileText },
                { label: "Cover Letters", count: stats.cover_letters_count, icon: FileText },
                { label: "Analyses", count: stats.analyses_count, icon: BarChart3 },
                { label: "Career Profiles", count: stats.career_profiles_count, icon: Briefcase },
                { label: "Companies Followed", count: stats.followed_companies_count, icon: Building2 },
              ].map(({ label, count, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg border p-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" /> Login History & IP Addresses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {detail.login_logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No login records yet. IP tracking starts from now.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.login_logs.map((log, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      <div className="flex items-center gap-1.5">
                        <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{log.user_agent || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{log.location || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.login_at), "MMM d, yyyy h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Block Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Account</DialogTitle>
            <DialogDescription>
              Block {u.display_name || u.email}'s account. They will not be able to access the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason *</label>
              <Input
                placeholder="e.g. Policy violation, Fraud, Spam"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Additional details about why this account is being blocked..."
                value={blockDescription}
                onChange={(e) => setBlockDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlock} disabled={!blockReason.trim() || actionLoading}>
              Block Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUserDetail;
