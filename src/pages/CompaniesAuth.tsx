import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Trash2, Loader2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface FollowedCompany {
  id: string;
  company_name: string;
  company_industry: string | null;
  created_at: string;
}

const CompaniesPage = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<FollowedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchCompanies = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("followed_companies")
      .select("id, company_name, company_industry, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setCompanies(data);
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
    });

    if (error) {
      toast.error("Failed to add company");
    } else {
      toast.success(`Added ${trimmed} to your watchlist`);
      setNewName("");
      setNewIndustry("");
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="companyName">Company Name *</Label>
            <Input
              id="companyName"
              placeholder="e.g. Google, Stripe, Notion..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="industry">Industry (optional)</Label>
            <Input
              id="industry"
              placeholder="e.g. FinTech, AI, SaaS..."
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd} disabled={adding || !newName.trim()} className="gap-2 rounded-xl">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
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
          {companies.map((company) => (
            <div
              key={company.id}
              className="flex items-center justify-between gap-4 rounded-2xl border bg-card px-6 py-4 transition-all hover:shadow-md hover:shadow-primary/5"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
                  <Building2 className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-display font-semibold">{company.company_name}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {company.company_industry && (
                      <Badge variant="secondary" className="rounded-md text-xs">{company.company_industry}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Added {new Date(company.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
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
          ))}
        </div>
      )}
    </div>
  );
};

export default CompaniesPage;
