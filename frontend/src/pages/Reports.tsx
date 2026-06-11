import { useQuery } from "@tanstack/react-query";
import { Download, FileBarChart, FileSpreadsheet, RefreshCw, BarChart3, BarChart2, Circle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#0f9aa7", "#f08a24", "#ef4444", "#6366f1"]; // Sent, Opened, Failed, Clicked

export function Reports() {
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
    queryFn: () => apiRequest("/reports"),
    staleTime: 10 * 60 * 1000,
  });

  const isAnyLoading = metricsLoading || activityLoading || savedLoading;

  const renderStatCard = (label: string, value: any) => (
    <Card key={label} className="bg-slate-800/30 border-slate-700">
      <CardHeader className="pb-2">
        <CardDescription className="text-sm text-muted-foreground">{label}</CardDescription>
        <CardTitle className="text-2xl font-bold text-white">{value ?? "-"}</CardTitle>
      </CardHeader>
    </Card>
  );

  return (
    <div className="page-shell">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analyze delivery, engagement, validation quality, and exportable campaign history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button><Download className="h-4 w-4 mr-1" />Export report</Button>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="grid gap-4 md:grid-cols-3 mt-4">
        {renderStatCard("Delivery rate", metrics?.deliveryRate ? `${metrics.deliveryRate}%` : "-")}
        {renderStatCard("Average open rate", metrics?.openRate ? `${metrics.openRate}%` : "-")}
        {renderStatCard("Exports generated", metrics?.exports ?? "-")}
      </section>

      {/* Activity Chart */}
      <section className="mt-6">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Campaign Event Volume</CardTitle>
            <CardDescription>Weekly sent/opened/failed distribution.</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {activityLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">Loading chart…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activity ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="sent" fill="#0f9aa7" radius={[4,4,0,0]} />
                  <Bar dataKey="opened" fill="#f08a24" radius={[4,4,0,0]} />
                  <Bar dataKey="failed" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Export Formats */}
      <section className="grid gap-4 xl:grid-cols-[1fr_340px] mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Export Formats</CardTitle>
            <CardDescription>Generate operation‑ready report files.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[{label:"CSV summary",icon:FileSpreadsheet},{label:"Excel workbook",icon:FileSpreadsheet},{label:"PDF snapshot",icon:FileBarChart},{label:"Chart bundle",icon:BarChart3}].map(item=> (
              <Button key={item.label} variant="outline" className="w-full justify-start gap-2" disabled>
                <item.icon className="h-4 w-4" />{item.label}
              </Button>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saved Reports</CardTitle>
            <CardDescription>Reusable views for analytics and data‑quality review.</CardDescription>
          </CardHeader>
          <CardContent>
            {savedLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading reports…</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(savedReports ?? []).map((row:any)=>(
                    <TableRow key={row.report}>
                      <TableCell className="font-medium">{row.report}</TableCell>
                      <TableCell>{row.scope}</TableCell>
                      <TableCell>{row.owner}</TableCell>
                      <TableCell>{row.updated}</TableCell>
                      <TableCell><Badge variant="outline">{row.score}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
