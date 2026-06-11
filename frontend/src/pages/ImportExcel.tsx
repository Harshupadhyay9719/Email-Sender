import { useRef, useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Building2, Download, RotateCcw, Send, Loader2,
  XCircle, Info, ArrowRight, ArrowLeft, Columns3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────
type Step = "upload" | "mapping" | "preview" | "confirming" | "done" | "error";
type DuplicateStrategy = "merge" | "replace";

type MappableField =
  | "contact.name"
  | "contact.email"
  | "contact.phone"
  | "contact.position"
  | "contact.department"
  | "contact.linkedin"
  | "contact.city"
  | "contact.notes"
  | "org.website"
  | "org.industry"
  | "org.tags"
  | "ignore";

interface FieldOption {
  value: MappableField;
  label: string;
}

interface ColumnMapping {
  excelColumn: string;
  field: MappableField;
  confidence?: number;
}

interface ColumnsResponse {
  importId: string;
  organizationName: string;
  orgExists: boolean;
  existingContactCount?: number;
  columns: string[];
  suggestedMappings: ColumnMapping[];
  fieldOptions: FieldOption[];
}

interface MappedPreview {
  importId: string;
  organizationName: string;
  orgExists: boolean;
  totalRows: number;
  validContacts: number;
  invalidRows: number;
  duplicates: number;
  sampleContacts: Array<Record<string, string | undefined>>;
  mappedFields: string[];
  ignoredColumns: string[];
  warnings: string[];
}

interface ConfirmResult {
  organization: { _id: string; companyName: string; totalContacts: number };
  contactsAdded: number;
  duplicatesSkipped: number;
  invalidRows: number;
  strategy: "create" | "merge" | "replace";
}

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload File" },
  { key: "mapping", label: "Map Columns" },
  { key: "preview", label: "Preview Contacts" },
  { key: "confirming", label: "Confirm Import" },
  { key: "done", label: "Completed" },
];

const FIELD_LABELS: Record<string, string> = {
  "contact.name": "Contact Name",
  "contact.email": "Email",
  "contact.phone": "Phone",
  "contact.position": "Position",
  "contact.department": "Department",
  "contact.linkedin": "LinkedIn",
  "contact.city": "City",
  "contact.notes": "Notes",
  "org.website": "Website",
  "org.industry": "Industry",
  "org.tags": "Tags",
  ignore: "Ignore",
};

function Stepper({ current }: { current: Step }) {
  const order: Step[] = ["upload", "mapping", "preview", "confirming", "done"];
  const idx = order.indexOf(current === "error" ? "upload" : current);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((s, i) => {
        const stepIdx = order.indexOf(s.key);
        const active = stepIdx === idx;
        const done = stepIdx < idx;
        return (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="h-3 w-3 text-slate-600" />}
            <span
              className={cn(
                "rounded-full px-2.5 py-1 border",
                active && "border-primary bg-primary/10 text-primary",
                done && "border-emerald-700 text-emerald-400",
                !active && !done && "border-slate-700 text-slate-500"
              )}
            >
              {i + 1}. {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export function ImportExcel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("upload");
  const [organizationName, setOrganizationName] = useState("");
  const [importId, setImportId] = useState<string>("");
  const [columnsData, setColumnsData] = useState<ColumnsResponse | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [mappedPreview, setMappedPreview] = useState<MappedPreview | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>("merge");
  const [confirmResult, setConfirmResult] = useState<ConfirmResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const trimmedOrgName = organizationName.trim();
  const canUpload = trimmedOrgName.length > 0;

  const { data: templates } = useQuery({
    queryKey: ["import-templates"],
    queryFn: () => apiRequest<Array<{ id: string; name: string; description: string }>>("/import/templates"),
  });

  const fieldOptions = columnsData?.fieldOptions ?? [];

  const mappedFieldList = useMemo(
    () => mappings.filter((m) => m.field !== "ignore").map((m) => FIELD_LABELS[m.field] ?? m.field),
    [mappings]
  );

  const ignoredColumns = useMemo(
    () => mappings.filter((m) => m.field === "ignore").map((m) => m.excelColumn),
    [mappings]
  );

  const hasRequiredMapping = useMemo(() => {
    const fields = mappings.map((m) => m.field);
    return fields.includes("contact.name") || fields.includes("contact.email");
  }, [mappings]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      form.append("organizationName", trimmedOrgName);
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/import/preview-columns`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Upload failed");
      return (json.data ?? json) as ColumnsResponse;
    },
    onSuccess: (data) => {
      setColumnsData(data);
      setImportId(String(data.importId));
      setMappings(
        data.suggestedMappings.map((s) => ({
          excelColumn: s.excelColumn,
          field: s.field,
          confidence: s.confidence,
        }))
      );
      setStep("mapping");
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Upload failed");
      setStep("error");
    },
  });

  const previewMappedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<MappedPreview>("/import/preview-mapped", {
        method: "POST",
        body: JSON.stringify({ importId, mappings }),
      });
    },
    onSuccess: (data) => {
      setMappedPreview(data);
      setDuplicateStrategy("merge");
      setStep("preview");
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Preview failed");
      setStep("error");
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { mappings };
      if (mappedPreview?.orgExists) body.duplicateStrategy = duplicateStrategy;
      return apiRequest<ConfirmResult>(`/import/${importId}/confirm`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: (data) => {
      setConfirmResult(data);
      setStep("done");
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Confirm failed");
      setStep("error");
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!canUpload) {
      setErrorMsg("Please enter an organization name before uploading");
      setStep("error");
      return;
    }
    setErrorMsg("");
    setColumnsData(null);
    setMappedPreview(null);
    setConfirmResult(null);
    uploadMutation.mutate(file);
  };

  const handleReset = () => {
    setStep("upload");
    setImportId("");
    setColumnsData(null);
    setMappings([]);
    setMappedPreview(null);
    setConfirmResult(null);
    setErrorMsg("");
    setDuplicateStrategy("merge");
  };

  const updateMapping = (excelColumn: string, field: MappableField) => {
    setMappings((prev) =>
      prev.map((m) => (m.excelColumn === excelColumn ? { ...m, field, confidence: undefined } : m))
    );
  };

  const strategyLabel = (s: ConfirmResult["strategy"]) => {
    if (s === "create") return "Created new organization";
    if (s === "merge") return "Merged into existing organization";
    return "Replaced all contacts";
  };

  const sampleColumns = useMemo(() => {
    if (!mappedPreview?.sampleContacts?.length) return [];
    const keys = new Set<string>();
    mappedPreview.sampleContacts.forEach((c) => Object.keys(c).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [mappedPreview]);

  const isBusy = uploadMutation.isPending || previewMappedMutation.isPending || confirmMutation.isPending;

  return (
    <div className="page-shell max-w-4xl mx-auto space-y-4">
      <Card className="border-slate-800 bg-slate-950/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Contacts from Excel
          </CardTitle>
          <CardDescription className="text-slate-400">
            Upload any Excel format — map columns to contact fields, then import into one organization.
          </CardDescription>
          <div className="pt-3">
            <Stepper current={step} />
          </div>
        </CardHeader>

        {/* ── Step 1: Upload ── */}
        {(step === "upload" || step === "error") && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name" className="text-slate-300">Organization Name</Label>
              <Input
                id="org-name"
                placeholder="e.g. ABC Logistics"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                disabled={isBusy}
                className="border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
              />
            </div>

            <input type="file" accept=".xlsx" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={!canUpload || uploadMutation.isPending}
                className="gap-2"
              >
                {uploadMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading columns…</>
                  : <><Upload className="h-4 w-4" /> Select Excel File</>}
              </Button>
              {step === "error" && (
                <Button variant="ghost" onClick={handleReset} className="gap-2 text-slate-400">
                  <RotateCcw className="h-4 w-4" /> Start Over
                </Button>
              )}
            </div>

            {templates && templates.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Download Templates</p>
                <div className="flex flex-wrap gap-2">
                  {templates.map((t) => (
                    <Button
                      key={t.id}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-slate-700 text-slate-300 hover:text-white"
                      onClick={() => window.open(`${API_BASE_URL}/import/template/${t.id}`, "_blank")}
                    >
                      <Download className="h-3.5 w-3.5" /> {t.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}

        {step === "error" && errorMsg && (
          <CardContent className="pt-0">
            <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-300">Import Failed</p>
                <p className="text-xs text-red-400 mt-1">{errorMsg}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Step 2: Map Columns ── */}
      {step === "mapping" && columnsData && (
        <Card className="border-slate-800 bg-slate-950/80 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Columns3 className="h-5 w-5 text-primary" />
              Map Columns — {columnsData.organizationName}
            </CardTitle>
            <CardDescription className="text-slate-400">
              Match your Excel columns to contact fields. At least Contact Name or Email is required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/80">
                  <tr>
                    <th className="px-4 py-2 text-left text-slate-300 font-medium">Excel Column</th>
                    <th className="px-4 py-2 text-left text-slate-300 font-medium">Database Field</th>
                    <th className="px-4 py-2 text-left text-slate-300 font-medium w-24">Auto</th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m) => (
                    <tr key={m.excelColumn} className="border-t border-slate-700/50">
                      <td className="px-4 py-3 text-slate-200 font-medium">{m.excelColumn}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={m.field}
                          onValueChange={(v) => updateMapping(m.excelColumn, v as MappableField)}
                        >
                          <SelectTrigger className="border-slate-700 bg-slate-900 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {m.confidence && m.confidence >= 60 ? `${m.confidence}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!hasRequiredMapping && (
              <p className="text-xs text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                Map at least one column to Contact Name or Email to continue.
              </p>
            )}

            <div className="flex justify-between pt-2 border-t border-slate-800">
              <Button variant="ghost" onClick={handleReset} className="gap-2 text-slate-400">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => previewMappedMutation.mutate()}
                disabled={!hasRequiredMapping || previewMappedMutation.isPending}
                className="gap-2"
              >
                {previewMappedMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating preview…</>
                  : <>Preview Contacts <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Preview ── */}
      {step === "preview" && mappedPreview && (
        <Card className="border-slate-800 bg-slate-950/80 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Preview — {mappedPreview.organizationName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {mappedPreview.orgExists && (
              <div className="rounded-lg border border-amber-800/40 bg-amber-950/10 p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Organization already exists. Choose how to import:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {(["merge", "replace"] as DuplicateStrategy[]).map((s) => (
                    <label
                      key={s}
                      className="flex items-center gap-2 cursor-pointer rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 flex-1"
                    >
                      <input
                        type="radio"
                        name="duplicateStrategy"
                        checked={duplicateStrategy === s}
                        onChange={() => setDuplicateStrategy(s)}
                        className="accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {s === "merge" ? "Merge new contacts" : "Replace all contacts"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {s === "merge"
                            ? "Add new contacts; skip duplicate emails"
                            : "Remove existing contacts and load this file"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Rows", value: mappedPreview.totalRows, color: "text-white" },
                { label: "Valid Contacts", value: mappedPreview.validContacts, color: "text-emerald-400" },
                { label: "Skipped", value: mappedPreview.invalidRows, color: "text-amber-400" },
                { label: "Duplicate Emails", value: mappedPreview.duplicates, color: "text-red-400" },
              ].map((t) => (
                <div key={t.label} className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-center">
                  <p className={`text-2xl font-bold ${t.color}`}>{t.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{t.label}</p>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Mapped Fields</p>
                <div className="flex flex-wrap gap-1.5">
                  {mappedFieldList.length > 0
                    ? mappedFieldList.map((f) => (
                        <span key={f} className="rounded bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 text-xs text-emerald-300">
                          {f}
                        </span>
                      ))
                    : <span className="text-xs text-slate-500">None</span>}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Ignored Columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {ignoredColumns.length > 0
                    ? ignoredColumns.map((c) => (
                        <span key={c} className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400 border border-slate-700">
                          {c}
                        </span>
                      ))
                    : <span className="text-xs text-slate-500">None</span>}
                </div>
              </div>
            </div>

            {(mappedPreview.warnings?.length ?? 0) > 0 && (
              <div className="rounded-lg border border-amber-800/40 bg-amber-950/10 p-3 space-y-1 max-h-32 overflow-y-auto">
                <p className="text-xs font-semibold text-amber-400">Warnings ({mappedPreview.warnings.length})</p>
                {mappedPreview.warnings.slice(0, 15).map((w, i) => (
                  <p key={i} className="text-xs text-amber-300/80">• {w}</p>
                ))}
              </div>
            )}

            {mappedPreview.sampleContacts?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Sample Contacts</p>
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-800/80">
                      <tr>
                        {sampleColumns.map((col) => (
                          <th key={col} className="px-3 py-2 text-left text-slate-300 font-medium capitalize">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mappedPreview.sampleContacts.map((row, i) => (
                        <tr key={i} className="border-t border-slate-700/50">
                          {sampleColumns.map((col) => (
                            <td key={col} className="px-3 py-2 text-slate-400">
                              {(row as Record<string, string>)[col] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setStep("mapping")} className="gap-2 text-slate-400">
                <ArrowLeft className="h-4 w-4" /> Edit Mapping
              </Button>
              <Button
                onClick={() => { setStep("confirming"); confirmMutation.mutate(); }}
                disabled={mappedPreview.validContacts === 0}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Import {mappedPreview.validContacts} contacts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Confirming ── */}
      {step === "confirming" && (
        <Card className="border-slate-800 bg-slate-950/80 backdrop-blur">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-slate-400">
              Saving contacts to &quot;{mappedPreview?.organizationName ?? columnsData?.organizationName}&quot;…
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Step 5: Done ── */}
      {step === "done" && confirmResult && (
        <Card className="border-emerald-900/40 bg-emerald-950/10">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-semibold text-emerald-300">Import Completed Successfully!</p>
                <p className="text-sm text-emerald-400/80 mt-0.5">
                  {strategyLabel(confirmResult.strategy)} — {confirmResult.organization.companyName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-emerald-800/30 bg-emerald-950/20 p-4 text-center">
                <p className="text-3xl font-bold text-emerald-400">{confirmResult.contactsAdded}</p>
                <p className="text-xs text-emerald-500 mt-1">Contacts Added</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-center">
                <p className="text-3xl font-bold text-slate-400">{confirmResult.duplicatesSkipped}</p>
                <p className="text-xs text-slate-500 mt-1">Duplicates Skipped</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-center">
                <p className="text-3xl font-bold text-slate-400">{confirmResult.invalidRows}</p>
                <p className="text-xs text-slate-500 mt-1">Invalid Rows</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-center">
                <p className="text-3xl font-bold text-white">{confirmResult.organization.totalContacts}</p>
                <p className="text-xs text-slate-500 mt-1">Total in Org</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleReset} variant="outline" className="gap-2 border-slate-700 text-slate-300">
                <Upload className="h-4 w-4" /> Import Another File
              </Button>
              <Button onClick={() => { window.location.href = "/organizations"; }} className="gap-2">
                <Building2 className="h-4 w-4" /> View Organizations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
