// Dashboard with stats overview and quick actions

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddBugDialog } from "@/components/AddBugDialog";
import { BulkUploadDialog } from "@/components/BulkUploadDialog";
import { fetchStats, fetchBugs, loadBugsFromFile, type Stats, type Bug } from "@/lib/api";
import {
  Bug as BugIcon,
  CheckCircle,
  XCircle,
  Clock,
  Wrench,
  ArrowLeft,
  ArrowRight,
  Plus,
  Loader2,
  RefreshCw,
  Upload,
} from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBugs, setRecentBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Load stats and recent bugs from API
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, bugsData] = await Promise.all([fetchStats(), fetchBugs()]);
      setStats(statsData);
      setRecentBugs(bugsData.slice(0, 4));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync bugs from bugs.json file
  const handleSync = async () => {
    setSyncing(true);
    try {
      await loadBugsFromFile();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync bugs");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Add Bug Dialog */}
      <AddBugDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onBugAdded={loadData}
      />

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        isOpen={bulkUploadDialogOpen}
        onClose={() => setBulkUploadDialogOpen(false)}
        onBugsUploaded={loadData}
      />

      {/* Animated Grid Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-cyan-500/8 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-zinc-100"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Developer Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Bug
            </Button>
            <Button
              className="bg-blue-500 hover:bg-blue-400 text-white font-semibold gap-2"
              onClick={() => setBulkUploadDialogOpen(true)}
            >
              <Upload className="h-4 w-4" />
              Bulk Upload
            </Button>
            <Button
              className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 gap-2"
              onClick={() => navigate("/bugs")}
            >
              View All Bugs
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={loadData} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Retry
            </Button>
          </div>
        )}

        {/* Content */}
        {!loading && !error && stats && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <StatsCard
                title="Total Bugs"
                value={stats.total}
                icon={<BugIcon className="h-5 w-5" />}
                color="text-zinc-400"
              />
              <StatsCard
                title="Pending"
                value={stats.pending}
                icon={<Clock className="h-5 w-5" />}
                color="text-yellow-500"
              />
              <StatsCard
                title="Verified"
                value={stats.verified}
                icon={<CheckCircle className="h-5 w-5" />}
                color="text-green-500"
              />
              <StatsCard
                title="Not Reproducible"
                value={stats.not_reproducible}
                icon={<XCircle className="h-5 w-5" />}
                color="text-red-500"
              />
              <StatsCard
                title="Fixed"
                value={stats.fixed}
                icon={<Wrench className="h-5 w-5" />}
                color="text-blue-500"
              />
            </div>

            {/* Quick Actions */}
            <Card className="bg-zinc-900 border-zinc-800 mb-8">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-xl text-zinc-100">Quick Actions</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-600 bg-zinc-100 text-black hover:bg-zinc-200 font-semibold gap-2"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync from File'}
                </Button>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-3 text-base px-6 py-6"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="h-5 w-5" />
                  Add New Bug
                </Button>
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-3 text-base px-6 py-6"
                  onClick={() => setBulkUploadDialogOpen(true)}
                >
                  <Upload className="h-5 w-5" />
                  Bulk Upload
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-white gap-3 text-base px-6 py-6"
                  onClick={() => navigate("/bugs")}
                >
                  <BugIcon className="h-5 w-5" />
                  Manage Bugs
                </Button>
              </CardContent>
            </Card>

            {/* Recent Bugs */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-xl text-zinc-100">Recent Bugs</CardTitle>
              </CardHeader>
              <CardContent>
                {recentBugs.length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">No bugs yet. Add your first bug to get started.</p>
                ) : (
                  <div className="space-y-4">
                    {recentBugs.map((bug) => (
                      <ActivityItem
                        key={bug.id}
                        status={bug.status}
                        app={bug.app_package}
                        bug={bug.bug}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

// Stats card component
function StatsCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className={color}>{icon}</span>
        </div>
        <div className="text-3xl font-bold text-zinc-100 mb-1">{value}</div>
        <div className="text-sm text-zinc-400">{title}</div>
      </CardContent>
    </Card>
  );
}

// Recent activity item
function ActivityItem({
  status,
  app,
  bug,
}: {
  status: "pending" | "verified" | "not_reproducible" | "fixed";
  app: string;
  bug: string;
}) {
  const statusConfig = {
    pending: { icon: <Clock className="h-6 w-6" />, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    verified: { icon: <CheckCircle className="h-6 w-6" />, color: "text-green-500", bg: "bg-green-500/10" },
    not_reproducible: { icon: <XCircle className="h-6 w-6" />, color: "text-red-500", bg: "bg-red-500/10" },
    fixed: { icon: <Wrench className="h-6 w-6" />, color: "text-blue-500", bg: "bg-blue-500/10" },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-5 p-5 rounded-xl bg-zinc-800/50">
      <div className={`p-3 rounded-xl ${config.bg} ${config.color}`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-lg font-semibold text-zinc-100 truncate">{bug}</div>
        <div className="text-base text-zinc-400 mt-1">{app}</div>
      </div>
    </div>
  );
}
