import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail, CheckCircle2, AlertTriangle, Loader2, Link2,
  Trash2, ShieldCheck, HelpCircle, ArrowRightLeft, UserCheck, AlertCircle
} from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";

export function Settings() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });
  
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showGuide, setShowGuide] = useState(false);


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

  // Google OAuth Initiation Mutation
  const connectMutation = useMutation({
    mutationFn: (credentials: { clientId: string; clientSecret: string }) =>
      apiRequest("/auth/google/initiate", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
    onSuccess: (data) => {
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setFeedback({
          type: "error",
          message: "Failed to generate Google consent screen URL.",
        });
      }
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        message: err.message || "Failed to initiate Gmail connection",
      });
    },
  });

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
      setClientId("");
      setClientSecret("");
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
    if (!clientId.trim() || !clientSecret.trim()) {
      setFeedback({ type: "error", message: "Both Google Client ID and Google Client Secret are required." });
      return;
    }
    
    connectMutation.mutate({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
    });
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
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 mb-2">Settings</h1>
        <p className="text-slate-500 font-medium">Manage your integrations, sending configurations, and connected accounts.</p>
      </div>

      {feedback.type && (
        <div
          className={`flex gap-3 items-start p-4 rounded-xl border backdrop-blur transition-all duration-300 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-650 mt-0.5" />
          )}
          <div className="flex-1">
            <h5 className="font-bold text-sm mb-0.5">
              {feedback.type === "success" ? "Success" : "Connection Error"}
            </h5>
            <p className="text-xs text-slate-650 leading-relaxed">{feedback.message}</p>
          </div>
          <button
            onClick={() => setFeedback({ type: null, message: "" })}
            className="text-xs font-bold hover:text-slate-900 transition-colors uppercase ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6">
        <Card className="border-slate-200 bg-white shadow-xl shadow-slate-100/40 rounded-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Mail className="w-32 h-32 text-primary" />
          </div>
          
          <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/45">
            <CardTitle className="flex items-center gap-2 text-slate-800 text-xl font-bold">
              <Link2 className="h-5 w-5 text-primary" />
              Connected Accounts
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Link third-party sending providers to send campaigns through your personal or company address.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-slate-500 font-medium">Checking integration status...</p>
              </div>
            ) : (
              <div className="flex flex-col p-5 rounded-2xl bg-slate-50/50 border border-slate-150 gap-6">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-4 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700 shadow border border-slate-205">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">Gmail Integration</span>
                        {statusData?.connected ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-500/10 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <ShieldCheck className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-800">
                            Disconnected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {statusData?.connected
                          ? `Connected email: ${statusData.email}`
                          : "Send campaign emails using Gmail API sender identity."}
                      </p>
                    </div>
                  </div>

                  {statusData?.connected && (
                    <div className="shrink-0">
                      <Button
                        variant="destructive"
                        disabled={disconnectMutation.isPending}
                        onClick={handleDisconnect}
                        className="w-full sm:w-auto gap-2 bg-red-50 hover:bg-red-100 text-red-750 border border-red-200/60"
                      >
                        {disconnectMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        Disconnect Gmail
                      </Button>
                    </div>
                  )}
                </div>

                {!statusData?.connected && (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="clientId" className="text-xs font-bold text-slate-605">
                          Google Client ID <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="clientId"
                          type="text"
                          placeholder="Enter Google Client ID"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          disabled={connectMutation.isPending}
                          className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary text-xs h-9 rounded-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientSecret" className="text-xs font-bold text-slate-605">
                          Google Client Secret <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="clientSecret"
                          type="password"
                          placeholder="Enter Google Client Secret"
                          value={clientSecret}
                          onChange={(e) => setClientSecret(e.target.value)}
                          disabled={connectMutation.isPending}
                          className="border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary text-xs h-9 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowGuide(!showGuide)}
                        className="text-primary hover:text-primary/80 hover:bg-transparent p-0 h-auto text-xs font-bold flex items-center gap-1.5 self-start sm:self-center"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                        {showGuide ? "Hide Setup Guide" : "How do I get Google Credentials?"}
                      </Button>

                      <Button
                        onClick={handleConnectGmail}
                        disabled={connectMutation.isPending}
                        className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/30 rounded-lg"
                      >
                        {connectMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                        Connect Gmail
                      </Button>
                    </div>

                    {showGuide && (
                      <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4 text-xs text-slate-600 leading-relaxed animate-in fade-in slide-in-from-top-2 duration-300">
                        <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-200 pb-2">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          Step-by-Step Google Console Configuration Guide
                        </h4>
                        
                        <ol className="list-decimal list-inside space-y-3">
                          <li>
                            <strong className="text-slate-850">Open Google Cloud Console:</strong>
                            <div className="pl-4 mt-1">
                              Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold inline-flex items-center gap-0.5">Google Cloud Console <Link2 className="h-3 w-3 inline" /></a>. Log in with your preferred Google account.
                            </div>
                          </li>
                          
                          <li>
                            <strong className="text-slate-850">Create a New Project:</strong>
                            <div className="pl-4 mt-1">
                              Click on the project selection dropdown at the top left, click <strong className="text-slate-700">New Project</strong>, enter a name (e.g., <code className="text-primary bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono">ApexReach Email Sender</code>), and click <strong className="text-slate-700">Create</strong>. Select the project once created.
                            </div>
                          </li>
                          
                          <li>
                            <strong className="text-slate-850">Enable the Gmail API:</strong>
                            <div className="pl-4 mt-1">
                              Search for <strong className="text-slate-700">"Gmail API"</strong> in the top search bar, select it from the marketplace list, and click <strong className="text-slate-700">Enable</strong>.
                            </div>
                          </li>
                          
                          <li>
                            <strong className="text-slate-850">Configure the OAuth Consent Screen:</strong>
                            <div className="pl-4 mt-1 space-y-1.5 text-slate-600">
                              <p>Navigate to <strong className="text-slate-700">APIs & Services &gt; OAuth consent screen</strong> in the left sidebar menu.</p>
                              <p>Select <strong className="text-slate-700">User Type: External</strong> and click <strong className="text-slate-700">Create</strong>.</p>
                              <p>Provide basic app details: App Name (e.g., <code className="text-primary bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono">ApexReach</code>), User Support Email, and Developer Contact Info. Click <strong className="text-slate-700">Save and Continue</strong>.</p>
                              <p>In the <strong className="text-slate-700">Scopes</strong> step, click <strong className="text-slate-700">Add or Remove Scopes</strong>, check the box for the <code className="text-primary bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono">.../auth/gmail.send</code> scope (enable sending emails on your behalf), and click <strong className="text-slate-700">Update</strong>. Continue to next step.</p>
                              <p>In the <strong className="text-slate-700">Test Users</strong> step, click <strong className="text-slate-700">Add Users</strong> and enter the Gmail address you want to log in and send emails from. <strong className="text-amber-600 font-bold">Important:</strong> Gmail connection will fail during login if your account is not added here.</p>
                            </div>
                          </li>
                          
                          <li>
                            <strong className="text-slate-850">Create OAuth Credentials:</strong>
                            <div className="pl-4 mt-1 space-y-2">
                              <p>Navigate to <strong className="text-slate-700">APIs & Services &gt; Credentials</strong> in the left sidebar.</p>
                              <p>Click <strong className="text-slate-700">+ Create Credentials &gt; OAuth client ID</strong>.</p>
                              <p>Set <strong className="text-slate-700">Application Type</strong> to <strong className="text-slate-700">Web application</strong>.</p>
                              
                               <div className="space-y-1.5">
                                 <p>Under <strong className="text-slate-700 dark:text-slate-300">Authorized JavaScript Origins</strong>, click <strong className="text-slate-700 dark:text-slate-300">Add URI</strong> and enter your frontend URLs:</p>
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded">
                                      <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase min-w-[120px]">Local Default:</span>
                                      <code className="text-emerald-700 dark:text-emerald-400 select-all font-mono">http://localhost:5173</code>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-dashed p-1.5 rounded">
                                      <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase min-w-[120px]">Production:</span>
                                      <code className="text-slate-750 dark:text-slate-300 select-all font-mono">https://apexreach.onrender.com</code>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="space-y-1.5 pt-1">
                                  <p>Under <strong className="text-slate-700 dark:text-slate-300">Authorized Redirect URIs</strong>, click <strong className="text-slate-700 dark:text-slate-300">Add URI</strong> and enter the callback URLs:</p>
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded">
                                      <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase min-w-[120px]">Local Default:</span>
                                      <code className="text-emerald-700 dark:text-emerald-400 select-all font-mono">http://localhost:5000/api/v1/auth/google/callback</code>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-dashed p-1.5 rounded">
                                      <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase min-w-[120px]">Production:</span>
                                      <code className="text-slate-750 dark:text-slate-300 select-all font-mono">https://apexreach.onrender.com/api/v1/auth/google/callback</code>
                                    </div>
                                  </div>
                                </div>
                              
                              <p className="pt-1">Click <strong className="text-slate-700 font-bold">Create</strong>.</p>
                            </div>
                          </li>
                          
                          <li>
                            <strong className="text-slate-855">Copy Credentials:</strong>
                            <div className="pl-4 mt-1">
                              A modal will show your <strong className="text-slate-700">Client ID</strong> and <strong className="text-slate-700">Client Secret</strong>. Copy and paste them into the input fields above, then click <strong className="text-slate-700">Connect Gmail</strong>.
                            </div>
                          </li>
                        </ol>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-slate-105">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50/50 border border-slate-150">
                <HelpCircle className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-500 space-y-2">
                  <p className="font-bold text-slate-700">How does this work?</p>
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
