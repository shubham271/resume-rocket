import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, MapPin, ExternalLink, Building2, Loader2, RefreshCw, ChevronDown, ChevronRight, Search, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ExtractedJob {
  title: string;
  company: string;
  location: string;
  type: string;
  department: string;
  apply_url: string;
}

interface CompanyWithCareers {
  company_name: string;
  careers_url: string | null;
}

interface CompanyJobGroup {
  company: string;
  jobs: ExtractedJob[];
  loading: boolean;
  error: boolean;
  fetchedAt: string | null;
  cached: boolean;
}

const Jobs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyWithCareers[]>([]);
  const [groups, setGroups] = useState<CompanyJobGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("followed_companies")
      .select("company_name, careers_url")
      .eq("user_id", user.id);

    if (data) setCompanies(data as CompanyWithCareers[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const fetchJobs = useCallback(async (force = false) => {
    const withCareers = companies.filter((c) => c.careers_url);
    if (withCareers.length === 0) return;

    setFetching(true);
    const newGroups: CompanyJobGroup[] = withCareers.map((c) => ({
      company: c.company_name,
      jobs: [],
      loading: true,
      error: false,
      fetchedAt: null,
      cached: false,
    }));
    setGroups(newGroups);
    setExpandedCompanies(new Set(withCareers.map((c) => c.company_name)));

    const results = await Promise.allSettled(
      withCareers.map(async (company) => {
        const { data, error } = await supabase.functions.invoke("extract-jobs", {
          body: { careers_url: company.careers_url, company_name: company.company_name, force },
        });
        if (error || !data?.success) throw new Error("Failed");
        return {
          company: company.company_name,
          jobs: data.jobs || [],
          fetchedAt: data.fetched_at || null,
          cached: data.cached || false,
        };
      })
    );

    const finalGroups: CompanyJobGroup[] = withCareers.map((c, i) => {
      const result = results[i];
      if (result.status === "fulfilled") {
        return {
          company: c.company_name,
          jobs: result.value.jobs,
          loading: false,
          error: false,
          fetchedAt: result.value.fetchedAt,
          cached: result.value.cached,
        };
      }
      return { company: c.company_name, jobs: [], loading: false, error: true, fetchedAt: null, cached: false };
    });

    setGroups(finalGroups);
    setFetching(false);

    const totalJobs = finalGroups.reduce((s, g) => s + g.jobs.length, 0);
    const cachedCount = finalGroups.filter((g) => g.cached).length;
    if (totalJobs > 0) {
      const msg = cachedCount === finalGroups.length
        ? `Loaded ${totalJobs} cached jobs`
        : `Found ${totalJobs} jobs across ${finalGroups.filter((g) => g.jobs.length > 0).length} companies`;
      toast.success(msg);
    }
  }, [companies]);

  useEffect(() => {
    if (companies.length > 0 && groups.length === 0 && !fetching) {
      fetchJobs(false);
    }
  }, [companies]); // eslint-disable-line react-hooks/exhaustive-deps

  const canForceRefresh = useCallback(() => {
    if (groups.length === 0) return true;
    // Allow force refresh if any group was fetched more than 24h ago
    return groups.some((g) => {
      if (!g.fetchedAt) return true;
      const hoursSince = (Date.now() - new Date(g.fetchedAt).getTime()) / (1000 * 60 * 60);
      return hoursSince >= 24;
    });
  }, [groups]);

  const oldestFetchedAt = groups
    .filter((g) => g.fetchedAt)
    .map((g) => new Date(g.fetchedAt!).getTime())
    .sort((a, b) => a - b)[0];

  const toggleCompany = (name: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const expandAll = () => setExpandedCompanies(new Set(groups.map((g) => g.company)));
  const collapseAll = () => setExpandedCompanies(new Set());

  const allDepartments = Array.from(new Set(groups.flatMap((g) => g.jobs.map((j) => j.department).filter(Boolean)))).sort();

  const filteredGroups = groups.map((group) => ({
    ...group,
    jobs: group.jobs.filter((job) => {
      const matchesSearch =
        !search ||
        job.title.toLowerCase().includes(search.toLowerCase()) ||
        job.location.toLowerCase().includes(search.toLowerCase()) ||
        job.department.toLowerCase().includes(search.toLowerCase());
      const matchesDept = !selectedDepartment || job.department === selectedDepartment;
      return matchesSearch && matchesDept;
    }),
  }));

  const totalFiltered = filteredGroups.reduce((s, g) => s + g.jobs.length, 0);
  const totalAll = groups.reduce((s, g) => s + g.jobs.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 md:p-10 min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const companiesWithCareers = companies.filter((c) => c.careers_url);
  const refreshAllowed = canForceRefresh();

  return (
    <div className="p-6 md:p-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Job Posts</h1>
          <p className="mt-1 text-muted-foreground">
            {totalAll > 0
              ? `${totalAll} openings from ${groups.filter((g) => g.jobs.length > 0).length} companies`
              : "Add companies with careers page links to see their job openings."}
          </p>
          {oldestFetchedAt && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last refreshed {formatDistanceToNow(new Date(oldestFetchedAt), { addSuffix: true })}
              {!refreshAllowed && " · Next refresh available in 24h"}
            </p>
          )}
        </div>
        {companiesWithCareers.length > 0 && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                if (!refreshAllowed) {
                  toast.info("Jobs are refreshed once per day. Try again later.");
                  return;
                }
                fetchJobs(true);
              }}
              disabled={fetching}
              className="gap-2 rounded-xl"
            >
              {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            {!refreshAllowed && (
              <span className="text-[10px] text-muted-foreground">Available once per day</span>
            )}
          </div>
        )}
      </div>

      {/* Empty states */}
      {companies.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No companies in your watchlist"
          description="Add companies to your watchlist first, and their job posts will appear here."
          action={<Button className="mt-4 gap-2 rounded-xl" onClick={() => navigate("/my-companies")}><Building2 className="h-4 w-4" /> Go to Watchlist</Button>}
        />
      ) : companiesWithCareers.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No careers pages linked"
          description="Add a careers page URL to your watched companies so we can fetch their job listings."
          action={<Button variant="outline" className="mt-4 gap-2 rounded-xl" onClick={() => navigate("/my-companies")}><Building2 className="h-4 w-4" /> Manage Watchlist</Button>}
        />
      ) : fetching && groups.every((g) => g.loading) ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-medium">Scanning careers pages...</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Extracting jobs from {companiesWithCareers.length} {companiesWithCareers.length === 1 ? "company" : "companies"}.
          </p>
        </div>
      ) : (
        <>
          {/* Search & Filters */}
          {totalAll > 0 && (
            <div className="mb-6 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search jobs by title, location, or department..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="rounded-xl pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={expandAll} className="text-xs text-muted-foreground">
                    Expand All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={collapseAll} className="text-xs text-muted-foreground">
                    Collapse All
                  </Button>
                </div>
              </div>

              {allDepartments.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={selectedDepartment === null ? "default" : "secondary"}
                    className="cursor-pointer rounded-lg px-3 py-1"
                    onClick={() => setSelectedDepartment(null)}
                  >
                    All ({totalAll})
                  </Badge>
                  {allDepartments.map((dept) => {
                    const count = groups.reduce((s, g) => s + g.jobs.filter((j) => j.department === dept).length, 0);
                    return (
                      <Badge
                        key={dept}
                        variant={selectedDepartment === dept ? "default" : "secondary"}
                        className="cursor-pointer rounded-lg px-3 py-1"
                        onClick={() => setSelectedDepartment(selectedDepartment === dept ? null : dept)}
                      >
                        {dept} ({count})
                      </Badge>
                    );
                  })}
                </div>
              )}

              {search || selectedDepartment ? (
                <p className="text-xs text-muted-foreground">
                  Showing {totalFiltered} of {totalAll} jobs
                </p>
              ) : null}
            </div>
          )}

          {/* Company Groups */}
          <div className="space-y-4">
            {filteredGroups.map((group) => {
              const isExpanded = expandedCompanies.has(group.company);
              if (group.jobs.length === 0 && !group.loading && !group.error && (search || selectedDepartment)) return null;

              return (
                <div key={group.company} className="rounded-2xl border bg-card overflow-hidden">
                  <button
                    onClick={() => toggleCompany(group.company)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
                        <Building2 className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div>
                        <h2 className="font-display text-lg font-semibold">{group.company}</h2>
                        <p className="text-sm text-muted-foreground">
                          {group.loading
                            ? "Scanning..."
                            : group.error
                            ? "Failed to load"
                            : `${group.jobs.length} ${group.jobs.length === 1 ? "opening" : "openings"}`}
                          {group.fetchedAt && !group.loading && (
                            <span className="ml-2 text-xs opacity-60">
                              · {formatDistanceToNow(new Date(group.fetchedAt), { addSuffix: true })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!group.loading && group.jobs.length > 0 && (
                        <Badge variant="secondary" className="rounded-lg">{group.jobs.length}</Badge>
                      )}
                      {group.loading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isExpanded && !group.loading && (
                    <div className="border-t divide-y">
                      {group.jobs.length === 0 ? (
                        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                          {group.error ? "Could not load jobs. Check the careers URL and try again." : "No openings found."}
                        </div>
                      ) : (
                        group.jobs.map((job, i) => (
                          <div key={`${job.title}-${i}`} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-secondary/20">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">{job.title}</p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />{job.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Briefcase className="h-3.5 w-3.5 shrink-0" />{job.type}
                                </span>
                                {job.department && (
                                  <Badge variant="outline" className="rounded-md text-xs font-normal">{job.department}</Badge>
                                )}
                              </div>
                            </div>
                            <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              <Button variant="ghost" size="sm" className="gap-1 text-primary rounded-xl">
                                Apply <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
    <Icon className="mb-4 h-12 w-12 text-muted-foreground/50" />
    <p className="text-lg font-medium text-muted-foreground">{title}</p>
    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    {action}
  </div>
);

export default Jobs;
