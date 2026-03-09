import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, MapPin, Clock, ExternalLink, Building2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

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

const Jobs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyWithCareers[]>([]);
  const [jobs, setJobs] = useState<ExtractedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

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

  const fetchJobs = useCallback(async () => {
    const withCareers = companies.filter((c) => c.careers_url);
    if (withCareers.length === 0) return;

    setFetching(true);
    const allJobs: ExtractedJob[] = [];

    for (const company of withCareers) {
      try {
        const { data, error } = await supabase.functions.invoke("extract-jobs", {
          body: { careers_url: company.careers_url, company_name: company.company_name },
        });

        if (error) {
          console.error(`Error fetching jobs for ${company.company_name}:`, error);
          toast.error(`Failed to fetch jobs from ${company.company_name}`);
          continue;
        }

        if (data?.success && data.jobs) {
          allJobs.push(...data.jobs);
        }
      } catch (err) {
        console.error(`Error for ${company.company_name}:`, err);
      }
    }

    setJobs(allJobs);
    setFetching(false);
    if (allJobs.length > 0) {
      toast.success(`Found ${allJobs.length} job${allJobs.length === 1 ? "" : "s"} from your watchlist`);
    }
  }, [companies]);

  // Auto-fetch on first load when companies are available
  useEffect(() => {
    if (companies.length > 0 && jobs.length === 0 && !fetching) {
      fetchJobs();
    }
  }, [companies]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 md:p-10 min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const companiesWithCareers = companies.filter((c) => c.careers_url);

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Job Posts</h1>
          <p className="mt-1 text-muted-foreground">
            {companiesWithCareers.length > 0
              ? `Live openings scraped from ${companiesWithCareers.length} ${companiesWithCareers.length === 1 ? "company" : "companies"} in your watchlist.`
              : "Add companies with careers page links to see their job openings here."}
          </p>
        </div>
        {companiesWithCareers.length > 0 && (
          <Button
            variant="outline"
            onClick={fetchJobs}
            disabled={fetching}
            className="gap-2 rounded-xl shrink-0"
          >
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        )}
      </div>

      {companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <Building2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">No companies in your watchlist</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add companies to your watchlist first, and their job posts will appear here.
          </p>
          <Button className="mt-4 gap-2 rounded-xl" onClick={() => navigate("/my-companies")}>
            <Building2 className="h-4 w-4" /> Go to Watchlist
          </Button>
        </div>
      ) : companiesWithCareers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">No careers pages linked</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a careers page URL to your watched companies so we can fetch their job listings.
          </p>
          <Button variant="outline" className="mt-4 gap-2 rounded-xl" onClick={() => navigate("/my-companies")}>
            <Building2 className="h-4 w-4" /> Manage Watchlist
          </Button>
        </div>
      ) : fetching ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-medium">Scanning careers pages...</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Extracting job listings from {companiesWithCareers.length} {companiesWithCareers.length === 1 ? "company" : "companies"}. This may take a moment.
          </p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <Briefcase className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium text-muted-foreground">No jobs found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We couldn't extract any job listings. Try refreshing or check the careers page URLs.
          </p>
          <Button variant="outline" className="mt-4 gap-2 rounded-xl" onClick={fetchJobs}>
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            {jobs.length} {jobs.length === 1 ? "opening" : "openings"} found
          </p>
          {jobs.map((job, i) => (
            <div key={`${job.company}-${job.title}-${i}`} className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-6 transition-all hover:shadow-md hover:shadow-primary/5">
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-semibold">{job.title}</h3>
                <p className="text-sm text-muted-foreground">{job.company}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.type}</span>
                </div>
                {job.department && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="rounded-md">{job.department}</Badge>
                  </div>
                )}
              </div>
              <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="shrink-0 gap-1 rounded-xl">
                  Apply <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Jobs;
