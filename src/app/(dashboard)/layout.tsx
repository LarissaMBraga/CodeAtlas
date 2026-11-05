import DashboardSidebar from "@/components/dashboard/sidebar/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/header/DashboardHeader";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[#09090d] text-[#f4f2fa]">
      <DashboardSidebar />

      <main className="min-h-screen lg:pl-[260px]">
        <DashboardHeader />
        {children}
      </main>
    </div>
  );
}
