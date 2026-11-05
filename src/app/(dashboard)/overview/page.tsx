
import DashboardSidebar from "@/components/dashboard/sidebar/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/header/DashboardHeader";
import SummaryCards from "@/components/dashboard/overview/SummaryCards";
import RecentRepositories from "@/components/dashboard/overview/RecentRepositories";
import GetStarted from "@/components/dashboard/overview/GetStarted";
import { ArrowUpRight } from "lucide-react";

export default function OverviewPage() {
  return (
    <div className="min-h-screen bg-[#09090d] text-[#f4f2fa]">
      <DashboardSidebar />

      <main className="min-h-screen lg:pl-[260px]">
        <DashboardHeader />

        <div className="mx-auto max-w-[1440px] px-6 py-10 sm:px-8 lg:px-10">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-[#a98cff]">
                Dashboard
              </p>

              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Welcome to your <span className="text-gradient">workspace.</span>
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-[#92919f]">
                Get a clearer picture of your codebase, explore dependencies
                and understand how your projects are connected.
              </p>
            </div>

            <button
              type="button"
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#9b7bff] px-5 text-sm font-semibold text-white transition hover:bg-[#8966f0]"
            >
              Connect repository
              <ArrowUpRight size={16} />
            </button>
          </div>

          <SummaryCards />

          <section className="mt-8 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <RecentRepositories />
            <GetStarted />
          </section>
        </div>
      </main>
    </div>
  );
}
