import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Smartphone,
  Download,
} from "lucide-react";

type VerificationResult = {
  success: boolean;
  status: string;
  message: string;
};

interface VerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bugId: string;
  bugDescription: string;
  appName: string;
  appPackage: string;
  mode: "verify" | "reverify";
  onComplete: (result: VerificationResult) => void;
}

const API_BASE = "http://localhost:8000";

export function VerificationDialog({
  isOpen,
  onClose,
  bugId,
  bugDescription,
  appName,
  appPackage,
  mode,
  onComplete,
}: VerificationDialogProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullReport, setFullReport] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      startVerification();
    }
    return () => {
      setIsConnected(false);
      setIsVerifying(false);
      setIsComplete(false);
      setResult(null);
      setError(null);
      setFullReport("");
    };
  }, [isOpen]);

  const startVerification = async () => {
    try {
      // Quick device connection
      await new Promise(r => setTimeout(r, 300));
      setIsConnected(true);
      
      // Start verifying
      setIsVerifying(true);
      
      const endpoint = `${API_BASE}/bugs/${bugId}/verify`;
      const response = await fetch(endpoint, { method: "POST" });
      
      if (!response.ok) {
        throw new Error("Verification request failed");
      }
      
      const apiResult: VerificationResult = await response.json();
      
      // Build full report with raw output
      const report = buildReport(apiResult);
      setFullReport(report);
      
      setResult(apiResult);
      setIsVerifying(false);
      setIsComplete(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setIsVerifying(false);
      setIsComplete(true);
    }
  };

  const buildReport = (res: VerificationResult): string => {
    const timestamp = new Date().toISOString();
    return `PROVIFY VERIFICATION REPORT
================================
Generated: ${timestamp}

BUG DETAILS
-----------
App: ${appName}
Package: ${appPackage}
Bug ID: ${bugId}

Bug Description:
${bugDescription}

VERIFICATION RESULT
-------------------
Status: ${res.success ? "BUG REPRODUCED" : "NOT REPRODUCIBLE"}
Mode: ${mode === "reverify" ? "Re-verification" : "Initial Verification"}

SUMMARY
-------
${res.success ? "The bug was successfully reproduced on the device." : "The bug could not be reproduced on the device."}

================================
RAW DROIDRUN OUTPUT
================================
${res.message}

================================
End of Report`;
  };

  const downloadReport = () => {
    const blob = new Blob([fullReport], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verification_${bugId}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    if (result) {
      onComplete(result);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && isComplete && handleClose()}>
      <DialogContent 
        className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          if (!isComplete) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!isComplete) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-3">
            {!isComplete ? (
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            ) : result?.success ? (
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            ) : error ? (
              <XCircle className="w-6 h-6 text-red-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
            {mode === "verify" ? "Bug Verification" : "Re-verification"}
          </DialogTitle>
        </DialogHeader>

        {/* Bug Info */}
        <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
          <div className="text-sm text-zinc-400 mb-1">{appPackage}</div>
          <div className="text-base text-zinc-100 line-clamp-2">{bugDescription}</div>
        </div>

        {/* Verification Status */}
        {!isComplete && (
          <div className="space-y-4 mb-4">
            {/* Device Connected */}
            <div className={`flex items-center gap-3 p-3 rounded-lg ${isConnected ? "bg-zinc-800/30" : "bg-zinc-800/20"}`}>
              {isConnected ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              )}
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-zinc-400" />
                <span className={isConnected ? "text-zinc-100" : "text-zinc-400"}>
                  {isConnected ? "Device connected" : "Connecting to device..."}
                </span>
              </div>
            </div>

            {/* DroidRun Verifying */}
            {isVerifying && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
                <div className="text-center">
                  <p className="text-lg font-medium text-zinc-100">DroidRun is verifying</p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Testing bug on {appName}...
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {isComplete && result && (
          <div
            className={`p-4 rounded-lg border ${
              result.success
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-red-500/10 border-red-500/30"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {result.success ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span
                className={`font-semibold ${
                  result.success ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {result.success 
                  ? (mode === "reverify" ? "REGRESSION DETECTED" : "BUG VERIFIED")
                  : (mode === "reverify" ? "FIX CONFIRMED" : "NOT REPRODUCIBLE")}
              </span>
            </div>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {result.message}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
              <XCircle className="w-5 h-5" />
              Error
            </div>
            <p className="text-sm text-zinc-300">{error}</p>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {isComplete && result && (
            <Button
              variant="outline"
              className="border-zinc-700 bg-zinc-800 text-black hover:bg-zinc-700 hover:text-black"
              onClick={downloadReport}
            >
              <Download className="w-4 h-4 mr-2 text-black" />
              <span className="text-zinc-100">Download Report</span>
            </Button>
          )}
          <Button
            className={`flex-1 ${
              isComplete
                ? "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
                : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
            }`}
            disabled={!isComplete}
            onClick={handleClose}
          >
            {isComplete ? "Done" : "Verifying..."}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
