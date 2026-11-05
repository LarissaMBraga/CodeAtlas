
"use client";

import { useState } from "react";
import { ArrowRight, Link2, LoaderCircle } from "lucide-react";

export default function PublicRepositoryInput() {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [error, setError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUrl = repositoryUrl.trim().replace(/\/+$/, "");
    const repositoryPattern =
      /^https?:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+$/;

    if (!repositoryPattern.test(normalizedUrl)) {
      setError("Enter a valid GitHub repository URL.");
      return;
    }

    setError("");
    setIsAnalyzing(true);
  }

  return (
    <section className="rounded-xl border border-[#252530] bg-[#111117] p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
          <Link2 size={19} className="text-[#b7a1ff]" />
        </div>

        <div>
          <h2 className="text-base font-semibold text-white">
            Analyze a public repository
          </h2>
          <p className="mt-1 text-xs text-[#777483]">
            Explore any public GitHub project without connecting your account.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-7">
        <label
          htmlFor="repository-url"
          className="mb-2 block text-xs font-medium text-[#c5c2d0]"
        >
          GitHub repository URL
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="repository-url"
            type="url"
            value={repositoryUrl}
            onChange={(event) => {
              setRepositoryUrl(event.target.value);
              setError("");
              setIsAnalyzing(false);
            }}
            placeholder="https://github.com/owner/repository"
            className="h-11 min-w-0 flex-1 rounded-lg border border-[#302d3b] bg-[#09090d] px-4 text-sm text-white outline-none transition placeholder:text-[#555260] focus:border-[#9b7bff]/60 focus:ring-2 focus:ring-[#9b7bff]/10"
          />

          <button
            type="submit"
            disabled={!repositoryUrl.trim() || isAnalyzing}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#9b7bff] px-5 text-sm font-semibold text-white transition hover:bg-[#8966f0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                Analyze repository
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-400" role="alert">
            {error}
          </p>
        )}

        <p className="mt-3 text-[11px] text-[#656270]">
          Only public repositories are supported in this access mode.
        </p>
      </form>
    </section>
  );
}
