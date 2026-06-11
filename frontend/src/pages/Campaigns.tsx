import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail, MailPlus, Play, Pause, Trash2, MoreHorizontal, Search,
  Edit2, Download, RefreshCw, Clock, CheckCircle2, XCircle,
  AlertTriangle, BarChart3, Send, StopCircle, Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

type CampaignStatus = "Draft" | "Scheduled" | "Sending" | "Paused" | "Completed" | "Cancelled" | "Failed";

const STATUS_MAP: Record<CampaignStatus, { label: string; color: string; icon: React.ElementType }> = {
  Draft:     { label: "Draft",     color: "bg-slate-100 text-slate-700 border-slate-200",    icon: Edit2 },
  Scheduled: { label: "Scheduled", color: "bg-blue-50 text-blue-700 border-blue-200",        icon: Clock },
  Sending:   { label: "Sending",   color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: Play },
  Paused:    { label: "Paused",    color: "bg-amber-50 text-amber-700 border-amber-200",     icon: Pause },
  Completed: { label: "Completed", color: "bg-indigo-50 text-indigo-700 border-indigo-200",  icon: CheckCircle2 },
  Cancelled: { label: "Cancelled", color: "bg-slate-50 text-slate-500 border-slate-200",    icon: XCircle },
  Failed:    { label: "Failed",    color: "bg-red-50 text-red-700 border-red-200",           icon: XCircle },
};

function StatusBadge({ status }: { status: CampaignStatus }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.Draft;
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium", s.color)}>
      <Icon className="h-3 w-3" />{s.label}
    </span>
  );
}

function CampaignCard({ campaign, onAction }: { campaign: any; onAction: (action: string, id: string) => void }) {
  // Backend returns campaignName, config.status, emailContent.subject
  const displayName = campaign.campaignName ?? campaign.name ?? "Unnamed Campaign";
  const displaySubject = campaign.emailContent?.subject ?? campaign.subject ?? "";
  const displayStatus: CampaignStatus = (
    campaign.config?.status ??
    campaign.status ??
    "Draft"
  ) as CampaignStatus;

  const stats = campaign.statistics ?? campaign.stats ?? {};
  const sent = stats.emailsSent ?? stats.sent ?? 0;
  const total = stats.totalContactsSelected ?? stats.total ?? 0;
  const progress = total > 0 ? Math.round((sent / total) * 100) : 0;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{displayName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">{displaySubject}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={displayStatus} />
                {campaign.config?.sendingConfig?.startDate && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(campaign.config.sendingConfig.startDate).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={`/campaigns/${campaign._id}/edit`} className="flex items-center gap-2">
                  <Edit2 className="h-4 w-4" />Edit
                </Link>
              </DropdownMenuItem>
              {campaign.config?.status === "Draft" || campaign.config?.status === "Cancelled" ? (
                <DropdownMenuItem onClick={() => onAction("launch", campaign._id)}>
                  <Play className="h-4 w-4 mr-2 text-emerald-600" />Launch
                </DropdownMenuItem>
              ) : campaign.config?.status === "Paused" ? (
                <DropdownMenuItem onClick={() => onAction("resume", campaign._id)}>
                  <Play className="h-4 w-4 mr-2 text-emerald-600" />Resume
                </DropdownMenuItem>
              ) : campaign.config?.status === "Sending" ? (
                <DropdownMenuItem onClick={() => onAction("pause", campaign._id)}>
                  <Pause className="h-4 w-4 mr-2 text-amber-600" />Pause
                </DropdownMenuItem>
              ) : null}
              {campaign.config?.status === "Sending" && (
                <DropdownMenuItem onClick={() => onAction("cancel", campaign._id)}>
                  <StopCircle className="h-4 w-4 mr-2 text-red-600" />Cancel
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onAction("exportLogs", campaign._id)}>
                <Download className="h-4 w-4 mr-2" />Export Logs
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction("delete", campaign._id)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-4 gap-3 rounded-lg bg-muted/40 px-3 py-2 text-center text-xs">
          <div>
            <p className="font-semibold text-foreground">{(stats.emailsSent ?? stats.sent ?? 0).toLocaleString()}</p>
            <p className="text-muted-foreground">Sent</p>
          </div>
          <div>
            <p className="font-semibold text-amber-600">{(stats.emailsOpened ?? stats.opened ?? 0).toLocaleString()}</p>
            <p className="text-muted-foreground">Opened</p>
          </div>
          <div>
            <p className="font-semibold text-indigo-600">{(stats.emailsClicked ?? stats.clicked ?? 0).toLocaleString()}</p>
            <p className="text-muted-foreground">Clicked</p>
          </div>
          <div>
            <p className="font-semibold text-red-500">{(stats.emailsFailed ?? stats.failed ?? 0).toLocaleString()}</p>
            <p className="text-muted-foreground">Failed</p>
          </div>
        </div>

        {total > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span><span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Campaigns() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["campaigns", search, statusFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (statusFilter !== "all") p.set("status", statusFilter);
      return apiRequest(`/campaigns?${p.toString()}`);
    },
    refetchInterval: 15_000,
  });

  const actionMutation = useMutation({
    mutationFn: ({ action, id }: { action: string; id: string }) =>
      apiRequest(`/campaigns/${id}/${action}`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/campaigns/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["campaigns"] }); setDeleteTarget(null); },
  });

  const handleAction = async (action: string, id: string) => {
    if (action === "delete") { setDeleteTarget(id); return; }
    if (action === "exportLogs") {
      const base = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:5000/api/v1";
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${base}/campaigns/${id}/export`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `campaign-logs-${id}.csv`;
      a.click();
      return;
    }
    actionMutation.mutate({ action, id });
  };

  const campaigns: any[] = data?.campaigns ?? data?.data ?? [];

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Create, schedule, and monitor your email outreach campaigns.
          </p>
        </div>
        <Button onClick={() => navigate("/campaigns/new")} className="gap-2">
          <MailPlus className="h-4 w-4" />New Campaign
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search campaigns…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["all", "Draft", "Scheduled", "Sending", "Paused", "Completed", "Cancelled", "Failed"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="py-20 text-center">
          <CardContent>
            <Send className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 font-medium">No campaigns yet</p>
            <p className="text-sm text-muted-foreground mt-1">Click "New Campaign" to create your first outreach.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c: any) => (
            <CampaignCard key={c._id} campaign={c} onAction={handleAction} />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />Confirm Delete
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the campaign and all its email logs. This action cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting…" : "Delete Campaign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
