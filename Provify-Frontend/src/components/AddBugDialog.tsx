// Dialog for adding new bugs to the system

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { createBug, type BugInput } from "@/lib/api";

interface AddBugDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBugAdded: () => void;
}

export function AddBugDialog({ isOpen, onClose, onBugAdded }: AddBugDialogProps) {
  const [appName, setAppName] = useState("");
  const [appPackage, setAppPackage] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setAppName("");
    setAppPackage("");
    setBugDescription("");
    setError(null);
  };

  const handleSubmit = async () => {
    // Validate required inputs (app_package is optional - LLM resolves it)
    if (!appName.trim() || !bugDescription.trim()) {
      setError("App name and bug description are required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const input: BugInput = {
        app_name: appName.trim(),
        bug: bugDescription.trim(),
      };
      // Only include app_package if provided
      if (appPackage.trim()) {
        input.app_package = appPackage.trim();
      }
      await createBug(input);
      resetForm();
      onBugAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bug");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-3">
            <Plus className="w-6 h-6 text-emerald-400" />
            Add New Bug
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* App Name */}
          <div className="space-y-2">
            <Label htmlFor="appName" className="text-zinc-300">
              App Name
            </Label>
            <Input
              id="appName"
              placeholder="e.g. Discord"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          {/* App Package */}
          <div className="space-y-2">
            <Label htmlFor="appPackage" className="text-zinc-300">
              App Package <span className="text-zinc-500 text-sm font-normal">(optional)</span>
            </Label>
            <Input
              id="appPackage"
              placeholder="e.g. com.discord (auto-detected if empty)"
              value={appPackage}
              onChange={(e) => setAppPackage(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 font-mono text-sm"
            />
            <p className="text-xs text-zinc-500">Leave empty and AI will figure it out from app name</p>
          </div>

          {/* Bug Description */}
          <div className="space-y-2">
            <Label htmlFor="bugDescription" className="text-zinc-300">
              Bug Description
            </Label>
            <textarea
              id="bugDescription"
              placeholder="Describe the bug in detail..."
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-2"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Bug
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
