import { Shield, Construction } from "lucide-react";

const AdminNotifications = () => (
  <div className="flex-1 p-6 md:p-8 space-y-6">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        <Shield className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Send announcements and manage notifications</p>
      </div>
    </div>
    <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
      <Construction className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-lg font-semibold">Coming Soon</h2>
      <p className="text-sm text-muted-foreground mt-1">Notification management will be available here</p>
    </div>
  </div>
);

export default AdminNotifications;
