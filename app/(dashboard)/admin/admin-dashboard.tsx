"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Users,
  CheckSquare,
  Target,
  Timer,
  TrendingUp,
  UserPlus,
  Building2,
  CreditCard,
  Shield,
  Search,
  MoreHorizontal,
  Mail,
  Ban,
  Trash2,
  Activity,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface AdminStats {
  totalUsers: number;
  recentSignups: number;
  totalTasks: number;
  completedTasks: number;
  totalTeams: number;
  focusSessionsToday: number;
  completionRate: number;
}

interface RecentUser {
  user_id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  task_count: number;
  is_banned: boolean;
}

interface AdminDashboardProps {
  stats: AdminStats;
  recentUsers: RecentUser[];
}

export function AdminDashboard({ stats, recentUsers }: AdminDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    maintenance_mode: false,
    signups_enabled: true,
    email_notifications: true,
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState<string | null>(null);

  // Fetch users when Users tab is active
  useEffect(() => {
    if (activeTab === "users" && users.length === 0) {
      fetchUsers();
    }
    if (activeTab === "settings" && !loadingSettings) {
      fetchSettings();
    }
  }, [activeTab]);

  async function fetchUsers() {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoadingUsers(false);
    }
  }

  async function fetchSettings() {
    setLoadingSettings(true);
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch {
      toast.error("Failed to fetch settings");
    } finally {
      setLoadingSettings(false);
    }
  }

  async function updateSetting(key: string, value: boolean) {
    setSavingSettings(key);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, [key]: value }));
        toast.success("Setting updated");
      } else {
        toast.error("Failed to update setting");
      }
    } catch {
      toast.error("Failed to update setting");
    } finally {
      setSavingSettings(null);
    }
  }

  async function handleSuspendUser(user: AdminUser) {
    setActionLoading(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: user.is_banned ? "unsuspend" : "suspend" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, is_banned: !u.is_banned } : u))
        );
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteUser() {
    if (!selectedUser) return;
    setActionLoading(selectedUser.id);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("User deleted");
        setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Delete failed");
    } finally {
      setActionLoading(null);
      setShowDeleteDialog(false);
      setSelectedUser(null);
    }
  }

  function handleSendEmail(user: AdminUser) {
    setSelectedUser(user);
    setEmailSubject("");
    setEmailMessage("");
    setShowEmailDialog(true);
  }

  async function sendEmailToUser() {
    if (!selectedUser || !emailSubject.trim() || !emailMessage.trim()) return;

    setSendingEmail(true);
    try {
      const res = await fetch("/api/admin/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedUser.email,
          subject: emailSubject,
          message: emailMessage,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Email sent to ${selectedUser.email}`);
        setShowEmailDialog(false);
        setEmailSubject("");
        setEmailMessage("");
        setSelectedUser(null);
      } else {
        toast.error(data.error || "Failed to send email");
      }
    } catch {
      toast.error("Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  }

  function handleViewActivity(user: AdminUser) {
    setSelectedUser(user);
    setShowActivityDialog(true);
  }

  const filteredUsers = users.filter(
    (user) =>
      user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage users, view analytics, and configure billing
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Users"
              value={stats.totalUsers}
              icon={Users}
              description={`+${stats.recentSignups} this week`}
              trend="up"
            />
            <StatsCard
              title="Total Tasks"
              value={stats.totalTasks}
              icon={CheckSquare}
              description={`${stats.completionRate}% completion rate`}
            />
            <StatsCard
              title="Teams"
              value={stats.totalTeams}
              icon={Building2}
              description="Active teams"
            />
            <StatsCard
              title="Focus Sessions"
              value={stats.focusSessionsToday}
              icon={Timer}
              description="Sessions today"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Platform Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Task Completion Rate</span>
                  <span className="font-medium">{stats.completionRate}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${stats.completionRate}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completed Tasks</span>
                  <span className="font-medium">{stats.completedTasks.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending Tasks</span>
                  <span className="font-medium">
                    {(stats.totalTasks - stats.completedTasks).toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Signups</CardTitle>
                <CardDescription>New users in the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentUsers.slice(0, 5).map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {user.display_name?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {user.display_name || "Unnamed User"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(user.created_at), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">New</Badge>
                    </div>
                  ))}
                  {recentUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent signups
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loadingUsers}>
              {loadingUsers ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingUsers ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                {user.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                              </span>
                            </div>
                            <span className="font-medium">
                              {user.display_name || "Unnamed"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{user.task_count}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(user.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {user.last_sign_in_at
                            ? format(new Date(user.last_sign_in_at), "MMM d, yyyy")
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          {user.is_banned ? (
                            <Badge variant="destructive">Suspended</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={actionLoading === user.id}
                              >
                                {actionLoading === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleSendEmail(user)}>
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewActivity(user)}>
                                <Activity className="h-4 w-4 mr-2" />
                                View Activity
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={user.is_banned ? "text-green-600" : "text-amber-600"}
                                onClick={() => handleSuspendUser(user)}
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                {user.is_banned ? "Unsuspend User" : "Suspend User"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && !loadingUsers && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing & Subscriptions
              </CardTitle>
              <CardDescription>
                Manage subscription plans and payment processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Coming Soon</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Stripe integration for subscription billing, plan management,
                  and revenue analytics will be available here.
                </p>
                <Button className="mt-4" variant="outline" disabled>
                  Connect Stripe
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Settings</CardTitle>
              <CardDescription>
                Configure platform-wide settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingSettings ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Maintenance Mode</p>
                      <p className="text-sm text-muted-foreground">
                        Temporarily disable access for non-admin users
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {savingSettings === "maintenance_mode" && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <Switch
                        checked={settings.maintenance_mode}
                        onCheckedChange={(checked) => updateSetting("maintenance_mode", checked)}
                        disabled={savingSettings === "maintenance_mode"}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">New User Signups</p>
                      <p className="text-sm text-muted-foreground">
                        Allow new users to register
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {savingSettings === "signups_enabled" && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <Switch
                        checked={settings.signups_enabled}
                        onCheckedChange={(checked) => updateSetting("signups_enabled", checked)}
                        disabled={savingSettings === "signups_enabled"}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Send transactional emails via Resend
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {savingSettings === "email_notifications" && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <Switch
                        checked={settings.email_notifications}
                        onCheckedChange={(checked) => updateSetting("email_notifications", checked)}
                        disabled={savingSettings === "email_notifications"}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser?.display_name || selectedUser?.email}?
              This action cannot be undone. All their data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Activity Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Activity</DialogTitle>
            <DialogDescription>
              Activity summary for {selectedUser?.display_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Tasks Created</p>
                  <p className="text-2xl font-bold">{selectedUser.task_count}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Account Status</p>
                  <p className="text-2xl font-bold">
                    {selectedUser.is_banned ? "Suspended" : "Active"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm font-medium">{selectedUser.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">User ID</span>
                  <span className="text-sm font-mono">{selectedUser.id}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm text-muted-foreground">Joined</span>
                  <span className="text-sm">
                    {format(new Date(selectedUser.created_at), "PPP")}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-muted-foreground">Last Sign In</span>
                  <span className="text-sm">
                    {selectedUser.last_sign_in_at
                      ? format(new Date(selectedUser.last_sign_in_at), "PPP")
                      : "Never"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Email Compose Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>
              Send an email to {selectedUser?.display_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>To</Label>
              <Input value={selectedUser?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Email subject..."
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Write your message..."
                rows={6}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={sendEmailToUser}
              disabled={sendingEmail || !emailSubject.trim() || !emailMessage.trim()}
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  description?: string;
  trend?: "up" | "down";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {description && (
          <p className={cn(
            "text-xs text-muted-foreground flex items-center gap-1",
            trend === "up" && "text-green-600",
            trend === "down" && "text-red-600"
          )}>
            {trend === "up" && <TrendingUp className="h-3 w-3" />}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
