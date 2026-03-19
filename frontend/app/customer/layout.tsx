"use client";

import { AppShell } from "@/components/layout/app-shell";
import {
  CustomerSidebar,
  MobileSidebar,
} from "@/components/layout/customer-sidebar";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell
      sidebar={<CustomerSidebar />}
      mobileSidebar={(props) => <MobileSidebar {...props} />}
    >
      {children}
    </AppShell>
  );
}
