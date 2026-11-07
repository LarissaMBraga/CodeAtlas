import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/security/github-files", () => ({
  collectSecurityFiles: vi.fn(),
}));

import {
  collectSecurityFiles,
  type SecurityFileCollection,
  type SecurityRepositoryFile,
} from "@/lib/security/github-files";
import { buildRepositoryContext } from "./repository-context";

const collection: SecurityFileCollection = {
  files: [
    {
      path: "src/authentication.ts",
      content: "export function authenticateUser() { return true; }",
      size: 54,
      sha: "abc123",
      kind: "source",
    },
    {
      path: "src/calculator.ts",
      content: "export function calculateTotal() { return 100; }",
      size: 50,
      sha: "def456",
      kind: "source",
    },
    {
      path: ".env",
      content: "API_KEY=real-secret-value",
      size: 25,
      sha: "ghi789",
      kind: "environment",
    },
  ],
  totalFiles: 3,
  analyzedFiles: 3,
  skippedFiles: 0,
  failedFiles: 0,
  truncated: false,
  limitations: [],
};

function createSourceFile(
  filePath: string,
  content: string,
): SecurityRepositoryFile {
  return {
    path: filePath,
    content,
    size: content.length,
    sha: `sha-${filePath}`,
    kind: "source",
  };
}

describe("buildRepositoryContext", () => {
  beforeEach(() => {
    vi.mocked(collectSecurityFiles).mockReset();
    vi.mocked(collectSecurityFiles).mockResolvedValue(collection);
  });

  it("collects files using the requested repository and branch", async () => {
    await buildRepositoryContext({
      owner: "octocat",
      repo: "hello-world",
      branch: "main",
      question: "How does authentication work?",
    });

    expect(collectSecurityFiles).toHaveBeenCalledWith(
      "octocat",
      "hello-world",
      "main",
    );
  });

  it("prioritizes files related to the question", async () => {
    const result = await buildRepositoryContext({
      owner: "octocat",
      repo: "hello-world",
      branch: "main",
      question: "How does authentication work?",
    });

    expect(result.context).toContain("src/authentication.ts");
    expect(result.context).not.toContain("src/calculator.ts");
  });

  it("does not include environment files or their contents", async () => {
    const result = await buildRepositoryContext({
      owner: "octocat",
      repo: "hello-world",
      branch: "main",
      question: "Explain the application",
    });

    expect(result.context).not.toContain("real-secret-value");
    expect(result.context).not.toContain('File: ".env"');
  });

  it("rejects empty questions", async () => {
    await expect(
      buildRepositoryContext({
        owner: "octocat",
        repo: "hello-world",
        branch: "main",
        question: "   ",
      }),
    ).rejects.toThrow("A question is required");

    expect(collectSecurityFiles).not.toHaveBeenCalled();
  });

  it("reports the number of included files", async () => {
    const result = await buildRepositoryContext({
      owner: "octocat",
      repo: "hello-world",
      branch: "main",
      question: "authentication",
    });

    expect(result.filesIncluded).toBe(1);
    expect(result.totalFilesAvailable).toBe(3);
    expect(result.excludedFiles).toBe(0);
  });

  it("reports repository collection limitations", async () => {
    vi.mocked(collectSecurityFiles).mockResolvedValue({
      ...collection,
      truncated: true,
      limitations: ["GitHub truncated the repository tree."],
    });

    const result = await buildRepositoryContext({
      owner: "octocat",
      repo: "hello-world",
      branch: "main",
      question: "authentication",
    });

    expect(result.truncated).toBe(true);
    expect(result.limitations).toContain(
      "GitHub truncated the repository tree.",
    );
  });

  it("includes files imported by a relevant file", async () => {
    const authenticationFile = createSourceFile(
      "src/authentication.ts",
      [
        'import { createSession } from "./session";',
        "export function authenticateUser() {",
        "  return createSession();",
        "}",
      ].join("\n"),
    );

    const sessionFile = createSourceFile(
      "src/session.ts",
      "export function createSession() { return {}; }",
    );

    const fillerFiles = Array.from(
      { length: 15 },
      (_, index) =>
        createSourceFile(
          `src/aaa-filler-${index}.ts`,
          `export const fillerValue${index} = ${index};`,
        ),
    );

    const files = [
      ...fillerFiles,
      authenticationFile,
      sessionFile,
    ];

    const expandedCollection: SecurityFileCollection = {
      ...collection,
      files,
      totalFiles: files.length,
      analyzedFiles: files.length,
    };

    vi.mocked(collectSecurityFiles).mockResolvedValue(
      expandedCollection,
    );

    const result = await buildRepositoryContext({
      owner: "octocat",
      repo: "hello-world",
      branch: "main",
      question: "authentication",
    });

    expect(result.context).toContain("src/authentication.ts");
    expect(result.context).toContain("src/session.ts");
    expect(result.context).toContain(
      "Imports: src/session.ts",
    );
  });

  it("follows alias imports starting with @/", async () => {
    const applicationFile = createSourceFile(
      "src/app.ts",
      'import { authenticateUser } from "@/auth/authentication";',
    );

    const authenticationFile = createSourceFile(
      "src/auth/authentication.ts",
      "export function authenticateUser() { return true; }",
    );

    const files = [
      applicationFile,
      authenticationFile,
    ];

    vi.mocked(collectSecurityFiles).mockResolvedValue({
      ...collection,
      files,
      totalFiles: files.length,
      analyzedFiles: files.length,
    });

    const result = await buildRepositoryContext({
      owner: "octocat",
      repo: "hello-world",
      branch: "main",
      question: "authentication",
    });

    expect(result.context).toContain(
      "src/auth/authentication.ts",
    );
    expect(result.context).toContain(
      "Imports: src/auth/authentication.ts",
    );
  });

  it("limits the expanded context to 24 files", async () => {
    const importedFiles = Array.from(
      { length: 30 },
      (_, index) =>
        createSourceFile(
          `src/file-${index}.ts`,
          `export const value${index} = ${index};`,
        ),
    );

    const entryFile = createSourceFile(
      "src/target.ts",
      [
        ...importedFiles.map(
          (_, index) => `import "./file-${index}";`,
        ),
        "export function targetFeature() {}",
      ].join("\n"),
    );

    const files = [entryFile, ...importedFiles];

    vi.mocked(collectSecurityFiles).mockResolvedValue({
      ...collection,
      files,
      totalFiles: files.length,
      analyzedFiles: files.length,
    });

    const result = await buildRepositoryContext({
      owner: "octocat",
      repo: "hello-world",
      branch: "main",
      question: "targetFeature",
    });

    expect(result.filesIncluded).toBe(24);
    expect(result.truncated).toBe(true);
    expect(result.context).toContain("src/target.ts");
  });

  it("reports when the repository context is limited", async () => {
    const manyFiles: SecurityFileCollection = {
      ...collection,
      files: Array.from({ length: 30 }, (_, index) => ({
        path: `src/file-${index}.ts`,
        content: `export const value${index} = ${index};`,
        size: 30,
        sha: `sha-${index}`,
        kind: "source" as const,
      })),
      totalFiles: 30,
      analyzedFiles: 30,
    };

    vi.mocked(collectSecurityFiles).mockResolvedValue(manyFiles);

    const result = await buildRepositoryContext({
      owner: "octocat",
      repo: "hello-world",
      branch: "main",
      question: "explain the source code",
    });

    expect(result.filesIncluded).toBeLessThanOrEqual(24);
    expect(result.truncated).toBe(true);
  });
});