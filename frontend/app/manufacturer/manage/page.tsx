"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Download,
  MoreHorizontal,
  Trash2,
  UserCog,
  Copy,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { ManufacturerSidebar } from "@/components/layout/manufacturer-sidebar";
import { inviteEmployee } from "@/api";

// Mock data for initial UI dev
const mockEmployees = [
  {
    id: "1",
    name: "John Smith",
    email: "john@pharma-inc.com",
    role: "employee",
    status: "active",
    joinedAt: "2023-10-15",
  },
  {
    id: "2",
    name: "Jane Doe",
    email: "jane@pharma-inc.com",
    role: "employee",
    status: "pending",
    joinedAt: "2023-10-20",
  },
];

export default function ManufacturerManagePage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState(mockEmployees);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [autoGeneratePassword, setAutoGeneratePassword] = useState(true);
  const [manualPassword, setManualPassword] = useState("");

  // Credentials Display State
  const [showCredentials, setShowCredentials] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{
    email: string;
    password?: string;
    loginUrl: string;
  } | null>(null);

  const handleInvite = async () => {
    setIsLoading(true);
    try {
      const res = await inviteEmployee({
        email: inviteEmail,
        name: inviteName,
        role: inviteRole,
        password: manualPassword,
        autoGenerate: autoGeneratePassword,
      });

      const generatedPassword = autoGeneratePassword
        ? res.credentials?.password || ""
        : manualPassword;

      const newEmployee = {
        id: Math.random().toString(), // Should ideally come from response user object if available
        name: inviteName || "Invited Employee",
        email: inviteEmail,
        role: inviteRole,
        status: "active",
        joinedAt: new Date().toISOString().split("T")[0],
      };

      setEmployees([...employees, newEmployee]);

      if (res.credentials) {
        setNewCredentials({
          email: res.credentials.email,
          password: res.credentials.password, // This will be the plain text password returned from backed
          loginUrl: res.credentials.loginUrl,
        });
        setShowCredentials(true);
      }

      setIsInviteOpen(false);

      // Reset form
      setInviteEmail("");
      setInviteName("");
      setInviteRole("employee");
      setManualPassword("");
      setAutoGeneratePassword(true);

      toast.success("Employee invited successfully");
    } catch (error: any) {
      toast.error("Failed to invite employee", {
        description: error.response?.data?.message || "Something went wrong",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCredentials = () => {
    if (!newCredentials) return;

    const content = `
ChainTrust Employee Credentials
------------------------------
Organization: ${user?.companyName || "Unknown Company"}
Date: ${new Date().toLocaleString()}

Name: ${inviteName}
Email: ${newCredentials.email}
Password: ${newCredentials.password}
Login URL: ${newCredentials.loginUrl}

IMPORTANT: Please share these credentials securely with the employee. 
The password will NOT be sent via email.
Forces password change on first login: Yes
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `credentials-${newCredentials.email.split("@")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Credentials downloaded");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex h-screen bg-gray-50/50">
      <ManufacturerSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Team Management
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your employees, roles, and access permissions.
                </p>
              </div>
              <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" /> Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                    <DialogDescription>
                      Create an account for your employee. They will be required
                      to change their password on first login.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select
                          value={inviteRole}
                          onValueChange={setInviteRole}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="manufacturer">
                              Admin (Manufacturer)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>

                    <div className="space-y-4 pt-2 border-t">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="auto-pass"
                          checked={autoGeneratePassword}
                          onCheckedChange={(c) => setAutoGeneratePassword(!!c)}
                        />
                        <Label htmlFor="auto-pass">
                          Auto-generate password
                        </Label>
                      </div>

                      {!autoGeneratePassword && (
                        <div className="space-y-2">
                          <Label htmlFor="password">Initial Password</Label>
                          <Input
                            id="password"
                            type="text" // Visible so admin can read it to copy? Or password type? Usually visible for setup.
                            placeholder="Set initial password"
                            value={manualPassword}
                            onChange={(e) => setManualPassword(e.target.value)}
                          />
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground bg-yellow-500/10 p-3 rounded-md text-yellow-600 dark:text-yellow-400">
                        <strong>Note:</strong> The password will be shown to you
                        ONCE after creation. It will NOT be emailed to the user.
                        User must change it on first login.
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsInviteOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleInvite}
                      disabled={
                        isLoading ||
                        !inviteEmail ||
                        (!autoGeneratePassword && manualPassword.length < 8)
                      }
                    >
                      {isLoading ? "Creating..." : "Create Account"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Credentials Dialog - Shows ONLY after successful creation */}
              <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-green-600 flex items-center gap-2">
                      <Check className="h-5 w-5" /> Account Created
                    </DialogTitle>
                    <DialogDescription>
                      The account has been created successfully. Please save
                      these credentials now.
                    </DialogDescription>
                  </DialogHeader>

                  {newCredentials && (
                    <div className="bg-slate-950 text-slate-50 p-4 rounded-lg space-y-3 font-mono text-sm my-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email:</span>
                        <span className="select-all">
                          {newCredentials.email}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Password:</span>
                        <div className="flex items-center gap-2">
                          <span className="select-all font-bold text-green-400">
                            {newCredentials.password}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-4 w-4 text-slate-400 hover:text-white"
                            onClick={() =>
                              copyToClipboard(newCredentials.password || "")
                            }
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-800">
                        <span className="text-slate-400">Login URL:</span>
                        <span className="select-all text-xs truncate max-w-[200px]">
                          {newCredentials.loginUrl}
                        </span>
                      </div>
                    </div>
                  )}

                  <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                      onClick={downloadCredentials}
                      className="w-full sm:w-auto gap-2"
                    >
                      <Download className="h-4 w-4" /> Download Credentials
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setShowCredentials(false)}
                      className="w-full sm:w-auto"
                    >
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Employees ({employees.length})</CardTitle>
                <CardDescription>
                  List of all users associated with{" "}
                  {user?.companyName || "your company"}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">
                          {employee.name}
                        </TableCell>
                        <TableCell>{employee.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {employee.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              employee.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className="capitalize"
                          >
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{employee.joinedAt}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <UserCog className="mr-2 h-4 w-4" /> Edit Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" /> Remove User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
