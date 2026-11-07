
import {
  Code2,
  FileCode2,
  HardDrive,
  Languages,
  PieChart,
} from "lucide-react";

type Language = {
  name: string;
  bytes: number;
  percentage: number;
  fileCount: number;
};

type LanguageAnalysisData = {
  available: boolean;
  totalBytes: number;
  totalFiles: number;
};

type LanguagesAnalysisProps = {
  languages: Language[];
  analysis: LanguageAnalysisData | null;
};

type StatItem = {
  label: string;
  value: string;
  icon: typeof Languages;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function createStats(
  languages: Language[],
  analysis: LanguageAnalysisData
): StatItem[] {
  return [
    {
      label: "Languages detected",
      value: languages.length.toString(),
      icon: Languages,
    },
    {
      label: "Source files detected",
      value: analysis.totalFiles.toLocaleString("en-US"),
      icon: FileCode2,
    },
    {
      label: "Total code size",
      value: formatBytes(analysis.totalBytes),
      icon: HardDrive,
    },
  ];
}

function LanguageHeader({
  primaryLanguage,
}: {
  primaryLanguage?: Language;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/10">
          <Code2 size={17} className="text-[#b7a1ff]" />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">
            Language Distribution
          </h2>
          <p className="mt-1 text-xs text-[#777483]">
            Code composition based on GitHub language statistics.
          </p>
        </div>
      </div>

      {primaryLanguage && (
        <div className="rounded-lg border border-[#9b7bff]/20 bg-[#9b7bff]/[0.06] px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#92919f]">
            Primary language
          </p>
          <p className="mt-1 text-sm font-semibold text-[#c6b5ff]">
            {primaryLanguage.name}
          </p>
        </div>
      )}
    </div>
  );
}

function LanguageEmptyState({
  available,
}: {
  available: boolean;
}) {
  const Icon = available ? Code2 : PieChart;
  const title = available
    ? "No languages detected"
    : "Language analysis unavailable";
  const description = available
    ? "GitHub did not identify any languages in this repository."
    : "GitHub could not provide language statistics for this repository. Please try again later.";

  return (
    <div className="mt-6 rounded-lg border border-[#302d3b] bg-[#0d0c12] px-5 py-10 text-center">
      <Icon size={24} className="mx-auto text-[#777483]" />
      <p className="mt-3 text-sm font-medium text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#777483]">
        {description}
      </p>
    </div>
  );
}

function LanguageStats({
  stats,
}: {
  stats: StatItem[];
}) {
  return (
    <div className="mt-6 grid grid-cols-3 divide-x divide-[#302d3b] rounded-lg border border-[#252530] bg-[#0d0c12] py-3">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className="min-w-0 px-3 sm:px-5"
          >
            <div className="flex items-center gap-1.5">
              <Icon
                size={13}
                className="shrink-0 text-[#a98cff]"
              />
              <p className="text-[9px] leading-4 text-[#92919f] sm:text-[11px]">
                {stat.label}
              </p>
            </div>

            <p className="mt-1.5 truncate text-base font-semibold text-white sm:text-lg">
              {stat.value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function LanguageBreakdown({
  languages,
}: {
  languages: Language[];
}) {
  return (
    <div className="mt-7">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[#e8e5f0]">
          Language breakdown
        </h3>
        <span className="text-[10px] text-[#777483]">
          {languages.length} languages
        </span>
      </div>

      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#252530]">
        {languages.map((language) => (
          <div
            key={language.name}
            title={`${language.name}: ${language.percentage.toFixed(2)}%`}
            style={{ width: `${language.percentage}%` }}
            className="h-full bg-[#a98cff] transition-all duration-500 even:bg-[#8065c7]"
          />
        ))}
      </div>

      <div className="mt-6 space-y-5">
        {languages.map((language) => (
          <LanguageBreakdownItem
            key={language.name}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}

function LanguageBreakdownItem({
  language,
}: {
  language: Language;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-[#a98cff]" />
          <span className="truncate text-xs font-medium text-[#e8e5f0]">
            {language.name}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[10px] text-[#777483]">
            {language.fileCount > 0
              ? `${language.fileCount} files`
              : "File count unavailable"}
          </span>
          <span className="w-14 text-right text-xs font-semibold tabular-nums text-white">
            {language.percentage.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-[#252530]">
        <div
          style={{ width: `${language.percentage}%` }}
          className="h-full rounded-full bg-[#a98cff] transition-all duration-500"
        />
      </div>

      <p className="mt-1.5 text-[10px] text-[#777483]">
        {formatBytes(language.bytes)} of code
      </p>
    </div>
  );
}

function LanguageAnalysisNote() {
  return (
    <div className="mt-6 rounded-lg border border-[#302d3b] bg-[#191720]/60 px-4 py-3">
      <p className="text-[10px] leading-5 text-[#777483]">
        Language percentages are based on GitHub byte statistics.
        File counts are based on supported source-file extensions
        detected in the repository and may not cover every language.
      </p>
    </div>
  );
}

export default function LanguagesAnalysis({
  languages,
  analysis,
}: LanguagesAnalysisProps) {
  const primaryLanguage = languages[0];

  return (
    <div className="rounded-xl border border-[#252530] bg-[#111117] p-6">
      <LanguageHeader primaryLanguage={primaryLanguage} />

      {!analysis?.available || languages.length === 0 ? (
        <LanguageEmptyState available={Boolean(analysis?.available)} />
      ) : (
        <>
          <LanguageStats stats={createStats(languages, analysis)} />
          <LanguageBreakdown languages={languages} />
          <LanguageAnalysisNote />
        </>
      )}
    </div>
  );
}
