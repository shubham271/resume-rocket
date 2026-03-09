import { Briefcase, MapPin, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockJobs = [
  { id: "1", title: "Senior Frontend Engineer", company: "TechNova", location: "Remote", type: "Full-time", salary: "$140k–$180k", posted: "2d ago", tags: ["React", "TypeScript"] },
  { id: "2", title: "ML Engineer", company: "TechNova", location: "San Francisco", type: "Full-time", salary: "$160k–$200k", posted: "3d ago", tags: ["Python", "PyTorch"] },
  { id: "3", title: "DevOps Engineer", company: "CloudScale", location: "Seattle", type: "Full-time", salary: "$130k–$170k", posted: "1d ago", tags: ["AWS", "Kubernetes"] },
  { id: "4", title: "Product Designer", company: "DesignCraft", location: "New York", type: "Full-time", salary: "$120k–$150k", posted: "4d ago", tags: ["Figma", "UX"] },
  { id: "5", title: "Full Stack Developer", company: "GreenByte", location: "Remote", type: "Contract", salary: "$90–$120/hr", posted: "5d ago", tags: ["Node", "React"] },
  { id: "6", title: "Data Analyst", company: "FinEdge", location: "London", type: "Full-time", salary: "£65k–£85k", posted: "2d ago", tags: ["SQL", "Python"] },
];

const Jobs = () => {
  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Job Posts</h1>
        <p className="mt-1 text-muted-foreground">Latest openings from companies you follow and more.</p>
      </div>

      <div className="space-y-4">
        {mockJobs.map((job) => (
          <div key={job.id} className="flex items-center justify-between gap-4 rounded-2xl border bg-card p-6 transition-all hover:shadow-md hover:shadow-primary/5">
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg font-semibold">{job.title}</h3>
              <p className="text-sm text-muted-foreground">{job.company}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>
                <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.type}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{job.posted}</span>
                <span className="font-medium text-foreground">{job.salary}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-md">{tag}</Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 gap-1 rounded-xl">
              Apply <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Jobs;
