import { useState, useEffect } from "react";
import {
  ShieldAlert, Users, Mail, Link2, Shield, Trash2, Loader2,
  RefreshCw, AlertCircle, CheckCircle2, Ban, TrendingUp,
  UserCheck, Search, ChevronLeft, ChevronRight, Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

// Define Types for Admin Dashboard
interface UserItem {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "Admin" | "Operator" | "Viewer";
  isActive: boolean;
  createdAt: string;
}

interface ConnectedAccountItem {
  _id: string;
  email: string;
  provider: string;
  createdAt: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    isActive: boolean;
  };
}

interface EmailLogItem {
  _id: string;
  recipientEmail: string;
  recipientName?: string;
  status: "queued" | "sent" | "delivered" | "failed" | "bounced" | "skipped";
  createdAt: string;
  campaignId?: {
    _id: string;
    campaignName: string;
    emailContent: {
      from: string;
      fromName?: string;
    };
    createdBy?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  organizationId?: {
    companyName: string;
  };
  tracking?: {
    sentAt?: string;
    failureReason?: string;
  };
}

interface DashboardStats {
  counts: {
    users: number;
    connectedIds: number;
    campaigns: number;
    emails: number;
  };
  emailsByStatus: Record<string, number>;
}

export function Admin() {
  const { user: currentUser } = useAuth();
  
  // Navigation & Tab State
  const [activeTab, setActiveTab] = useState<string>("stats");
  
  // Stats Tab States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  
  // Users Tab States
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [updatingUserRoleId, setUpdatingUserRoleId] = useState<string | null>(null);
  
  // Connected Accounts Tab States
  const [accounts, setAccounts] = useState<ConnectedAccountItem[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [disconnectingAccountId, setDisconnectingAccountId] = useState<string | null>(null);
  
  // Logs Tab States
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLimit] = useState(20);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPages, setLogsPages] = useState(1);
  const [logsSearch, setLogsSearch] = useState("");
  const [logsStatus, setLogsStatus] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(""); // Debounced/submitted search state

  // Global Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Loaders
  const fetchStats = async (silent = false) => {
    if (!silent) setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await apiRequest("/admin/stats");
      setStats(data);
    } catch (err: any) {
      setStatsError(err.message || "Failed to load system statistics");
    } finally {
      if (!silent) setStatsLoading(false);
    }
  };

  const fetchUsers = async (silent = false) => {
    if (!silent) setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await apiRequest("/admin/users");
      setUsers(data.users || []);
    } catch (err: any) {
      setUsersError(err.message || "Failed to load users");
    } finally {
      if (!silent) setUsersLoading(false);
    }
  };

  const fetchAccounts = async (silent = false) => {
    if (!silent) setAccountsLoading(true);
    setAccountsError(null);
    try {
      const data = await apiRequest("/admin/connected-accounts");
      setAccounts(data.accounts || []);
    } catch (err: any) {
      setAccountsError(err.message || "Failed to load connected accounts");
    } finally {
      if (!silent) setAccountsLoading(false);
    }
  };

  const fetchLogs = async (page = 1, search = "", status = "", silent = false) => {
    if (!silent) setLogsLoading(true);
    setLogsError(null);
    try {
      const path = `/admin/email-logs?page=${page}&limit=${logsLimit}&search=${encodeURIComponent(search)}&status=${status}`;
      const data = await apiRequest(path);
      setLogs(data.logs || []);
      setLogsTotal(data.pagination?.total || 0);
      setLogsPages(data.pagination?.pages || 1);
      setLogsPage(data.pagination?.page || 1);
    } catch (err: any) {
      setLogsError(err.message || "Failed to load email logs");
    } finally {
      if (!silent) setLogsLoading(false);
    }
  };

  // Initial tab loading
  useEffect(() => {
    if (activeTab === "stats") {
      fetchStats();
    } else if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "accounts") {
      fetchAccounts();
    } else if (activeTab === "logs") {
      fetchLogs(logsPage, logsSearch, logsStatus);
    }
  }, [activeTab, logsPage, logsSearch, logsStatus]);

  // Handle General Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (activeTab === "stats") await fetchStats(true);
      else if (activeTab === "users") await fetchUsers(true);
      else if (activeTab === "accounts") await fetchAccounts(true);
      else if (activeTab === "logs") await fetchLogs(logsPage, logsSearch, logsStatus, true);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Mutations
  const handleToggleUserStatus = async (userId: string) => {
    setTogglingUserId(userId);
    try {
      await apiRequest(`/admin/users/${userId}/status`, { method: "PATCH" });
      // update state locally
      setUsers(prev =>
        prev.map(u => (u._id === userId ? { ...u, isActive: !u.isActive } : u))
      );
    } catch (err: any) {
      alert(err.message || "Failed to toggle user status");
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    setUpdatingUserRoleId(userId);
    try {
      await apiRequest(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      setUsers(prev =>
        prev.map(u => (u._id === userId ? { ...u, role: role as any } : u))
      );
    } catch (err: any) {
      alert(err.message || "Failed to change user role");
    } finally {
      setUpdatingUserRoleId(null);
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    if (!window.confirm("Are you sure you want to disconnect this Google account? All active campaigns sending from this ID will be paused or fail.")) {
      return;
    }
    setDisconnectingAccountId(accountId);
    try {
      await apiRequest(`/admin/connected-accounts/${accountId}`, { method: "DELETE" });
      setAccounts(prev => prev.filter(acc => acc._id !== accountId));
      // Invalidate stats counts
      fetchStats(true);
    } catch (err: any) {
      alert(err.message || "Failed to disconnect account");
    } finally {
      setDisconnectingAccountId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLogsSearch(searchInput);
    setLogsPage(1); // reset to first page
  };

  // Helper renderer for email statuses
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "delivered":
      case "sent":
        return <Badge variant="success" className="capitalize">{status}</Badge>;
      case "queued":
        return <Badge variant="warning" className="capitalize">{status}</Badge>;
      case "failed":
      case "bounced":
        return <Badge variant="secondary" className="bg-rose-100 text-rose-700 capitalize border border-rose-200">{status}</Badge>;
      case "skipped":
        return <Badge variant="muted" className="capitalize">{status}</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
    }
  };

  return (
    <div className="page-shell space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-primary animate-pulse" />
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground via-slate-600 to-slate-800 bg-clip-text text-transparent">
              Admin Control Panel
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage system operators, review active sending ID integrations, and inspect outbound outreach metrics.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || statsLoading || usersLoading || accountsLoading || logsLoading}
            className="border-slate-300 hover:bg-muted text-foreground transition-all duration-200"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh Status"}
          </Button>
        </div>
      </section>

      {/* Tabs list */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-muted rounded-xl p-1">
          <TabsTrigger value="stats" className="rounded-lg data-[state=active]:bg-background">
            <TrendingUp className="h-4 w-4 mr-2" />
            System Stats
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-background">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="accounts" className="rounded-lg data-[state=active]:bg-background">
            <Link2 className="h-4 w-4 mr-2" />
            Gmail IDs
          </TabsTrigger>
          <TabsTrigger value="logs" className="rounded-lg data-[state=active]:bg-background">
            <Mail className="h-4 w-4 mr-2" />
            ID Sending History
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Stats */}
        <TabsContent value="stats" className="space-y-6 focus-visible:outline-none">
          {statsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : statsError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              {statsError}
            </div>
          ) : stats ? (
            <>
              {/* Four Counter Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-card/50 border border-slate-200 shadow-sm transition-all duration-300 hover:scale-[1.01]">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Users</span>
                    <Users className="h-4 w-4 text-indigo-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-foreground">{stats.counts.users}</div>
                    <p className="text-xs text-muted-foreground mt-1">Registered operators & viewers</p>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border border-slate-200 shadow-sm transition-all duration-300 hover:scale-[1.01]">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Connected IDs</span>
                    <Link2 className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-foreground">{stats.counts.connectedIds}</div>
                    <p className="text-xs text-muted-foreground mt-1">Active Google OAuth channels</p>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border border-slate-200 shadow-sm transition-all duration-300 hover:scale-[1.01]">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outreach Campaigns</span>
                    <Mail className="h-4 w-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-foreground">{stats.counts.campaigns}</div>
                    <p className="text-xs text-muted-foreground mt-1">System-wide campaigns created</p>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border border-slate-200 shadow-sm transition-all duration-300 hover:scale-[1.01]">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Processed Emails</span>
                    <CheckCircle2 className="h-4 w-4 text-teal-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-extrabold text-foreground">{stats.counts.emails}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total queued, sent, and failed logs</p>
                  </CardContent>
                </Card>
              </div>

              {/* Status breakdown chart/summary */}
              <Card className="bg-card/50 border border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Outbound Delivery State Distribution</CardTitle>
                  <CardDescription>Visual summary of system-wide sending metrics by current logs state.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(stats.emailsByStatus).map(([status, count]) => {
                    const total = stats.counts.emails || 1;
                    const percent = parseFloat(((count / total) * 100).toFixed(1));
                    
                    let barColor = "bg-slate-400";
                    if (status === "sent" || status === "delivered") barColor = "bg-emerald-500";
                    else if (status === "queued") barColor = "bg-amber-500";
                    else if (status === "failed" || status === "bounced") barColor = "bg-rose-500";
                    
                    return (
                      <div key={status} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold capitalize text-foreground">{status}</span>
                          <span className="text-muted-foreground font-mono">
                            {count} ({percent}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* Tab 2: Users Management */}
        <TabsContent value="users" className="space-y-6 focus-visible:outline-none">
          {usersLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : usersError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              {usersError}
            </div>
          ) : (
            <Card className="border border-slate-200 bg-card/50 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>User Name</TableHead>
                      <TableHead>Email Address</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Account Status</TableHead>
                      <TableHead>Registered At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No users registered in the system.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((usr) => {
                        const isSelf = usr._id === currentUser?._id;
                        return (
                          <TableRow key={usr._id} className={cn("hover:bg-slate-50/50", isSelf && "bg-indigo-50/20")}>
                            <TableCell className="font-medium text-foreground">
                              {usr.firstName} {usr.lastName} {isSelf && <span className="text-xs text-indigo-600 font-semibold bg-indigo-100/60 px-1.5 py-0.5 rounded ml-1">(You)</span>}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{usr.email}</TableCell>
                            <TableCell>
                              {isSelf ? (
                                <Badge variant="outline" className="font-semibold">{usr.role}</Badge>
                              ) : (
                                <Select
                                  value={usr.role}
                                  onValueChange={(val) => handleRoleChange(usr._id, val)}
                                  disabled={updatingUserRoleId === usr._id}
                                  className="text-xs py-1"
                                >
                                  <option value="Admin">Admin</option>
                                  <option value="Operator">Operator</option>
                                  <option value="Viewer">Viewer</option>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={usr.isActive ? "success" : "muted"} className="font-semibold">
                                {usr.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {new Date(usr.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant={usr.isActive ? "outline" : "default"}
                                onClick={() => handleToggleUserStatus(usr._id)}
                                disabled={isSelf || togglingUserId === usr._id}
                                className={cn(
                                  "h-8 transition-colors",
                                  usr.isActive ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                )}
                              >
                                {togglingUserId === usr._id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : usr.isActive ? (
                                  <>
                                    <Ban className="h-3.5 w-3.5 mr-1" /> Deactivate
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="h-3.5 w-3.5 mr-1" /> Activate
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Connected Accounts (IDs) */}
        <TabsContent value="accounts" className="space-y-6 focus-visible:outline-none">
          {accountsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : accountsError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              {accountsError}
            </div>
          ) : (
            <Card className="border border-slate-200 bg-card/50 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Sender Gmail ID</TableHead>
                      <TableHead>Integration Provider</TableHead>
                      <TableHead>Owner User</TableHead>
                      <TableHead>Verification Status</TableHead>
                      <TableHead>Connected At</TableHead>
                      <TableHead className="text-right">Outbound Guard</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No connected Gmail accounts found. Users need to connect Gmail via settings.
                        </TableCell>
                      </TableRow>
                    ) : (
                      accounts.map((acc) => (
                        <TableRow key={acc._id} className="hover:bg-slate-50/50">
                          <TableCell className="font-semibold text-foreground">
                            {acc.email}
                          </TableCell>
                          <TableCell className="capitalize text-muted-foreground text-xs font-mono">
                            {acc.provider} OAuth 2.0
                          </TableCell>
                          <TableCell>
                            {acc.userId ? (
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {acc.userId.firstName} {acc.userId.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">{acc.userId.email}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-rose-500 font-semibold bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5">Orphaned Account</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="success" className="font-semibold flex items-center gap-1 w-fit">
                              <Check className="h-3 w-3" /> Connected
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {new Date(acc.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDisconnectAccount(acc._id)}
                              disabled={disconnectingAccountId === acc._id}
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 h-8 font-medium"
                              title="Disconnect ID connection"
                            >
                              {disconnectingAccountId === acc._id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke Access
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Tab 4: ID Sending History */}
        <TabsContent value="logs" className="space-y-6 focus-visible:outline-none">
          {/* Filters Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between bg-muted/30 border border-slate-200/80 rounded-xl p-3.5">
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by recipient, sender ID, or campaign..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 bg-background"
                />
              </div>
              <Button type="submit" size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground font-medium shadow shadow-primary/20">
                Search
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status:</span>
              <Select value={logsStatus} onValueChange={(val) => { setLogsStatus(val); setLogsPage(1); }} className="bg-background min-w-[140px] text-sm">
                <option value="">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="queued">Queued</option>
                <option value="failed">Failed</option>
                <option value="bounced">Bounced</option>
                <option value="skipped">Skipped</option>
              </Select>
            </div>
          </div>

          {logsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logsError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              {logsError}
            </div>
          ) : (
            <>
              {/* History Table */}
              <Card className="border border-slate-200 bg-card/50 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Outbound ID (Sender)</TableHead>
                        <TableHead>Campaign Name</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>Diagnostic / Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            No logs found matching search criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => {
                          const senderEmail = log.campaignId?.emailContent?.from || "Unknown";
                          const senderName = log.campaignId?.emailContent?.fromName;
                          const campaignName = log.campaignId?.campaignName || "Unknown Campaign";
                          const ownerName = log.campaignId?.createdBy
                            ? `${log.campaignId.createdBy.firstName} ${log.campaignId.createdBy.lastName}`
                            : "System";

                          return (
                            <TableRow key={log._id} className="hover:bg-slate-50/50">
                              <TableCell>
                                <div className="font-semibold text-foreground">{senderEmail}</div>
                                {senderName && (
                                  <div className="text-xs text-muted-foreground">"{senderName}"</div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-foreground">{campaignName}</div>
                                <div className="text-xs text-muted-foreground">by {ownerName}</div>
                              </TableCell>
                              <TableCell>
                                <div className="text-foreground">{log.recipientEmail}</div>
                                {log.recipientName && (
                                  <div className="text-xs text-muted-foreground">{log.recipientName}</div>
                                )}
                              </TableCell>
                              <TableCell>{getStatusBadge(log.status)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground font-mono">
                                {new Date(log.createdAt).toLocaleString()}
                              </TableCell>
                              <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                                {log.status === "failed" || log.status === "bounced" ? (
                                  <span className="text-rose-600 font-semibold" title={log.tracking?.failureReason || ""}>
                                    Error: {log.tracking?.failureReason || "Connection issues"}
                                  </span>
                                ) : log.tracking?.sentAt ? (
                                  <span className="text-emerald-600 font-medium">
                                    Dispatched successfully
                                  </span>
                                ) : (
                                  <span className="text-slate-500">Queued in delivery lane</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Pagination controls */}
              {logsPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200/80 pt-4 px-2">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{(logsPage - 1) * logsLimit + 1}</span> to{" "}
                    <span className="font-medium">
                      {Math.min(logsPage * logsLimit, logsTotal)}
                    </span>{" "}
                    of <span className="font-medium">{logsTotal}</span> logs
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setLogsPage(prev => Math.max(prev - 1, 1))}
                      disabled={logsPage === 1}
                      className="h-8 w-8 p-0 border-slate-300 hover:bg-muted text-foreground"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-semibold text-muted-foreground font-mono">
                      Page {logsPage} of {logsPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setLogsPage(prev => Math.min(prev + 1, logsPages))}
                      disabled={logsPage === logsPages}
                      className="h-8 w-8 p-0 border-slate-300 hover:bg-muted text-foreground"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
