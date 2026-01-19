// Bugs page for viewing and managing all bugs

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VerificationDialog } from "@/components/VerificationDialog";
import { AddBugDialog } from "@/components/AddBugDialog";
import { BulkUploadDialog } from "@/components/BulkUploadDialog";
import { fetchBugs, markBugFixed, type Bug, type BugStatus } from "@/lib/api";
import {
  Bug as BugIcon,
  CheckCircle,
  XCircle,
  Clock,
  Wrench,
  ArrowLeft,
  Play,
  RotateCcw,
  Plus,
  Loader2,
  Search,
  ArrowUpDown,
  Calendar,
  AlertTriangle,
  Filter,
  Upload,
} from "lucide-react";

const statusConfig = {
  pending: {
    label: "Pending",
    icon: <Clock className="h-4 w-4" />,
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  verified: {
    label: "Verified",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  not_reproducible: {
    label: "Not Reproducible",
    icon: <XCircle className="h-4 w-4" />,
    color: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  fixed: {
    label: "Fixed",
    icon: <Wrench className="h-4 w-4" />,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
};

export default function BugsPage() {
  const navigate = useNavigate();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search, filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "verified" | "not_reproducible" | "fixed">("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "severity">("newest");

  // Verification dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogBug, setDialogBug] = useState<Bug | null>(null);
  const [dialogMode, setDialogMode] = useState<"verify" | "reverify">("verify");

  // Batch verification state
  const [isBatchVerifying, setIsBatchVerifying] = useState(false);
  const [pendingQueue, setPendingQueue] = useState<Bug[]>([]);

  // Add bug dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  // Bulk upload dialog state
  const [bulkUploadDialogOpen, setBulkUploadDialogOpen] = useState(false);

  // Filter and sort bugs
  const filteredBugs = useMemo(() => {
    let result = bugs;

    // Status filter
    if (filterStatus !== "all") {
      result = result.filter((b) => b.status === filterStatus);
    }

    // Search filter (by app name or package)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.app_name.toLowerCase().includes(query) ||
          b.app_package.toLowerCase().includes(query) ||
          b.bug.toLowerCase().includes(query)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        return (b.severity ?? 0) - (a.severity ?? 0);
      }
    });

    return result;
  }, [bugs, searchQuery, filterStatus, sortBy]);

  const pendingCount = bugs.filter((b) => b.status === "pending").length;

  // Load bugs from API
  const loadBugs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBugs();
      setBugs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bugs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBugs();
  }, []);

  // Open verification dialog
  const openVerificationDialog = (bug: Bug, mode: "verify" | "reverify") => {
    setDialogBug(bug);
    setDialogMode(mode);
    setDialogOpen(true);
  };

  // Handle verification complete
  const handleDialogComplete = (result: { success: boolean; status: string; message: string }) => {
    if (!dialogBug) return;

    // Use the status from API directly
    const newStatus = result.status === "verified" ? "verified" 
                    : result.status === "not_reproducible" ? "not_reproducible"
                    : (result.success ? "verified" : "not_reproducible");

    setBugs((prev) =>
      prev.map((b) =>
        b.id === dialogBug.id
          ? {
              ...b,
              status: newStatus as BugStatus,
              notes: result.message,
            }
          : b
      )
    );

    // Continue batch verification if there are more bugs in queue
    if (isBatchVerifying && pendingQueue.length > 0) {
      const nextBug = pendingQueue[0];
      setPendingQueue((prev) => prev.slice(1));
      setTimeout(() => {
        openVerificationDialog(nextBug, "verify");
      }, 500);
    } else {
      setIsBatchVerifying(false);
    }
  };

  // Handle verify button
  const handleVerify = (bugId: string) => {
    const bug = bugs.find((b) => b.id === bugId);
    if (bug) openVerificationDialog(bug, "verify");
  };

  // Handle verify all pending bugs
  const handleVerifyAllPending = () => {
    const pending = bugs.filter((b) => b.status === "pending");
    if (pending.length === 0) return;

    // Sort by ID to process in order
    const sortedPending = [...pending].sort((a, b) => a.id.localeCompare(b.id));
    
    setIsBatchVerifying(true);
    setPendingQueue(sortedPending.slice(1)); // Queue all except first
    openVerificationDialog(sortedPending[0], "verify"); // Start with first
  };

  // Handle mark as fixed
  const handleMarkFixed = async (bugId: string) => {
    try {
      await markBugFixed(bugId);
      setBugs((prev) =>
        prev.map((b) =>
          b.id === bugId ? { ...b, status: "fixed" as BugStatus } : b
        )
      );
    } catch (err) {
      console.error("Failed to mark bug as fixed:", err);
    }
  };

  // Handle re-verify button
  const handleReverify = (bugId: string) => {
    const bug = bugs.find((b) => b.id === bugId);
    if (bug) openVerificationDialog(bug, "reverify");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Verification Dialog */}
      {dialogBug && (
        <VerificationDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          bugId={dialogBug.id}
          bugDescription={dialogBug.bug}
          appName={dialogBug.app_name}
          appPackage={dialogBug.app_package}
          mode={dialogMode}
          onComplete={handleDialogComplete}
        />
      )}

      {/* Add Bug Dialog */}
      <AddBugDialog
        isOpen={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onBugAdded={loadBugs}
      />

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        isOpen={bulkUploadDialogOpen}
        onClose={() => setBulkUploadDialogOpen(false)}
        onBugsUploaded={loadBugs}
      />

      {/* Animated Grid Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950" />
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-emerald-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-cyan-500/8 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-zinc-100"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">All Bugs</h1>
            <Badge variant="outline" className="border-zinc-700 text-zinc-400">
              {bugs.length} total
            </Badge>
          </div>
          <div className="flex gap-3">
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
            {pendingCount > 0 && (
              <Button 
                className="bg-yellow-600 hover:bg-yellow-500 text-black font-semibold gap-2"
                onClick={handleVerifyAllPending}
                disabled={isBatchVerifying}
              >
                {isBatchVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying ({pendingQueue.length + 1} left)
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Verify All Pending ({pendingCount})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Search, Filter and Sort Controls */}
        {!loading && !error && bugs.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Search bugs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
              <SelectTrigger className="w-full sm:w-56 bg-zinc-900 border-zinc-800 text-zinc-100">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all" className="text-zinc-100">All Status</SelectItem>
                <SelectItem value="pending" className="text-zinc-100">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" /> Pending
                  </span>
                </SelectItem>
                <SelectItem value="verified" className="text-zinc-100">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Verified
                  </span>
                </SelectItem>
                <SelectItem value="not_reproducible" className="text-zinc-100">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" /> Not Reproducible
                  </span>
                </SelectItem>
                <SelectItem value="fixed" className="text-zinc-100">
                  <span className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-blue-500" /> Fixed
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-full sm:w-56 bg-zinc-900 border-zinc-800 text-zinc-100">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="newest" className="text-zinc-100">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Newest First
                  </span>
                </SelectItem>
                <SelectItem value="oldest" className="text-zinc-100">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Oldest First
                  </span>
                </SelectItem>
                <SelectItem value="severity" className="text-zinc-100">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Severity
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

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
            <Button onClick={loadBugs} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
              Retry
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && bugs.length === 0 && (
          <div className="text-center py-20">
            <BugIcon className="h-16 w-16 text-zinc-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-zinc-400 mb-2">No bugs yet</h3>
            <p className="text-zinc-500 mb-6">Add your first bug to get started</p>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Bug
            </Button>
          </div>
        )}

        {/* Bug Cards Grid */}
        {!loading && !error && bugs.length > 0 && (
          <>
            {filteredBugs.length === 0 ? (
              <div className="text-center py-20">
                <Search className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">No bugs match your search</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBugs.map((bug) => (
                  <BugCard
                    key={bug.id}
                    bug={bug}
                    onVerify={() => handleVerify(bug.id)}
                    onMarkFixed={() => handleMarkFixed(bug.id)}
                    onReverify={() => handleReverify(bug.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Bug card component
function BugCard({
  bug,
  onVerify,
  onMarkFixed,
  onReverify,
}: {
  bug: Bug;
  onVerify: () => void;
  onMarkFixed: () => void;
  onReverify: () => void;
}) {
  const config = statusConfig[bug.status];

  return (
    <Card className="bg-zinc-900 border-zinc-800 flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl text-zinc-100 mb-2 truncate">
              {bug.app_name}
            </CardTitle>
            <div className="text-sm text-zinc-500 font-mono truncate">
              {bug.app_package}
            </div>
          </div>
          <Badge className={`${config.color} border shrink-0 text-sm px-3 py-1`}>
            {config.icon}
            <span className="ml-1">{config.label}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <p className="text-base text-zinc-300 mb-5 line-clamp-2">{bug.bug}</p>

        <div className="flex items-center gap-5 text-sm text-zinc-400 mb-5">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(bug.created_at).toLocaleDateString()}</span>
          </div>
          {bug.severity && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Severity: {bug.severity}/5</span>
            </div>
          )}
        </div>

        {bug.notes && (
          <div className="text-sm text-zinc-400 bg-zinc-800/50 rounded-lg p-3 mb-5">
            {bug.notes}
          </div>
        )}

        <div className="mt-auto flex flex-wrap gap-3">
          {bug.status === "pending" && (
            <Button
              className="bg-green-600 hover:bg-green-500 text-white gap-2 text-base px-5 py-5"
              onClick={onVerify}
            >
              <Play className="h-5 w-5" />
              Verify
            </Button>
          )}

          {bug.status === "verified" && (
            <Button
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2 text-base px-5 py-5"
              onClick={onMarkFixed}
            >
              <Wrench className="h-5 w-5" />
              Mark Fixed
            </Button>
          )}

          {bug.status === "fixed" && (
            <Button
              variant="outline"
              className="border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700 gap-2 text-base px-5 py-5"
              onClick={onReverify}
            >
              <RotateCcw className="h-5 w-5" />
              Re-verify
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
