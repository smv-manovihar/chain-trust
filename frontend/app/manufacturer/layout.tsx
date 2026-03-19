"use client";

import { AppShell } from "@/components/layout/app-shell";
import {
  ManufacturerSidebar,
  MobileSidebar,
} from "@/components/layout/manufacturer-sidebar";

export default function ManufacturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      sidebar={<ManufacturerSidebar />}
      mobileSidebar={(props) => <MobileSidebar {...props} />}
    >
      {children}
    </AppShell>
  );
}
