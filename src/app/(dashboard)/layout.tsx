import { Suspense } from "react";
import DashboardSidebar from "@/components/dashboard/sidebar/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/header/DashboardHeader";
import { ProfileProvider } from "@/components/dashboard/profile/ProfileProvider";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProfileProvider>
      <div className="min-h-screen min-w-0 bg-[#09090d] text-[#f4f2fa]">
        <Suspense
          fallback={
            <div className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-[#252530] bg-[#0d0d13] lg:block" />
          }
        >
          <DashboardSidebar />
        </Suspense>

        <main className="min-h-screen min-w-0 overflow-x-clip lg:pl-[260px]">
          <DashboardHeader />
          {children}
        </main>
      </div>
    </ProfileProvider>
  );
}