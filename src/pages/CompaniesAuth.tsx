import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Trash2, Loader2, Eye, Globe, ExternalLink, Pencil, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface FollowedCompany {
  id: string;
  company_name: string;
  company_industry: string | null;
  homepage_url: string | null;
  careers_url: string | null;
  created_at: string;
}

const CompaniesPage = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<FollowedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newHomepage, setNewHomepage] = useState("");
  const [newCareers, setNewCareers] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", industry: "", homepage: "", careers: "" });
  const [saving, setSaving] = useState(false);

  const fetchCompanies = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("followed_companies")
      .select("id, company_name, company_industry, homepage_url, careers_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setCompanies(data as FollowedCompany[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleAdd = async () => {
    if (!user || !newName.trim()) return;
    const trimmed = newName.trim();

    if (companies.some((c) => c.company_name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Company already in your watchlist");
      return;
    }

    setAdding(true);
    const { error } = await supabase.from("followed_companies").insert({
      user_id: user.id,
      company_name: trimmed,
      company_industry: newIndustry.trim() || null,
      homepage_url: newHomepage.trim() || null,
      careers_url: newCareers.trim() || null,
    } as any);

    if (error) {
      toast.error("Failed to add company");
    } else {
      toast.success(`Added ${trimmed} to your watchlist`);
      setNewName("");
      setNewIndustry("");
      setNewHomepage("");
      setNewCareers("");
      fetchCompanies();
    }
    setAdding(false);
  };

  const handleRemove = async (company: FollowedCompany) => {
    if (!user) return;
    const { error } = await supabase
      .from("followed_companies")
      .delete()
      .eq("id", company.id);

    if (error) {
      toast.error("Failed to remove company");
    } else {
      toast.success(`Removed ${company.company_name}`);
      setCompanies((prev) => prev.filter((c) => c.id !== company.id));
    }
  };

  const startEditing = (company: FollowedCompany) => {
    setEditingId(company.id);
    setEditForm({
      name: company.company_name,
      industry: company.company_industry || "",
      homepage: company.homepage_url || "",
      careers: company.careers_url || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ name: "", industry: "", homepage: "", careers: "" });
  };

  const handleSaveEdit = async () => {
    if (!user || !editingId || !editForm.name.trim()) return;

    setSaving(true);
    const { error } = await supabase
      .from("followed_companies")
      .update({
        company_name: editForm.name.trim(),
        company_industry: editForm.industry.trim() || null,
        homepage_url: editForm.homepage.trim() || null,
        careers_url: editForm.careers.trim() || null,
      })
      .eq("id", editingId);

    if (error) {
      toast.error("Failed to update company");
    } else {
      toast.success(`Updated ${editForm.name.trim()}`);
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? {
                ...c,
                company_name: editForm.name.trim(),
                company_industry: editForm.industry.trim() || null,
                homepage_url: editForm.homepage.trim() || null,
                careers_url: editForm.careers.trim() || null,
              }
            : c
        )
      );
      setEditingId(null);
    }
    setSaving(false);
  };

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">My Watchlist</h1>
        <p className="mt-1 text-muted-foreground">
          Add companies you're interested in. Their job posts will appear in the Job Posts section.
        </p>
      </div>

      {/* Add Company Form */}
      <div className="mb-8 rounded-2xl border bg-card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" /> Add a Company
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              placeholder="e.g. Google, Stripe, Notion..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry (optional)</Label>
            <Input
              id="industry"
              placeholder="e.g. FinTech, AI, SaaS..."
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="homepage">Homepage URL (optional)</Label>
            <Input
              id="homepage"
              placeholder="https://company.com"
              value={newHomepage}
              onChange={(e) => setNewHomepage(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="careers">Careers Page URL (optional)</Label>
            <Input
              id="careers"
              placeholder="https://company.com/careers"
              value={newCareers}
              onChange={(e) => setNewCareers(e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>
        <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="mt-4 gap-2 rounded-xl">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add to Watchlist
        </Button>
      </div>

      {/* Company List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <Eye className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">No companies in your watchlist</p>
          <p className="mt-1 text-sm text-muted-foreground">Add companies above to start tracking their job posts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            {companies.length} {companies.length === 1 ? "company" : "companies"} in your watchlist
          </p>
          {companies.map((company) => {
            const isEditing = editingId === company.id;

            return (
              <div
                key={company.id}
                className="rounded-2xl border bg-card px-6 py-4 transition-all hover:shadow-md hover:shadow-primary/5"
              >
                {isEditing ? (
                  /* Edit Mode */
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Company Name *</Label>
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Industry</Label>
                        <Input
                          value={editForm.industry}
                          onChange={(e) => setEditForm((f) => ({ ...f, industry: e.target.value }))}
                          className="rounded-xl"
                          placeholder="e.g. FinTech, AI..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Homepage URL</Label>
                        <Input
                          value={editForm.homepage}
                          onChange={(e) => setEditForm((f) => ({ ...f, homepage: e.target.value }))}
                          className="rounded-xl"
                          placeholder="https://company.com"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Careers Page URL</Label>
                        <Input
                          value={editForm.careers}
                          onChange={(e) => setEditForm((f) => ({ ...f, careers: e.target.value }))}
                          className="rounded-xl"
                          placeholder="https://company.com/careers"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={saving || !editForm.name.trim()}
                        className="gap-1.5 rounded-xl"
                      >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEditing}
                        disabled={saving}
                        className="gap-1.5 rounded-xl"
                      >
                        <X className="h-3.5 w-3.5" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
                          <Building2 className="h-5 w-5 text-accent-foreground" />
                        </div>
                        <div>
                          <p className="font-display font-semibold">{company.company_name}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            {company.company_industry && (
                              <Badge variant="secondary" className="rounded-md text-xs">{company.company_industry}</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              Added {new Date(company.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(company)}
                          className="gap-1.5 rounded-xl text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(company)}
                          className="gap-1.5 rounded-xl text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>
                    {(company.homepage_url || company.careers_url) && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 pl-15">
                        {company.homepage_url && (
                          <a
                            href={company.homepage_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/60 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                          >
                            <Globe className="h-3.5 w-3.5" /> Website <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        )}
                        {company.careers_url && (
                          <a
                            href={company.careers_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-accent/60 px-3 py-1.5 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Careers Page
                          </a>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CompaniesPage;
