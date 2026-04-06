"use client";

import { AppShell } from "@/components/layout/app-shell";
import { AppSidebar, MobileAppSidebar } from "@/components/layout/app-sidebar";
import { MANUFACTURER_NAV_GROUPS } from "@/lib/constants/navigation";

export default function ManufacturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      sidebar={<AppSidebar navGroups={MANUFACTURER_NAV_GROUPS} />}
      mobileSidebar={(props) => (
        <MobileAppSidebar {...props} navGroups={MANUFACTURER_NAV_GROUPS} />
      )}
    >
      {children}
    </AppShell>
  );
}
