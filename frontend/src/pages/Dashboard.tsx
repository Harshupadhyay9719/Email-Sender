import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import {
  ArrowUpRight, ArrowDownRight, Building2, Mail, MousePointerClick,
  CheckCircle2, TriangleAlert, Users, TrendingUp, Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/api";

const PIE_COLORS: Record<string, string> = {
  VALID: "#10b981", INVALID: "#ef4444", RISKY: "#f59e0b", UNKNOWN: "#6b7280",
};

function StatCard({ label, value, change, icon: Icon, positive }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="text-sm font-medium">{label}</CardDescription>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={`mt-1 flex items-center gap-1 text-xs ${positive ? "text-emerald-600" : "text-red-500"}`}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {change}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: () => apiRequest("/analytics/dashboard"),
    refetchInterval: 60_000,
  });

  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ["analytics", "charts"],
    queryFn: () => apiRequest("/analytics/charts"),
    refetchInterval: 60_000,
  });

  const m = metrics ?? {};
  const c = charts ?? {};

  const statCards = [
    { label: "Total Slots", value: (m.totalOrganizations ?? 0).toLocaleString(), icon: Building2 },
    { label: "Total Contacts", value: (m.totalContacts ?? 0).toLocaleString(), icon: Users },
    { label: "Emails Sent", value: (m.emailsSent ?? 0).toLocaleString(), icon: Mail },
    { label: "Open Rate", value: `${m.openRate ?? 0}%`, icon: CheckCircle2, positive: true, change: "vs last period" },
    { label: "Click Rate", value: `${m.clickRate ?? 0}%`, icon: MousePointerClick, positive: true, change: "vs last period" },
    { label: "Bounce Rate", value: `${m.bounceRate ?? 0}%`, icon: TriangleAlert, positive: false, change: "vs last period" },
    { label: "Emails Failed", value: (m.emailsFailed ?? 0).toLocaleString(), icon: TriangleAlert },
    { label: "Campaign Success", value: `${m.campaignSuccessRate ?? 0}%`, icon: TrendingUp, positive: true, change: "of campaigns completed" },
  ];

  if (metricsLoading) {
    return (
      <div className="page-shell">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="h-24 animate-pulse bg-muted/40 rounded-lg mt-4" /></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      {/* Header */}
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live campaign throughput, delivery health, and engagement metrics.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
            {m.dailySendCount ?? 0} sent today
          </Badge>
          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
            {m.weeklySendCount ?? 0} this week
          </Badge>
        </div>
      </section>

      {/* Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((s) => <StatCard key={s.label} {...s} />)}
      </section>

      {/* Coverage breakdown */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Slots Contacted</CardDescription>
            <CardTitle className="text-2xl">{(m.companiesContacted ?? 0).toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={m.totalOrganizations ? ((m.companiesContacted ?? 0) / m.totalOrganizations) * 100 : 0} className="h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Slots Remaining</CardDescription>
            <CardTitle className="text-2xl">{(m.companiesRemaining ?? 0).toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={m.totalOrganizations ? ((m.companiesRemaining ?? 0) / m.totalOrganizations) * 100 : 0} className="h-1.5 [&>div]:bg-amber-500" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>No Valid Contacts</CardDescription>
            <CardTitle className="text-2xl text-destructive">{(m.companiesWithNoValidContacts ?? 0).toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Slots with all contacts invalid</p>
          </CardContent>
        </Card>
      </section>

      {/* Charts row */}
      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Daily Email Activity</CardTitle>
            <CardDescription>Sent, opened, and failed email events over the past 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {chartsLoading ? <div className="h-full animate-pulse bg-muted/40 rounded" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={c.dailyActivity ?? []}>
                  <defs>
                    <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f9aa7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0f9aa7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="openedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                  <Area type="monotone" dataKey="sent" stroke="#0f9aa7" fill="url(#sentGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="opened" stroke="#f59e0b" fill="url(#openedGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Validation Status</CardTitle>
            <CardDescription>Distribution of contact email validation results.</CardDescription>
          </CardHeader>
          <CardContent className="h-72 flex flex-col items-center justify-center">
            {chartsLoading ? <div className="h-full w-full animate-pulse bg-muted/40 rounded" /> : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={c.validationDistribution ?? []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={70} label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {(c.validationDistribution ?? []).map((entry: any) => (
                        <Cell key={entry.status} fill={PIE_COLORS[entry.status] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 text-xs">
                  {Object.entries(PIE_COLORS).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: v }} />
                      <span className="text-muted-foreground">{k}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Campaign comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>Email sent, opened, and clicked across recent campaigns.</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          {chartsLoading ? <div className="h-full animate-pulse bg-muted/40 rounded" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={c.campaignComparison ?? []} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={(v) => v.length > 14 ? v.slice(0, 14) + "…" : v} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="sent" fill="#0f9aa7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="opened" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicked" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
