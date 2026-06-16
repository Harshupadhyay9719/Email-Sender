import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileBarChart, FileSpreadsheet, RefreshCw, BarChart3, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

export function Reports() {
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["reports", "metrics"],
    queryFn: () => apiRequest("/analytics/reports"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["reports", "activity"],
    queryFn: () => apiRequest("/analytics/activity"),
    staleTime: 60 * 1000,
  });

  const { data: savedReports, isLoading: savedLoading } = useQuery({
    queryKey: ["reports", "saved"],
    queryFn: () => apiRequest("/analytics/saved"),
    staleTime: 10 * 60 * 1000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    } finally {
      // Simulate small delay for satisfying spinner visual
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf" = "csv") => {
    setIsExporting(true);
    try {
      const blob = await apiRequest("/analytics/export");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = format === "pdf" ? "pdf" : format === "excel" ? "xlsx" : "csv";
      a.download = `outreach_performance_report_${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const renderStatCard = (label: string, value: any, description: string) => (
    <Card key={label} className="bg-slate-800/30 border-slate-700/80 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-indigo-500/30 hover:bg-slate-800/50 hover:shadow-lg hover:shadow-indigo-500/5">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{label}</CardDescription>
        <CardTitle className="text-3xl font-extrabold text-white mt-1">{value ?? "-"}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-slate-500">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="page-shell space-y-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">Reports & Analytics</h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Analyze delivery, engagement, validation quality, and exportable campaign history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={isRefreshing || metricsLoading || activityLoading}
            className="border-slate-700 hover:bg-slate-800 text-slate-200 hover:text-white transition-all duration-200"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button 
            onClick={() => handleExport("csv")} 
            disabled={isExporting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all duration-200"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-1.5" />
                Export report
              </>
            )}
          </Button>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="grid gap-4 md:grid-cols-3">
        {renderStatCard("Delivery rate", metrics?.deliveryRate ? `${metrics.deliveryRate}%` : "-", "Percentage of sent emails successfully delivered")}
        {renderStatCard("Average open rate", metrics?.openRate ? `${metrics.openRate}%` : "-", "Unique opens compared to total emails delivered")}
        {renderStatCard("Exports generated", metrics?.exports ?? "-", "Total times reports have been successfully exported")}
      </section>

      {/* Activity Chart */}
      <section>
        <Card className="overflow-hidden bg-slate-900/40 border-slate-800/80 backdrop-blur-sm transition-all duration-300 hover:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Campaign Event Volume</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Weekly sent/opened/failed distribution.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {activityLoading ? (
              <div className="flex h-full items-center justify-center text-slate-400">
                <Loader2 className="h-6 w-6 mr-2 animate-spin text-indigo-500" />
                Loading chart…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                  />
                  <Bar dataKey="sent" name="Sent" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="opened" name="Opened" fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Export Formats & Saved Reports */}
      <section className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Export Formats</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Generate operation‑ready report files.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { label: "CSV summary", format: "csv" as const },
              { label: "Excel workbook", format: "excel" as const },
              { label: "PDF snapshot", format: "pdf" as const }
            ].map(item => (
              <Button 
                key={item.label} 
                variant="outline" 
                onClick={() => handleExport(item.format)}
                disabled={isExporting}
                className="w-full justify-start gap-2.5 border-slate-800 bg-slate-950/20 hover:bg-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all duration-200"
              >
                {item.format === "pdf" ? (
                  <FileBarChart className="h-4 w-4 text-rose-500" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                )}
                {item.label}
              </Button>
            ))}
            <Button 
              variant="outline" 
              disabled
              className="w-full justify-start gap-2.5 border-slate-800 bg-slate-950/10 text-slate-500 cursor-not-allowed"
            >
              <BarChart3 className="h-4 w-4 text-slate-600" />
              Chart bundle (Enterprise Only)
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800/80 backdrop-blur-sm overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Saved Reports</CardTitle>
            <CardDescription className="text-slate-400 text-xs">Reusable views for analytics and data‑quality review.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {savedLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mb-2" />
                Loading reports…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-950/30">
                    <TableRow className="border-slate-850 hover:bg-transparent">
                      <TableHead className="text-slate-400 font-semibold text-xs py-3 px-4">Report</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs py-3 px-4">Scope</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs py-3 px-4">Owner</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs py-3 px-4">Updated</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs py-3 px-4 text-right">Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(savedReports ?? []).map((row: any) => (
                      <TableRow key={row.report} className="border-slate-850 hover:bg-slate-800/20 transition-all duration-150">
                        <TableCell className="font-semibold text-sm text-slate-200 py-3.5 px-4">{row.report}</TableCell>
                        <TableCell className="text-xs text-slate-400 py-3.5 px-4">{row.scope}</TableCell>
                        <TableCell className="text-xs text-slate-400 py-3.5 px-4">{row.owner}</TableCell>
                        <TableCell className="text-xs text-slate-400 py-3.5 px-4">{row.updated}</TableCell>
                        <TableCell className="py-3.5 px-4 text-right">
                          <Badge 
                            variant="outline" 
                            className="bg-indigo-950/30 text-indigo-300 border-indigo-500/20 font-bold px-2 py-0.5 rounded"
                          >
                            {row.score}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
