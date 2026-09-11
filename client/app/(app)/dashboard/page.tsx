"use client";

import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { SupervisorDashboard } from "@/components/dashboard/supervisor-dashboard";
import { TechnicianDashboard } from "@/components/dashboard/technician-dashboard";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/lib/auth/auth-provider";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return <LoadingState label="Loading your workspace" />;
  }

  if (user.role === "TECHNICIAN") {
    return <TechnicianDashboard user={user} />;
  }

  if (user.role === "SUPERVISOR") {
    return <SupervisorDashboard />;
  }

  return <AdminDashboard />;
}