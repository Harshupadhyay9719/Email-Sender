import { useState } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Building2, ChevronDown, ChevronRight, Download, Mail, MoreHorizontal,
  Phone, Plus, Search, ShieldCheck, Trash2, Users, X, CheckCircle2,
  AlertTriangle, Clock, HelpCircle, Globe, Edit2, RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

type ValidationStatus = "VALID" | "INVALID" | "RISKY" | "UNKNOWN" | "PENDING";

const STATUS_CONFIG: Record<ValidationStatus, { label: string; color: string; icon: React.ElementType }> = {
  VALID:   { label: "Valid",   color: "text-emerald-600 bg-emerald-50 border-emerald-200",  icon: CheckCircle2 },
  INVALID: { label: "Invalid", color: "text-red-600 bg-red-50 border-red-200",              icon: X },
  RISKY:   { label: "Risky",   color: "text-amber-600 bg-amber-50 border-amber-200",        icon: AlertTriangle },
  UNKNOWN: { label: "Unknown", color: "text-slate-500 bg-slate-50 border-slate-200",         icon: HelpCircle },
  PENDING: { label: "Pending", color: "text-blue-600 bg-blue-50 border-blue-200",           icon: Clock },
};

function ValidationBadge({ status }: { status: ValidationStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.UNKNOWN;
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium", cfg.color)}>
      <Icon className="h-3 w-3" />{cfg.label}
    </span>
  );
}

function ContactsDialog({ org, onClose }: { org: any; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const filtered = (org.contacts ?? []).filter((c: any) =>
    `${c.name} ${c.email} ${c.designation}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Contacts — {org.companyName}
          <Badge variant="secondary" className="ml-1">{org.contacts?.length ?? 0}</Badge>
        </DialogTitle>
      </DialogHeader>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search contacts…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No contacts found.</p>
        )}
        {filtered.map((c: any, i: number) => (
          <div key={i} className="flex items-start justify-between rounded-lg border bg-card p-3 gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{c.name || "—"}</p>
                {c.designation && <span className="text-xs text-muted-foreground">· {c.designation}</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {c.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <a href={`mailto:${c.email}`} className="hover:text-foreground hover:underline">{c.email}</a>
                  </span>
                )}
                {c.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />{c.phone}
                  </span>
                )}
              </div>
            </div>
            <ValidationBadge status={c.emailValidation?.status ?? "UNKNOWN"} />
          </div>
        ))}
      </div>
      <DialogFooter>
        <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}

function OrgRow({ org, onViewContacts, onDelete, onValidate }: { org: any; onViewContacts: (o: any) => void; onDelete: (id: string) => void; onValidate: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border bg-card transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
          {org.companyName?.[0] ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{org.companyName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {org.industry && <span>{org.industry} · </span>}
            {org.website && (
              <a href={org.website} target="_blank" rel="noreferrer" className="hover:underline flex-inline items-center gap-0.5">
                <Globe className="h-2.5 w-2.5 inline mr-0.5" />{org.website}
              </a>
            )}
          </p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />{org.contacts?.length ?? 0} contacts
          </Badge>
          {org.contactedAt && (
            <Badge variant="secondary" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
              Contacted
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewContacts(org)}>
              <Users className="h-4 w-4 mr-2" />View Contacts
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onValidate(org._id)}>
              <ShieldCheck className="h-4 w-4 mr-2" />Validate Emails
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(org._id)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {expanded && (
        <div className="border-t bg-muted/20 px-4 pb-3 pt-2">
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {(org.contacts ?? []).slice(0, 6).map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-2 rounded-md border bg-background p-2 text-xs">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-[10px]">
                  {c.name?.[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{c.name || c.email}</p>
                  <p className="text-muted-foreground truncate">{c.email}</p>
                </div>
                <ValidationBadge status={c.emailValidation?.status ?? "UNKNOWN"} />
              </div>
            ))}
            {org.contacts?.length > 6 && (
              <button onClick={() => onViewContacts(org)} className="flex items-center gap-2 rounded-md border border-dashed bg-background p-2 text-xs text-muted-foreground hover:bg-muted transition-colors">
                <Plus className="h-3 w-3" />
                {org.contacts.length - 6} more contacts…
              </button>
            )}
          </div>
          {org.contacts?.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">No contacts in this organization.</p>
          )}
        </div>
      )}
    </div>
  );
}

export function Organizations() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const limit = perPage;

  const { data, isLoading, isFetching } = useQuery<any>({
    queryKey: ["organizations", page, search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search && { search }),
        ...(statusFilter !== "all" && { contactStatus: statusFilter }),
      });
      return apiRequest(`/organizations?${params.toString()}`);
    },
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/organizations/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organizations"] }),
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/organizations/${id}/validate-contacts`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organizations"] }),
  });

  const exportCSV = async () => {
    const url = `${(import.meta as any).env?.VITE_API_URL ?? "http://localhost:5000/api"}/organizations/export`;
    const token = localStorage.getItem("authToken");
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "organizations.csv";
    a.click();
  };

  const orgs: any[] = data?.organizations ?? data?.data ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="page-shell">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organizations</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {total.toLocaleString()} companies · manage contacts & email status
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
          <Download className="h-4 w-4" />Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search company, industry, website…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Contact status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="not_contacted">Not Contacted</SelectItem>
          </SelectContent>
        </Select>
        {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent>
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">No organizations found. Import an Excel file to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orgs.map((org: any) => (
            <OrgRow
              key={org._id}
              org={org}
              onViewContacts={setSelectedOrg}
              onDelete={(id) => deleteMutation.mutate(id)}
              onValidate={(id) => validateMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {total.toLocaleString()} total
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Contacts dialog */}
      <Dialog open={!!selectedOrg} onOpenChange={open => !open && setSelectedOrg(null)}>
        {selectedOrg && <ContactsDialog org={selectedOrg} onClose={() => setSelectedOrg(null)} />}
      </Dialog>
    </div>
  );
}
