import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShieldAlert, Globe, Plus, Trash2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";

interface BlockedAccount {
  id: string;
  user_id: string;
  reason: string;
  description: string | null;
  blocked_by: string;
  blocked_at: string;
}

interface BlockedDomain {
  id: string;
  domain: string;
  reason: string | null;
  blocked_by: string;
  created_at: string;
}

const AdminSafety = () => {
  const { user } = useAuth();
  const [blockedAccounts, setBlockedAccounts] = useState<BlockedAccount[]>([]);
  const [blockedDomains, setBlockedDomains] = useState<BlockedDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newDomainReason, setNewDomainReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [accounts, domains] = await Promise.all([
      supabase.from("blocked_accounts").select("*").order("blocked_at", { ascending: false }),
      supabase.from("blocked_domains").select("*").order("created_at", { ascending: false }),
    ]);
    if (accounts.data) setBlockedAccounts(accounts.data as BlockedAccount[]);
    if (domains.data) setBlockedDomains(domains.data as BlockedDomain[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addDomain = async () => {
    if (!newDomain.trim() || !user) return;
    const { error } = await supabase.from("blocked_domains").insert({
      domain: newDomain.trim().toLowerCase(),
      reason: newDomainReason || null,
      blocked_by: user.id,
    });
    if (!error) {
      await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        action: "block_domain",
        details: { domain: newDomain.trim() },
      });
      toast.success("Domain blocked");
      setDomainDialogOpen(false);
      setNewDomain("");
      setNewDomainReason("");
      fetchData();
    } else {
      toast.error(error.message);
    }
  };

  const removeDomain = async (id: string, domain: string) => {
    if (!user) return;
    const { error } = await supabase.from("blocked_domains").delete().eq("id", id);
    if (!error) {
      await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        action: "unblock_domain",
        details: { domain },
      });
      toast.success("Domain removed");
      fetchData();
    }
  };

  const unblockAccount = async (accountId: string, userId: string) => {
    if (!user) return;
    const { error } = await supabase.from("blocked_accounts").delete().eq("id", accountId);
    if (!error) {
      await supabase.from("admin_audit_logs").insert({
        admin_id: user.id,
        action: "unblock_user",
        target_user_id: userId,
      });
      toast.success("Account unblocked");
      fetchData();
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <ShieldAlert className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Account Safety</h1>
            <p className="text-sm text-muted-foreground">Manage blocked accounts and domains</p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">
            Blocked Accounts ({blockedAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="domains">
            Blocked Domains ({blockedDomains.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Blocked At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockedAccounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No blocked accounts
                    </TableCell>
                  </TableRow>
                ) : (
                  blockedAccounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.user_id.slice(0, 8)}...</TableCell>
                      <TableCell><Badge variant="destructive">{a.reason}</Badge></TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{a.description || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(a.blocked_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => unblockAccount(a.id, a.user_id)}>
                          Unblock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="domains" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setDomainDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Block Domain
            </Button>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockedDomains.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No blocked domains
                    </TableCell>
                  </TableRow>
                ) : (
                  blockedDomains.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-sm flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        {d.domain}
                      </TableCell>
                      <TableCell className="text-sm">{d.reason || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(d.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeDomain(d.id, d.domain)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Domain Dialog */}
      <Dialog open={domainDialogOpen} onOpenChange={setDomainDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Email Domain</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Domain *</label>
              <Input
                placeholder="e.g. spammer.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Input
                placeholder="e.g. Spam, Fraud"
                value={newDomainReason}
                onChange={(e) => setNewDomainReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDomainDialogOpen(false)}>Cancel</Button>
            <Button onClick={addDomain} disabled={!newDomain.trim()}>Block Domain</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSafety;
