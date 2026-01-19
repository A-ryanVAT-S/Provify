// Dialog for bulk uploading bugs from JSON file

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, FileJson, AlertCircle } from "lucide-react";
import { uploadBulkBugs, type BugInput } from "@/lib/api";

interface BulkUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBugsUploaded: () => void;
}

export function BulkUploadDialog({ isOpen, onClose, onBugsUploaded }: BulkUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<BugInput[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSelectedFile(file);

    // Read and validate JSON file
    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // Validate it's an array
      if (!Array.isArray(json)) {
        setError("JSON file must contain an array of bugs");
        setPreviewData(null);
        return;
      }

      // Validate each bug has required fields
      for (const bug of json) {
        if (!bug.app_name || !bug.bug) {
          setError("Each bug must have 'app_name' and 'bug' fields");
          setPreviewData(null);
          return;
        }
      }

      setPreviewData(json);
    } catch (err) {
      setError("Invalid JSON file format");
      setPreviewData(null);
    }
  };

  const handleSubmit = async () => {
    if (!previewData || previewData.length === 0) {
      setError("No valid bugs to upload");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await uploadBulkBugs(previewData);
      resetForm();
      onBugsUploaded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload bugs");
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

  const exampleSchema = `[
  {
    "app_name": "Discord",
    "app_package": "com.discord",
    "bug": "App doesn't open"
  },
  {
    "app_name": "Instagram",
    "bug": "Stories don't load"
  }
]`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-3">
            <Upload className="w-6 h-6 text-blue-400" />
            Bulk Upload Bugs from JSON
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Example Schema */}
          <div className="space-y-2">
            <label className="text-zinc-300 text-sm font-medium">
              Expected JSON Format:
            </label>
            <pre className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300 overflow-x-auto">
              {exampleSchema}
            </pre>
            <p className="text-xs text-zinc-500">
              • <code className="text-emerald-400">app_name</code> and <code className="text-emerald-400">bug</code> are required
              <br />
              • <code className="text-emerald-400">app_package</code> is optional (AI will resolve it)
            </p>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-zinc-300 text-sm font-medium">
              Select JSON File:
            </label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex-1 cursor-pointer flex items-center gap-2 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-750 transition-colors"
              >
                <FileJson className="w-5 h-5 text-blue-400" />
                <span className="text-zinc-300">
                  {selectedFile ? selectedFile.name : "Choose JSON file..."}
                </span>
              </label>
              {selectedFile && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  onClick={resetForm}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Preview */}
          {previewData && previewData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Ready to upload {previewData.length} bug{previewData.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 max-h-40 overflow-y-auto">
                {previewData.map((bug, idx) => (
                  <div key={idx} className="text-xs text-zinc-400 mb-2 last:mb-0">
                    <span className="text-zinc-500">#{idx + 1}</span>{" "}
                    <span className="text-emerald-400">{bug.app_name}</span>
                    {bug.app_package && (
                      <span className="text-zinc-600"> ({bug.app_package})</span>
                    )}
                    : {bug.bug.substring(0, 60)}
                    {bug.bug.length > 60 && "..."}
                  </div>
                ))}
              </div>
            </div>
          )}

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
            className="bg-blue-500 hover:bg-blue-400 text-white font-semibold gap-2"
            onClick={handleSubmit}
            disabled={isSubmitting || !previewData || previewData.length === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {previewData?.length || 0} Bugs
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
