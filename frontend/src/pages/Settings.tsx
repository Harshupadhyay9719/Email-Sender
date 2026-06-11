import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail, CheckCircle2, AlertTriangle, Loader2, Link2,
  Trash2, ShieldCheck, HelpCircle, ArrowRightLeft, UserCheck, AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";

export function Settings() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });

  const successParam = searchParams.get("success");
  const errorParam = searchParams.get("error");

  // Load Google Auth Status
  const { data: statusData, isLoading, error: queryError } = useQuery({
    queryKey: ["googleAuthStatus"],
    queryFn: () => apiRequest("/auth/google/status"),
  });

  // Handle OAuth callback feedback from url params
  useEffect(() => {
    if (successParam === "true") {
      setFeedback({
        type: "success",
        message: "Gmail account connected successfully! You can now send campaigns using your Gmail address.",
      });
      // Clear URL params
      setSearchParams({}, { replace: true });
    } else if (errorParam) {
      setFeedback({
        type: "error",
        message: decodeURIComponent(errorParam),
      });
      // Clear URL params
      setSearchParams({}, { replace: true });
    }
  }, [successParam, errorParam, setSearchParams]);

  // Google Disconnect Mutation
  const disconnectMutation = useMutation({
    mutationFn: (email: string) =>
      apiRequest("/auth/google/disconnect", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    onSuccess: () => {
      setFeedback({
        type: "success",
        message: "Gmail account disconnected successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["googleAuthStatus"] });
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        message: err.message || "Failed to disconnect Gmail account",
      });
    },
  });

  const handleConnectGmail = () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setFeedback({ type: "error", message: "You must be logged in to connect Gmail." });
      return;
    }
    // Redirect browser to Google login endpoint with local token
    window.location.href = `http://localhost:5000/api/v1/auth/google?token=${token}`;
  };

  const handleDisconnect = () => {
    if (statusData?.email) {
      if (confirm(`Are you sure you want to disconnect ${statusData.email}?`)) {
        disconnectMutation.mutate(statusData.email);
      }
    }
  };

  return (
    <div className="page-shell max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Settings</h1>
        <p className="text-slate-400">Manage your integrations, sending configurations, and connected accounts.</p>
      </div>

      {feedback.type && (
        <div
          className={`flex gap-3 items-start p-4 rounded-xl border backdrop-blur transition-all duration-300 ${
            feedback.type === "success"
              ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300"
              : "bg-red-950/20 border-red-800/40 text-red-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400 mt-0.5" />
          )}
          <div className="flex-1">
            <h5 className="font-semibold text-sm mb-0.5">
              {feedback.type === "success" ? "Success" : "Connection Error"}
            </h5>
            <p className="text-xs text-slate-300 leading-relaxed">{feedback.message}</p>
          </div>
          <button
            onClick={() => setFeedback({ type: null, message: "" })}
            className="text-xs font-bold hover:text-white transition-colors uppercase ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6">
        <Card className="border-slate-800 bg-slate-950/80 backdrop-blur shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Mail className="w-32 h-32 text-primary" />
          </div>
          
          <CardHeader className="pb-4 border-b border-slate-800/50">
            <CardTitle className="flex items-center gap-2 text-white text-xl">
              <Link2 className="h-5 w-5 text-primary" />
              Connected Accounts
            </CardTitle>
            <CardDescription className="text-slate-400">
              Link third-party sending providers to send campaigns through your personal or company address.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-slate-400 font-medium">Checking integration status...</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl bg-slate-900/50 border border-slate-850 gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-100 shadow border border-slate-700">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Gmail Integration</span>
                      {statusData?.connected ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <ShieldCheck className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-500/10 text-slate-400 px-2 py-0.5 rounded-full border border-slate-500/20">
                          Disconnected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {statusData?.connected
                        ? `Connected email: ${statusData.email}`
                        : "Send campaign emails using Gmail API sender identity."}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                  {statusData?.connected ? (
                    <Button
                      variant="destructive"
                      disabled={disconnectMutation.isPending}
                      onClick={handleDisconnect}
                      className="w-full sm:w-auto gap-2 bg-red-950/40 hover:bg-red-900 text-red-200 border border-red-800/40"
                    >
                      {disconnectMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Disconnect Gmail
                    </Button>
                  ) : (
                    <Button
                      onClick={handleConnectGmail}
                      className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/30"
                    >
                      <UserCheck className="h-4 w-4" />
                      Connect Gmail
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800/40">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/30 border border-slate-850">
                <HelpCircle className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-400 space-y-2">
                  <p className="font-semibold text-slate-300">How does this work?</p>
                  <p>
                    Once connected, any outreach campaign you create that uses your Gmail address in the **Sender Email ("From")** field will automatically route and send messages directly through your connected Gmail account using Google's official API.
                  </p>
                  <p>
                    This results in significantly higher deliverability rates compared to shared servers and keeps your outgoing correspondence stored in your standard Gmail "Sent" mailbox.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
