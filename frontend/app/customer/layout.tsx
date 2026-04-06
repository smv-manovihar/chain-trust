"use client";

import { AppShell } from "@/components/layout/app-shell";
import { AppSidebar, MobileAppSidebar } from "@/components/layout/app-sidebar";
import { CUSTOMER_NAV_GROUPS } from "@/lib/constants/navigation";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      sidebar={<AppSidebar navGroups={CUSTOMER_NAV_GROUPS} />}
      mobileSidebar={(props) => (
        <MobileAppSidebar {...props} navGroups={CUSTOMER_NAV_GROUPS} />
      )}
    >
      {children}
    </AppShell>
  );
}
