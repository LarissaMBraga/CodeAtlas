
import DashboardSidebar from "@/components/dashboard/sidebar/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/header/DashboardHeader";
import PublicRepositoryInput from "@/components/repositories/explorer/PublicRepositoryInput";
import GitHubConnectionCard from "@/components/repositories/explorer/GitHubConnectionCard";
import GitHubRepositoriesCard from "@/components/repositories/explorer/GitHubRepositoriesCard";
import { FolderGit2, Sparkles } from "lucide-react";

export default function RepositoriesPage() {
  return (
    <div className="min-h-screen bg-[#09090d] text-[#f4f2fa]">
      <DashboardSidebar />

      <main className="min-h-screen lg:pl-[260px]">
        <DashboardHeader />

        <div className="mx-auto max-w-[1440px] px-6 py-10 sm:px-8 lg:px-10">
          <div className="mb-10">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#a98cff]">
              <FolderGit2 size={14} />
              Workspace
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Repository <span className="text-gradient">Explorer.</span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#92919f]">
              Bring any codebase into CODE ATLAS. Explore public projects from
              GitHub or connect your account to access your repositories.
            </p>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
            <PublicRepositoryInput />
            <GitHubConnectionCard />
          </div>

          <div className="mt-8">
            <GitHubRepositoriesCard />
          </div>

          <section className="mt-8 rounded-xl border border-[#252530] bg-[#111117] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#9b7bff]/15 bg-[#9b7bff]/10">
                <Sparkles size={17} className="text-[#b7a1ff]" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-white">
                  Your code exploration starts here
                </h2>

                <p className="mt-1 text-xs text-[#777483]">
                  Analyze a repository to discover its architecture,
                  dependencies and code health.
                </p>
              </div>
            </div>

            <div className="mt-6 flex min-h-[150px] flex-col items-center justify-center rounded-lg border border-dashed border-[#302d3b] bg-white/[0.015] px-5 text-center">
              <FolderGit2 size={26} className="text-[#777483]" />

              <p className="mt-3 text-sm font-medium text-[#e8e5f0]">
                No repositories analyzed yet
              </p>

              <p className="mt-2 max-w-md text-xs leading-5 text-[#777483]">
                Your analyzed projects and their architecture insights will
                appear here.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
