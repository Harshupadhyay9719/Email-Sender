import { useRef, useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Building2, Download, RotateCcw, Send, Loader2,
  XCircle, Info, ArrowRight, ArrowLeft, Columns3,
  BookOpen, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, API_BASE_URL } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────
type Step = "upload" | "mapping" | "preview" | "confirming" | "done" | "error";
type DuplicateStrategy = "merge" | "replace";

type MappableField =
  | "contact.name"
  | "contact.companyName"
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
  sampleValues?: Record<string, string[]>;
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
  { key: "upload", label: "Configure & Upload" },
  { key: "mapping", label: "Map Columns" },
  { key: "preview", label: "Preview Data" },
  { key: "confirming", label: "Confirm Import" },
  { key: "done", label: "Completed" },
];

const FIELD_LABELS: Record<string, string> = {
  "contact.name": "Contact Name",
  "contact.companyName": "Company Name",
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

// ─── Versatile Mail Formats Definitions ──────────────────────────
interface MailSubtype {
  key: string;
  label: string;
  description: string;
  expectedColumns: string[];
  fieldLabelOverrides?: Record<string, string>;
}

interface MailClassOption {
  key: string;
  label: string;
  emoji: string;
  description: string;
  subtypes: MailSubtype[];
}

const MAIL_CLASSES: MailClassOption[] = [
  {
    key: "marketing",
    label: "Broadcast & Marketing",
    emoji: "📢",
    description: "Large broadcast campaigns. Requires high throughput capacity.",
    subtypes: [
      {
        key: "newsletters",
        label: "Newsletters",
        description: "Recurring content updates, industry insights, and company digests.",
        expectedColumns: ["Email", "Name", "Tags"],
        fieldLabelOverrides: { "contact.name": "Subscriber Name", "contact.email": "Subscriber Email", "contact.notes": "Subscription Tags" }
      },
      {
        key: "promotional",
        label: "Promotional Campaigns",
        description: "Product launches, sales, discounts, and offers.",
        expectedColumns: ["Email", "Name", "CompanyName", "OfferCode"],
        fieldLabelOverrides: { "contact.name": "Customer Name", "contact.notes": "Offer Code / Discount Details" }
      },
      {
        key: "reengagement",
        label: "Re-engagement Campaigns",
        description: "Automated win-back series targeted at inactive users.",
        expectedColumns: ["Email", "Name", "LastActiveDate"],
        fieldLabelOverrides: { "contact.notes": "Last Active Date" }
      },
      {
        key: "invites",
        label: "Event Invites",
        description: "Bulk registrations for corporate webinars, seminars, or conferences.",
        expectedColumns: ["Email", "Name", "CompanyName", "JobTitle"],
        fieldLabelOverrides: { "contact.name": "Attendee Name", "contact.position": "Job Title" }
      }
    ]
  },
  {
    key: "transactional",
    label: "Transactional & Triggered",
    emoji: "⚙️",
    description: "Automated direct messages triggered instantly by user actions.",
    subtypes: [
      {
        key: "onboarding",
        label: "Account Onboarding",
        description: "Instant onboarding sequences triggered upon signup.",
        expectedColumns: ["Email", "Name", "SignupDate"],
        fieldLabelOverrides: { "contact.name": "User Name", "contact.email": "User Email", "contact.notes": "Signup Date" }
      },
      {
        key: "receipts",
        label: "Invoices & Receipts",
        description: "Digital receipts, billing invoices, and order tracking details.",
        expectedColumns: ["Email", "Name", "OrderNumber", "Amount"],
        fieldLabelOverrides: { "contact.name": "Client Name", "contact.notes": "Order Number & Amount" }
      },
      {
        key: "security",
        label: "Security Alerts",
        description: "Password resets, multi-factor logins, and access warning flags.",
        expectedColumns: ["Email", "Name", "AlertReason"],
        fieldLabelOverrides: { "contact.notes": "Security Action / Alert Reason" }
      },
      {
        key: "notifications",
        label: "Activity Notifications",
        description: "System updates, in-app notifications, or deadline reminders.",
        expectedColumns: ["Email", "Name", "NotificationTopic"],
        fieldLabelOverrides: { "contact.notes": "Notification Description" }
      }
    ]
  },
  {
    key: "cold-outreach",
    label: "B2B Cold Outreach",
    emoji: "👔",
    description: "Personalized cold pitches. Requires advanced tags and spam-avoidance.",
    subtypes: [
      {
        key: "prospecting",
        label: "Sales Prospecting",
        description: "Direct pitches to industry decision-makers and key accounts.",
        expectedColumns: ["Email", "Name", "CompanyName", "Position", "Industry"],
        fieldLabelOverrides: { "contact.name": "Prospect Name", "contact.email": "Work Email", "contact.companyName": "Prospect Company" }
      },
      {
        key: "pr-media",
        label: "PR & Media Outreach",
        description: "Distribution of press releases to journalists and influencers.",
        expectedColumns: ["Email", "Name", "MediaOutlet", "Niche"],
        fieldLabelOverrides: { "contact.name": "Journalist Name", "contact.companyName": "Media Outlet", "contact.position": "Beats / Niche" }
      },
      {
        key: "biz-dev",
        label: "Business Development",
        description: "Connecting with prospective affiliates or strategic partners.",
        expectedColumns: ["Email", "Name", "CompanyName", "PartnershipType"],
        fieldLabelOverrides: { "contact.name": "Partner Contact Name", "contact.notes": "Partnership Type Details" }
      }
    ]
  },
  {
    key: "general",
    label: "General Purpose",
    emoji: "📝",
    description: "Standard daily administrative or generalized group emails.",
    subtypes: [
      {
        key: "internal",
        label: "Internal Announcements",
        description: "Updates sent to all employees, team members, or community members.",
        expectedColumns: ["Email", "Name", "Department"],
        fieldLabelOverrides: { "contact.name": "Employee Name", "contact.email": "Employee Email" }
      },
      {
        key: "greetings",
        label: "Holiday Greetings",
        description: "Season's greetings or operational notices sent to database.",
        expectedColumns: ["Email", "Name"]
      },
      {
        key: "surveys",
        label: "Operational Surveys",
        description: "Quick feedback forms or general questionnaires.",
        expectedColumns: ["Email", "Name", "SurveyTopic"],
        fieldLabelOverrides: { "contact.notes": "Survey Topic / Link" }
      }
    ]
  },
  {
    key: "academic",
    label: "Academic & Internship",
    emoji: "🎓",
    description: "High-volume applications and announcements to universities/labs.",
    subtypes: [
      {
        key: "internship-job",
        label: "Internship & Job Campaigns",
        description: "Pitches sent to HR or professors. Swaps Institution, Professor, and Department.",
        expectedColumns: ["Email", "Name", "InstitutionName", "ProfessorName", "Department"],
        fieldLabelOverrides: { 
          "contact.name": "Professor / HR Contact Name", 
          "contact.companyName": "Institution / Company Name", 
          "contact.department": "Target Department",
          "contact.email": "Contact Email Address"
        }
      },
      {
        key: "research-outreach",
        label: "Research & Faculty Outreach",
        description: "Call for papers, research questionnaires, and collaboration proposals.",
        expectedColumns: ["Email", "Name", "UniversityName", "ResearchArea", "ProfessorName"],
        fieldLabelOverrides: {
          "contact.name": "Professor Name",
          "contact.companyName": "University / Lab Name",
          "contact.position": "Research Specialty",
          "contact.email": "Faculty Email"
        }
      },
      {
        key: "admin-student",
        label: "University Administrational",
        description: "Enrollment steps, admissions blasts, and alumni database updates.",
        expectedColumns: ["Email", "Name", "StudentId", "EnrollmentYear", "PolicyTopic"],
        fieldLabelOverrides: {
          "contact.name": "Student Name",
          "contact.email": "Student Email Address",
          "contact.notes": "Student ID / Enrollment Year"
        }
      }
    ]
  }
];

function Stepper({ current }: { current: Step }) {
  const order: Step[] = ["upload", "mapping", "preview", "confirming", "done"];
  const idx = order.indexOf(current === "error" ? "upload" : current);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold mt-2">
      {STEPS.map((s, i) => {
        const stepIdx = order.indexOf(s.key);
        const active = stepIdx === idx;
        const done = stepIdx < idx;
        return (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-slate-600" />}
            <span
              className={cn(
                "rounded-full px-3 py-1.5 border transition-all duration-205",
                active && "border-primary bg-primary/10 text-primary shadow-sm",
                done && "border-emerald-600 bg-emerald-50 text-emerald-700",
                !active && !done && "border-slate-200 bg-slate-50 text-slate-700"
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

  // Versatile mail classes state
  const [selectedClass, setSelectedClass] = useState<string>("marketing");
  const [selectedSubtype, setSelectedSubtype] = useState<string>("newsletters");

  const trimmedOrgName = organizationName.trim();
  const canUpload = trimmedOrgName.length > 0;

  const { data: templates } = useQuery({
    queryKey: ["import-templates"],
    queryFn: () => apiRequest<Array<{ id: string; name: string; description: string }>>("/import/templates"),
  });

  // Dynamic Expected Columns & Label Overrides
  const activeClass = useMemo(() => MAIL_CLASSES.find(c => c.key === selectedClass), [selectedClass]);
  const activeSubtype = useMemo(() => activeClass?.subtypes.find(s => s.key === selectedSubtype), [activeClass, selectedSubtype]);
  const expectedColumns = activeSubtype?.expectedColumns ?? [];

  const dynamicFieldOptions = useMemo(() => {
    const defaultOptions = columnsData?.fieldOptions ?? [];
    const overrides = activeSubtype?.fieldLabelOverrides;
    if (!overrides) return defaultOptions;

    return defaultOptions.map(opt => {
      const overrideLabel = overrides[opt.value];
      if (overrideLabel) {
        return {
          ...opt,
          label: `${overrideLabel} (Maps to: ${FIELD_LABELS[opt.value]})`
        };
      }
      return opt;
    });
  }, [columnsData, activeSubtype]);

  const checklistItems = useMemo(() => {
    const items = [
      { field: "contact.email" as MappableField, label: activeSubtype?.fieldLabelOverrides?.["contact.email"] || "Email", status: "required" },
      { field: "contact.name" as MappableField, label: activeSubtype?.fieldLabelOverrides?.["contact.name"] || "Contact Name", status: "recommended" },
    ];
    
    // Add other fields that have overrides in activeSubtype
    if (activeSubtype?.fieldLabelOverrides) {
      Object.entries(activeSubtype.fieldLabelOverrides).forEach(([f, label]) => {
        if (f !== "contact.email" && f !== "contact.name") {
          items.push({
            field: f as MappableField,
            label,
            status: "optional",
          });
        }
      });
    }
    
    return items;
  }, [activeSubtype]);

  const mappedFieldList = useMemo(
    () => mappings.filter((m) => m.field !== "ignore").map((m) => {
      const override = activeSubtype?.fieldLabelOverrides?.[m.field];
      return override ? `${override} (${FIELD_LABELS[m.field]})` : (FIELD_LABELS[m.field] ?? m.field);
    }),
    [mappings, activeSubtype]
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
      setErrorMsg("Please enter a slot name before uploading");
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
    if (s === "create") return "Created new slot";
    if (s === "merge") return "Merged into existing slot";
    return "Replaced slot contacts";
  };

  const sampleColumns = useMemo(() => {
    if (!mappedPreview?.sampleContacts?.length) return [];
    const keys = new Set<string>();
    mappedPreview.sampleContacts.forEach((c) => Object.keys(c).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [mappedPreview]);

  const isBusy = uploadMutation.isPending || previewMappedMutation.isPending || confirmMutation.isPending;

  // Counts of mapped vs ignored
  const mappedCount = useMemo(() => mappings.filter(m => m.field !== "ignore").length, [mappings]);
  const totalColumnsCount = useMemo(() => mappings.length, [mappings]);

  return (
    <div className="page-shell max-w-5xl mx-auto space-y-6">
      <Card className="border-slate-200 bg-white shadow-xl shadow-slate-100/40 rounded-2xl overflow-hidden dark:border-slate-850 dark:bg-slate-950/80">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-5 bg-gradient-to-r from-slate-50/90 via-slate-50/50 to-primary/5 dark:from-slate-900/50">
          <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-white text-2xl font-extrabold">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            ApexReach Slot Campaign Importer
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 font-semibold mt-1">
            Configure your campaign style, match your Excel sheet headings, and load your contacts into the slot.
          </CardDescription>
          <Stepper current={step} />
        </CardHeader>

        {/* ── Step 1: Upload & Format selection ── */}
        {(step === "upload" || step === "error") && (
          <CardContent className="pt-6 space-y-6">
            
            {/* Split layout: Selector vs expected columns */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column: Selectors (span 7) */}
              <div className="md:col-span-7 space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide">1. Select Class of Mail</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {MAIL_CLASSES.map(c => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => {
                          setSelectedClass(c.key);
                          setSelectedSubtype(c.subtypes[0].key);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center p-3 text-center border rounded-xl transition-all duration-150 hover:scale-[1.015]",
                          selectedClass === c.key
                            ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-655"
                        )}
                      >
                        <span className="text-2xl mb-1">{c.emoji}</span>
                        <span className="text-xs">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    2. Select Campaign Type
                  </Label>
                  <Select
                    value={selectedSubtype}
                    onValueChange={setSelectedSubtype}
                  >
                    <SelectTrigger className="border-slate-200 bg-white text-slate-800 font-semibold h-11 rounded-xl shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeClass?.subtypes.map(s => (
                        <SelectItem key={s.key} value={s.key}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-700 font-semibold italic pl-1 leading-relaxed">
                    {activeSubtype?.description}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="org-name" className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    3. Slot Name
                  </Label>
                  <Input
                    id="org-name"
                    placeholder="e.g. Summer Internship Outreach 2026"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    disabled={isBusy}
                    className="h-11 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-primary rounded-xl shadow-sm"
                  />
                </div>
              </div>

              {/* Right Column: Expected columns info & File Drop-Zone (span 5) */}
              <div className="md:col-span-5 space-y-4">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4 shadow-sm backdrop-blur-sm">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-primary/20 pb-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Required Column Guide
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-normal">
                    Before uploading, verify your Excel (.xlsx) sheet contains headers that match or correspond to these campaign columns:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {expectedColumns.map(col => (
                      <span key={col} className="rounded-lg bg-white dark:bg-slate-900 border border-primary/20 shadow-inner px-2.5 py-1 text-xs font-bold text-primary">
                        {col}
                      </span>
                    ))}
                  </div>
                  <div className="rounded-xl bg-white/65 dark:bg-slate-900/50 p-3 border border-primary/10 text-xs text-slate-700 dark:text-slate-300 font-bold flex gap-2">
                    <HelpCircle className="h-4 w-4 text-primary/70 shrink-0" />
                    <span>Headers don't need to be exact; you can manually map them in the next step.</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-3">
                  <input type="file" accept=".xlsx" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                  
                  {/* Beautiful drag & drop zone */}
                  <div 
                    onClick={() => canUpload && fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[140px]",
                      canUpload 
                        ? "border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary" 
                        : "border-slate-200 bg-slate-50/40 opacity-60 cursor-not-allowed"
                    )}
                  >
                    <Upload className={cn("h-8 w-8 mb-2", canUpload ? "text-primary" : "text-slate-500")} />
                    <p className="text-xs font-bold text-slate-800">
                      {uploadMutation.isPending ? "Reading headers..." : "Select or drag Excel file"}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-bold mt-1">Accepts .xlsx files up to 50MB</p>
                    {!canUpload && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mt-2">
                        ← Enter Slot Name first
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {templates && templates.length > 0 && (
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs font-extrabold text-slate-700 mb-2 uppercase tracking-wider">Example Templates</p>
                <div className="flex flex-wrap gap-2">
                  {templates.map((t) => (
                    <Button
                      key={t.id}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-slate-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-50 transition-all duration-155 rounded-lg text-xs"
                      onClick={() => window.open(`${API_BASE_URL}/import/template/${t.id}`, "_blank")}
                    >
                      <Download className="h-3.5 w-3.5 text-slate-500" /> {t.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}

        {step === "error" && errorMsg && (
          <CardContent className="pt-0 pb-6 px-6">
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-800">Import Process Terminated</p>
                <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
                <Button variant="outline" size="sm" onClick={handleReset} className="mt-3 border-red-200 text-red-600 bg-white hover:bg-red-50 gap-2">
                  <RotateCcw className="h-3.5 w-3.5" /> Restart Upload
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Step 2: Map Columns ── */}
      {step === "mapping" && columnsData && (
        <Card className="border-slate-200 bg-white shadow-xl shadow-slate-100/40 rounded-2xl overflow-hidden dark:border-slate-800 dark:bg-slate-950/80">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-gradient-to-r from-slate-50/90 via-slate-50/50 to-teal-50/50 dark:from-slate-900/50">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg text-slate-800 dark:text-white font-extrabold flex items-center gap-2">
                  <Columns3 className="h-5 w-5 text-primary" />
                  Map Excel Columns to Slot Fields
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 font-bold mt-1">
                  Connect headers in your spreadsheet to target system variables for <strong>{activeSubtype?.label}</strong>.
                </CardDescription>
              </div>
              <Badge className="bg-primary/10 border-primary/25 text-primary font-bold px-3 py-1">
                {mappedCount} of {totalColumnsCount} Columns Mapped
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Slot Schema Checklist (span 4) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 via-slate-50/60 to-primary/5 p-5 space-y-4 sticky top-6 shadow-sm shadow-slate-100">
                  <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <CheckCircle2 className="h-4 w-4 text-primary animate-pulse" />
                    Slot Schema Checklist
                  </h3>
                  <p className="text-xs text-slate-700 font-bold leading-relaxed">
                    Verify that your Excel columns map to the required or recommended fields below:
                  </p>
                  
                  <div className="space-y-2.5">
                    {checklistItems.map((item) => {
                      const mappedSource = mappings.find(m => m.field === item.field)?.excelColumn;
                      const isMapped = !!mappedSource;
                      
                      return (
                        <div 
                          key={item.field} 
                          className={cn(
                            "flex items-start justify-between p-3 rounded-xl border text-xs transition-all duration-200 shadow-sm",
                            isMapped 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300" 
                              : item.status === "required" 
                                ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300" 
                                : "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
                          )}
                        >
                          <div className="space-y-0.5">
                            <p className="font-bold flex items-center gap-1.5">
                              {isMapped ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              ) : item.status === "required" ? (
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 animate-bounce" />
                              ) : (
                                <span className="h-3.5 w-3.5 rounded-full border border-slate-300 flex items-center justify-center text-[8px] font-bold shrink-0">?</span>
                              )}
                              {item.label}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold pl-5">
                              {isMapped ? `Mapped to: ${mappedSource}` : `${item.status.toUpperCase()} Field`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Excel Columns Mapper (span 8) */}
              <div className="lg:col-span-8 space-y-3.5">
                {mappings.map((m) => {
                  const samples = columnsData.sampleValues?.[m.excelColumn] ?? [];
                  const isIgnored = m.field === "ignore";
                  
                  return (
                    <div 
                      key={m.excelColumn} 
                      className={cn(
                        "flex flex-col md:flex-row md:items-center justify-between border p-4 rounded-xl gap-4 transition-all duration-205 shadow-sm",
                        isIgnored 
                          ? "border-slate-200 bg-slate-50/40 opacity-75 dark:border-slate-800 dark:bg-slate-900/30" 
                          : "border-slate-200 bg-white hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 dark:border-slate-800 dark:bg-slate-950/80"
                      )}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 dark:text-white text-sm truncate">{m.excelColumn}</span>
                          {m.confidence && m.confidence >= 60 && !isIgnored && (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold py-0.5 hover:bg-emerald-50 select-none dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
                              Auto-matched ({m.confidence}%)
                            </Badge>
                          )}
                          {isIgnored && (
                            <Badge variant="outline" className="text-slate-600 border-slate-300 text-xs select-none dark:text-slate-400 dark:border-slate-800">
                              Ignored / Skipped
                            </Badge>
                          )}
                        </div>
                        
                        {/* Live values preview */}
                        {samples.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 min-w-0">
                            <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">Samples:</span>
                            {samples.map((s, idx) => (
                              <span 
                                key={idx} 
                                title={s}
                                className="rounded bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 px-2 py-0.5 text-xs text-slate-800 dark:text-slate-200 font-bold select-none truncate max-w-[150px]"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500 italic">No sample values found</span>
                        )}
                      </div>

                      <div className="w-full md:w-80 shrink-0 flex items-center gap-2">
                        <Select
                          value={m.field}
                          onValueChange={(v) => updateMapping(m.excelColumn, v as MappableField)}
                        >
                          <SelectTrigger className={cn(
                            "border bg-white font-semibold h-10 rounded-lg shadow-sm w-full transition-all text-xs",
                            isIgnored ? "border-slate-200 text-slate-500 bg-slate-50/50" : "border-primary/20 text-primary hover:border-primary/50"
                          )}>
                            <SelectValue placeholder="Choose target field" />
                          </SelectTrigger>
                          <SelectContent>
                            {dynamicFieldOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm"
                          onClick={() => updateMapping(m.excelColumn, isIgnored ? "contact.name" : "ignore")}
                          className={cn(
                            "text-xs px-2.5 h-10 border rounded-lg font-bold",
                            isIgnored 
                              ? "border-primary/20 text-primary hover:bg-primary/5" 
                              : "border-slate-200 text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          {isIgnored ? "Map" : "Ignore"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {!hasRequiredMapping && (
              <p className="text-xs text-amber-800 font-bold flex items-center gap-1.5 bg-amber-50 border border-amber-200 p-2.5 rounded-xl dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 animate-bounce" />
                Map at least Name or Email to import contacts.
              </p>
            )}

            <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" onClick={handleReset} className="gap-2 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-bold">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                onClick={() => previewMappedMutation.mutate()}
                disabled={!hasRequiredMapping || previewMappedMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 rounded-xl transition-all duration-205 shadow-md shadow-primary/10"
              >
                {previewMappedMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating preview…
                  </>
                ) : (
                  <>
                    Preview Data <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Preview ── */}
      {step === "preview" && mappedPreview && (
        <Card className="border-slate-200 bg-white shadow-xl shadow-slate-100/40 rounded-2xl overflow-hidden dark:border-slate-800 dark:bg-slate-950/80">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4 bg-gradient-to-r from-slate-50/90 via-slate-50/50 to-primary/5 dark:from-slate-900/50">
            <CardTitle className="text-lg text-slate-800 dark:text-white font-bold flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Preview Contacts — {mappedPreview.organizationName}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {mappedPreview.orgExists && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/45 p-4 space-y-3 shadow-inner">
                <p className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600 animate-bounce" />
                  Slot name already exists in database. Choose action:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {(["merge", "replace"] as DuplicateStrategy[]).map((s) => (
                    <label
                      key={s}
                      className="flex items-center gap-3 cursor-pointer rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3 flex-1 transition-all"
                    >
                      <input
                        type="radio"
                        name="duplicateStrategy"
                        checked={duplicateStrategy === s}
                        onChange={() => setDuplicateStrategy(s)}
                        className="accent-primary h-4 w-4"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-850">
                          {s === "merge" ? "Merge contacts into existing slot" : "Replace existing slot"}
                        </p>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                          {s === "merge"
                            ? "Add new contacts; skip existing emails"
                            : "Delete existing slot contacts and upload this new sheet"}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Rows", value: mappedPreview.totalRows, color: "text-slate-800 dark:text-slate-200" },
                { label: "Valid Contacts", value: mappedPreview.validContacts, color: "text-emerald-600 dark:text-emerald-450 font-bold" },
                { label: "Errors / Skipped", value: mappedPreview.invalidRows, color: "text-amber-600 dark:text-amber-400 font-bold" },
                { label: "Duplicate Emails", value: mappedPreview.duplicates, color: "text-red-500 dark:text-red-400" },
              ].map((t) => (
                <div key={t.label} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-center dark:border-slate-800 dark:bg-slate-900/50">
                  <p className={`text-2xl font-black ${t.color}`}>{t.value}</p>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">{t.label}</p>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div className="bg-slate-50/40 border border-slate-200 p-4 rounded-xl dark:bg-slate-900/30 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 mb-2.5 uppercase tracking-wide">Mapped Fields</p>
                <div className="flex flex-wrap gap-1.5">
                  {mappedFieldList.length > 0 ? (
                    mappedFieldList.map((f) => (
                      <span key={f} className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        {f}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">None</span>
                  )}
                </div>
              </div>
              <div className="bg-slate-50/40 border border-slate-200 p-4 rounded-xl dark:bg-slate-900/30 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-450 mb-2.5 uppercase tracking-wide">Ignored Columns</p>
                <div className="flex flex-wrap gap-1.5">
                  {ignoredColumns.length > 0 ? (
                    ignoredColumns.map((c) => (
                      <span key={c} className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400">None</span>
                  )}
                </div>
              </div>
            </div>

            {(mappedPreview.warnings?.length ?? 0) > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-3 space-y-1 max-h-32 overflow-y-auto">
                <p className="text-xs font-bold text-amber-700">Warnings & Errors ({mappedPreview.warnings.length})</p>
                {mappedPreview.warnings.slice(0, 15).map((w, i) => (
                  <p key={i} className="text-xs text-amber-600 font-medium">• {w}</p>
                ))}
              </div>
            )}

            {mappedPreview.sampleContacts?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sample Data Preview</p>
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-inner">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {sampleColumns.map((col) => (
                          <th key={col} className="px-3 py-2 text-left text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 capitalize">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {mappedPreview.sampleContacts.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/50">
                          {sampleColumns.map((col) => (
                            <td key={col} className="px-3 py-2 text-slate-600 dark:text-slate-300 font-medium">
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

            <div className="flex justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button variant="ghost" onClick={() => setStep("mapping")} className="gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" /> Edit Mapping
              </Button>
              <Button
                onClick={() => { setStep("confirming"); confirmMutation.mutate(); }}
                disabled={mappedPreview.validContacts === 0}
                className="bg-primary hover:bg-primary/90 text-white font-bold gap-2 rounded-xl transition-all duration-205 shadow-md shadow-primary/10"
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
        <Card className="border-slate-200 bg-white shadow-xl shadow-slate-100/40 rounded-2xl dark:border-slate-800 dark:bg-slate-950/80">
          <CardContent className="py-16 flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold animate-pulse">
              Saving contacts to slot &quot;{mappedPreview?.organizationName ?? columnsData?.organizationName}&quot;…
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Step 5: Done ── */}
      {step === "done" && confirmResult && (
        <Card className="border-emerald-250 bg-emerald-50/20 shadow-xl shadow-slate-100/25 rounded-2xl overflow-hidden dark:border-emerald-800/50 dark:bg-emerald-950/20">
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <p className="text-lg font-bold text-emerald-800 dark:text-emerald-450">Contacts Imported Successfully!</p>
                <p className="text-sm text-emerald-600 dark:text-emerald-450 font-semibold mt-0.5">
                  {strategyLabel(confirmResult.strategy)} — {confirmResult.organization.companyName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-emerald-100 bg-white p-4 text-center shadow-sm dark:border-emerald-950 dark:bg-slate-900/40">
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-450">{confirmResult.contactsAdded}</p>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1">Contacts Added</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-3xl font-black text-slate-500 dark:text-slate-405">{confirmResult.duplicatesSkipped}</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Duplicates Skipped</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-3xl font-black text-slate-500 dark:text-slate-405">{confirmResult.invalidRows}</p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">Invalid Rows</p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-white p-4 text-center shadow-sm dark:border-primary/30 dark:bg-slate-900/40">
                <p className="text-3xl font-black text-primary">{confirmResult.organization.totalContacts}</p>
                <p className="text-xs font-bold text-primary mt-1">Total in Slot</p>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <Button onClick={handleReset} variant="outline" className="gap-2 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg">
                <Upload className="h-4 w-4" /> Import Another File
              </Button>
              <Button onClick={() => { window.location.href = "/organizations"; }} className="bg-primary hover:bg-primary/90 text-white gap-2 rounded-lg">
                <Building2 className="h-4 w-4" /> View Slots
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
