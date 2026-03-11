import { Shield, Construction } from "lucide-react";

const AdminAnalytics = () => (
  <div className="flex-1 p-6 md:p-8 space-y-6">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        <Shield className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <p className="text-sm text-muted-foreground">Monitor platform-wide metrics and performance</p>
      </div>
    </div>
    <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
      <Construction className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-lg font-semibold">Coming Soon</h2>
      <p className="text-sm text-muted-foreground mt-1">Platform analytics will be available here</p>
    </div>
  </div>
);

export default AdminAnalytics;
