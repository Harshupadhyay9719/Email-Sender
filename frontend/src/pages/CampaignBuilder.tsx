import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Save, Loader2, AlertTriangle, Info, Timer, Zap, Clock, Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { TipTapEditor } from "@/components/editor/TipTapEditor";
import { apiRequest } from "@/lib/api";

export function CampaignBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const queryClient = useQueryClient();

  // ── Form state ──────────────────────────────────────────────
  const [campaignName, setCampaignName] = useState("");
  const [description, setDescription] = useState("");

  // emailContent fields
  const [subject, setSubject] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [htmlBody, setHtmlBody] = useState("<p>Hello {{contact_name}},</p>");

  // config fields
  const [targetOrgs, setTargetOrgs] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16)
  );
  const [dailyLimit, setDailyLimit] = useState(500);
  const [minDelay, setMinDelay] = useState(30);
  const [maxDelay, setMaxDelay] = useState(90);
  const [delayUnit, setDelayUnit] = useState<"seconds" | "minutes">("seconds");

  const [error, setError] = useState<string | null>(null);

  // ── Delay helpers ────────────────────────────────────────────
  const PRESETS = [
    { label: "Instant",  icon: Zap,   min: 0,    max: 5,    desc: "0 – 5 s" },
    { label: "Fast",     icon: Gauge,  min: 10,   max: 30,   desc: "10 – 30 s" },
    { label: "Normal",   icon: Timer,  min: 30,   max: 90,   desc: "30 – 90 s" },
    { label: "Slow",     icon: Clock,  min: 120,  max: 300,  desc: "2 – 5 min" },
    { label: "Safe",     icon: Clock,  min: 300,  max: 600,  desc: "5 – 10 min" },
  ];

  const toUnit = (secs: number) =>
    delayUnit === "minutes" ? +(secs / 60).toFixed(1) : secs;

  const fromUnit = (val: number) =>
    delayUnit === "minutes" ? Math.round(val * 60) : val;

  const unitMax = delayUnit === "minutes" ? 30 : 1800; // 30 min or 1800 s

  const fmtSeconds = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  };

  const activePreset = PRESETS.find(p => p.min === minDelay && p.max === maxDelay) ?? null;


  // ── Load organizations list ──────────────────────────────────
  const { data: orgs } = useQuery({
    queryKey: ["organizations", "list"],
    queryFn: () => apiRequest("/organizations?limit=1000"),
    select: (d: any) => d?.organizations ?? d?.data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  // ── Load google status so user can see connected email ───────
  const { data: gmailStatus } = useQuery({
    queryKey: ["googleAuthStatus"],
    queryFn: () => apiRequest("/auth/google/status"),
  });

  // ── Load existing campaign when editing ─────────────────────
  const { data: campaignData, isLoading: loadingCampaign } = useQuery({
    queryKey: ["campaign", id],
    queryFn: () => apiRequest(`/campaigns/${id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (campaignData && isEdit) {
      setCampaignName(campaignData.campaignName ?? "");
      setDescription(campaignData.description ?? "");
      setSubject(campaignData.emailContent?.subject ?? "");
      setFromEmail(campaignData.emailContent?.from ?? "");
      setReplyTo(campaignData.emailContent?.replyTo ?? "");
      setHtmlBody(campaignData.emailContent?.htmlBody ?? "");
      setTargetOrgs(campaignData.config?.targetOrganizations ?? []);
      if (campaignData.config?.sendingConfig?.startDate) {
        setStartDate(
          new Date(campaignData.config.sendingConfig.startDate).toISOString().slice(0, 16)
        );
      }
      setDailyLimit(campaignData.config?.sendingConfig?.dailySendLimit ?? 500);
      setMinDelay(campaignData.config?.sendingConfig?.minimumDelaySeconds ?? 30);
      setMaxDelay(campaignData.config?.sendingConfig?.maximumDelaySeconds ?? 90);
    }
  }, [campaignData, isEdit]);

  // ── Save / Update mutation ───────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/campaigns/${id}` : "/campaigns";
      return apiRequest(url, { method, body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      navigate("/campaigns");
    },
    onError: (err: any) => {
      setError(err.message || "Failed to save campaign");
    },
  });

  const handleSave = () => {
    setError(null);

    // ── Client-side validation ───────────────────────────────
    if (!campaignName.trim()) { setError("Campaign name is required."); return; }
    if (!subject.trim()) { setError("Email subject is required."); return; }
    if (!fromEmail.trim()) { setError("From email is required. Connect your Gmail in Settings first."); return; }
    if (!htmlBody.trim() || htmlBody === "<p></p>") { setError("Email body is required."); return; }
    if (targetOrgs.length === 0) { setError("Select at least one target slot."); return; }
    if (!startDate) { setError("Start date is required."); return; }

    const payload = {
      campaignName: campaignName.trim(),
      description: description.trim() || undefined,
      emailContent: {
        subject: subject.trim(),
        htmlBody,
        textBody: htmlBody.replace(/<[^>]+>/g, ""),
        from: fromEmail.trim(),
        replyTo: replyTo.trim() || undefined,
      },
      config: {
        targetOrganizations: targetOrgs,
        sendingConfig: {
          startDate: new Date(startDate).toISOString(),
          minimumDelaySeconds: minDelay,
          maximumDelaySeconds: maxDelay,
          dailySendLimit: dailyLimit,
        },
      },
    };

    saveMutation.mutate(payload);
  };

  if (loadingCampaign) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const orgList: any[] = orgs ?? [];
  const connectedEmail: string = gmailStatus?.connected ? gmailStatus.email : "";

  return (
    <div className="page-shell max-w-4xl mx-auto">
      <Card className="border-slate-800 bg-slate-950/80 backdrop-blur">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl">{isEdit ? "Edit Campaign" : "New Campaign"}</CardTitle>
          </div>
          <CardDescription>
            Fill in all required fields to create an outreach campaign.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-800/40 bg-red-950/20 p-4 text-sm text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p>{error}</p>
            </div>
          )}

          {/* Gmail tip */}
          {!connectedEmail && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-800/30 bg-amber-950/10 p-3 text-xs text-amber-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                You haven't connected a Gmail account yet.{" "}
                <a href="/settings" className="underline font-semibold">Go to Settings</a> and connect Gmail
                before creating a campaign, then enter your Gmail address in the "From Email" field below.
              </p>
            </div>
          )}

          {/* ── Campaign basics ── */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="campaignName">Campaign Name <span className="text-red-400">*</span></Label>
              <Input
                id="campaignName"
                placeholder="Q3 Outreach"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional short description"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          <Separator />

          {/* ── Email Content ── */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Email Content</p>
            <p className="text-xs text-slate-400">Use <code className="bg-slate-800 px-1 py-0.5 rounded">{"{{contact_name}}"}</code>, <code className="bg-slate-800 px-1 py-0.5 rounded">{"{{company_name}}"}</code> as merge fields.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fromEmail">
                From Email <span className="text-red-400">*</span>
                {connectedEmail && (
                  <span className="ml-2 text-xs text-emerald-400">(Connected: {connectedEmail})</span>
                )}
              </Label>
              <Input
                id="fromEmail"
                type="email"
                placeholder="you@gmail.com"
                value={fromEmail}
                onChange={e => setFromEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="replyTo">Reply-To Email</Label>
              <Input
                id="replyTo"
                type="email"
                placeholder="replies@company.com (optional)"
                value={replyTo}
                onChange={e => setReplyTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Email Subject <span className="text-red-400">*</span></Label>
            <Input
              id="subject"
              placeholder="Introducing our solution to {{company_name}}"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Email Body <span className="text-red-400">*</span></Label>
            <TipTapEditor content={htmlBody} onChange={setHtmlBody} />
          </div>

          <Separator />

          {/* ── Targeting ── */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Targeting</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetOrgs">
              Target Slots <span className="text-red-400">*</span>
            </Label>
            {orgList.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No slots imported yet. <a href="/import" className="underline">Import from Excel</a> first.</p>
            ) : (
              <div className="grid gap-2 max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                {orgList.map((o: any) => (
                  <label key={o._id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-800/50 rounded px-2 py-1.5 transition-colors">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary"
                      checked={targetOrgs.includes(o._id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setTargetOrgs(prev => [...prev, o._id]);
                        } else {
                          setTargetOrgs(prev => prev.filter(id => id !== o._id));
                        }
                      }}
                    />
                    <span className="text-sm text-slate-200">{o.companyName}</span>
                    {o.organizationStatus?.totalContacts > 0 && (
                      <span className="ml-auto text-xs text-slate-500">{o.organizationStatus.totalContacts} contacts</span>
                    )}
                  </label>
                ))}
              </div>
            )}
            {targetOrgs.length > 0 && (
              <p className="text-xs text-emerald-400">{targetOrgs.length} slot{targetOrgs.length !== 1 ? "s" : ""} selected</p>
            )}
          </div>

          <Separator />

          {/* ── Sending Configuration ── */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Sending Configuration</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date <span className="text-red-400">*</span></Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Daily Send Limit</Label>
              <Input
                id="dailyLimit"
                type="number"
                min={1}
                max={2000}
                value={dailyLimit}
                onChange={e => setDailyLimit(Number(e.target.value))}
              />
            </div>
          </div>

          {/* ── Delay Presets ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Delay Between Emails</Label>
              {/* Unit toggle */}
              <div className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setDelayUnit("seconds")}
                  className={`rounded px-2.5 py-1 transition-colors ${
                    delayUnit === "seconds"
                      ? "bg-primary text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  seconds
                </button>
                <button
                  type="button"
                  onClick={() => setDelayUnit("minutes")}
                  className={`rounded px-2.5 py-1 transition-colors ${
                    delayUnit === "minutes"
                      ? "bg-primary text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  minutes
                </button>
              </div>
            </div>

            {/* Preset chips */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => { setMinDelay(p.min); setMaxDelay(p.max); }}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    activePreset?.label === p.label
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <p.icon className="h-3 w-3" />
                  {p.label}
                  <span className="text-slate-400">({p.desc})</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setMinDelay(0); setMaxDelay(0); }}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  !activePreset && minDelay === 0 && maxDelay === 0
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500"
                }`}
              >
                Custom
              </button>
            </div>

            {/* Sliders */}
            <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Minimum delay</span>
                  <span className="font-mono font-semibold text-emerald-400">{fmtSeconds(minDelay)}</span>
                </div>
                <Slider
                  min={0}
                  max={unitMax}
                  step={delayUnit === "minutes" ? 0.5 : 5}
                  value={[toUnit(minDelay)]}
                  onValueChange={([v]) => {
                    const secs = fromUnit(v);
                    setMinDelay(secs);
                    if (secs > maxDelay) setMaxDelay(secs);
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>0</span>
                  <span>{delayUnit === "minutes" ? "30 min" : "30 min"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Maximum delay</span>
                  <span className="font-mono font-semibold text-blue-400">{fmtSeconds(maxDelay)}</span>
                </div>
                <Slider
                  min={0}
                  max={unitMax}
                  step={delayUnit === "minutes" ? 0.5 : 5}
                  value={[toUnit(maxDelay)]}
                  onValueChange={([v]) => {
                    const secs = fromUnit(v);
                    setMaxDelay(secs);
                    if (secs < minDelay) setMinDelay(secs);
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>0</span>
                  <span>30 min</span>
                </div>
              </div>

              {/* Or type exact values */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label htmlFor="minDelayInput" className="text-xs text-slate-400">
                    Min ({delayUnit})
                  </Label>
                  <Input
                    id="minDelayInput"
                    type="number"
                    min={0}
                    value={toUnit(minDelay)}
                    onChange={e => {
                      const secs = fromUnit(Number(e.target.value));
                      setMinDelay(secs);
                      if (secs > maxDelay) setMaxDelay(secs);
                    }}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="maxDelayInput" className="text-xs text-slate-400">
                    Max ({delayUnit})
                  </Label>
                  <Input
                    id="maxDelayInput"
                    type="number"
                    min={0}
                    value={toUnit(maxDelay)}
                    onChange={e => {
                      const secs = fromUnit(Number(e.target.value));
                      setMaxDelay(secs);
                      if (secs < minDelay) setMinDelay(secs);
                    }}
                    className="h-8 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Live preview */}
              <div className="rounded-md border border-slate-700/60 bg-slate-800/40 px-4 py-2.5 text-xs text-slate-300">
                <span className="text-slate-500">Send schedule preview: </span>
                Each email will be sent{" "}
                {minDelay === maxDelay
                  ? <span className="font-semibold text-white">{fmtSeconds(minDelay)} apart</span>
                  : <>
                      between{" "}
                      <span className="font-semibold text-emerald-400">{fmtSeconds(minDelay)}</span>
                      {" "}&amp;{" "}
                      <span className="font-semibold text-blue-400">{fmtSeconds(maxDelay)}</span>
                      {" "}apart (random)
                    </>}
              </div>
            </div>
          </div>

          {/* ── Actions ── */}
          <Separator />
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => navigate("/campaigns")}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isEdit ? "Update" : "Create"} Campaign
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
