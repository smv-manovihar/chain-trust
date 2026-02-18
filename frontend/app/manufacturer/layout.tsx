import { ManufacturerSidebar } from "@/components/layout/manufacturer-sidebar";

export default function ManufacturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <ManufacturerSidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
