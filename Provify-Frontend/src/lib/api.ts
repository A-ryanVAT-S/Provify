// API service for Provify backend communication

const API_BASE = "http://localhost:8000";

// Types matching backend models
export type BugStatus = "pending" | "verified" | "not_reproducible" | "fixed";

export interface Bug {
  id: string;
  app_name: string;
  app_package: string;
  bug: string;
  created_at: string;
  status: BugStatus;
  severity: number | null;
  reproduction_steps: string[];
  last_verified: string | null;
  notes: string;
}

export interface BugInput {
  app_name: string;
  app_package?: string;  // Optional - backend LLM resolves from app_name
  bug: string;
}

export interface Stats {
  total: number;
  pending: number;
  verified: number;
  not_reproducible: number;
  fixed: number;
}

export interface VerifyResult {
  success: boolean;
  status: string;
  message: string;
}

// Fetch all bugs with optional filters
export async function fetchBugs(status?: BugStatus, appPackage?: string): Promise<Bug[]> {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  if (appPackage) params.append("app_package", appPackage);
  
  const res = await fetch(`${API_BASE}/bugs?${params}`);
  if (!res.ok) throw new Error("Failed to fetch bugs");
  return res.json();
}

// Fetch bug statistics
export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

// Get single bug by ID
export async function fetchBug(bugId: string): Promise<Bug> {
  const res = await fetch(`${API_BASE}/bugs/${bugId}`);
  if (!res.ok) throw new Error("Bug not found");
  return res.json();
}

// Create a new bug
export async function createBug(input: BugInput): Promise<Bug> {
  const res = await fetch(`${API_BASE}/bugs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error("Failed to create bug");
  return res.json();
}

// Verify a single bug
export async function verifyBug(bugId: string): Promise<VerifyResult> {
  const res = await fetch(`${API_BASE}/bugs/${bugId}/verify`, { method: "POST" });
  if (!res.ok) throw new Error("Verification failed");
  return res.json();
}

// Mark bug as fixed
export async function markBugFixed(bugId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/bugs/${bugId}/fix`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to mark as fixed");
}

// Delete a bug
export async function deleteBug(bugId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/bugs/${bugId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete bug");
}

// Load bugs from bugs.json file on backend
export async function loadBugsFromFile(): Promise<{ loaded: number }> {
  const res = await fetch(`${API_BASE}/load-from-file`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to load from file");
  return res.json();
}

// Bulk upload bugs from JSON file
export async function uploadBulkBugs(bugs: BugInput[]): Promise<{ success: boolean; count: number; message: string }> {
  const res = await fetch(`${API_BASE}/bugs/bulk-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bugs),
  });
  if (!res.ok) throw new Error("Failed to upload bugs");
  return res.json();
}
