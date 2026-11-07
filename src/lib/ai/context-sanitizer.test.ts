import { describe, expect, it } from "vitest";

import { sanitizeRepositoryContext } from "./context-sanitizer";

describe("sanitizeRepositoryContext", () => {
  it("excludes environment files from the context", () => {
    const result = sanitizeRepositoryContext([
      {
        path: ".env",
        content: "API_KEY=real-secret-value",
      },
      {
        path: ".env.local",
        content: "DATABASE_URL=postgres://user:password",
      },
      {
        path: "config/.env.production",
        content: "SECRET=production-secret",
      },
      {
        path: ".env.example",
        content: "API_KEY=your_api_key",
      },
      {
        path: "src/index.ts",
        content: "export const value = 10;",
      },
    ]);

    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe("src/index.ts");

    expect(result.excludedFiles).toEqual([
      ".env",
      ".env.local",
      "config/.env.production",
      ".env.example",
    ]);
  });

  it("masks GitHub access tokens", () => {
    const result = sanitizeRepositoryContext([
      {
        path: "src/config.ts",
        content:
          'const token = "ghp_123456789012345678901234567890";',
      },
    ]);

    expect(result.files[0].content).not.toContain(
      "ghp_123456789012345678901234567890",
    );

    expect(result.files[0].content).toContain("[REDACTED]");
    expect(result.files[0].redactions).toBe(1);
  });

  it("masks credentials assigned to sensitive variable names", () => {
    const result = sanitizeRepositoryContext([
      {
        path: "src/config.ts",
        content: [
          'const apiKey = "super-secret-value-123";',
          'const password = "my-password-value-123";',
        ].join("\n"),
      },
    ]);

    expect(result.files[0].content).not.toContain(
      "super-secret-value-123",
    );

    expect(result.files[0].content).not.toContain(
      "my-password-value-123",
    );

    expect(result.files[0].content).toContain(
      'apiKey = "[REDACTED]"',
    );

    expect(result.files[0].redactions).toBe(2);
  });

  it("preserves common placeholder values", () => {
    const result = sanitizeRepositoryContext([
      {
        path: "src/config.ts",
        content: [
          'const apiKey = "your_api_key";',
          'const secret = "replace_me";',
          "const enabled = true;",
        ].join("\n"),
      },
    ]);

    expect(result.files[0].content).toContain("your_api_key");
    expect(result.files[0].content).toContain("replace_me");
    expect(result.files[0].content).toContain("enabled = true");
    expect(result.files[0].redactions).toBe(0);
  });

  it("masks JWTs and bearer tokens", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signaturevalue123456";

    const bearerToken =
      "abcdefghijklmnopqrstuvwxyz123456";

    const result = sanitizeRepositoryContext([
      {
        path: "src/auth.ts",
        content: [
          `const token = "${jwt}";`,
          `const authorization = "Bearer ${bearerToken}";`,
        ].join("\n"),
      },
    ]);

    expect(result.files[0].content).not.toContain(jwt);
    expect(result.files[0].content).not.toContain(bearerToken);
    expect(result.files[0].redactions).toBe(2);
  });

  it("masks complete private key blocks", () => {
    const privateKey = [
      "-----BEGIN PRIVATE KEY-----",
      "sensitive-private-key-content",
      "-----END PRIVATE KEY-----",
    ].join("\n");

    const result = sanitizeRepositoryContext([
      {
        path: "src/keys.ts",
        content: privateKey,
      },
    ]);

    expect(result.files[0].content).not.toContain(
      "sensitive-private-key-content",
    );

    expect(result.files[0].content).toContain("[REDACTED]");
    expect(result.files[0].redactions).toBe(1);
  });

  it("preserves ordinary code and does not modify the original files", () => {
    const originalContent = [
      "export function calculateTotal(price: number) {",
      "  return price * 1.2;",
      "}",
    ].join("\n");

    const files = [
      {
        path: "src/calculator.ts",
        content: originalContent,
      },
    ];

    const result = sanitizeRepositoryContext(files);

    expect(result.files[0].content).toBe(originalContent);
    expect(result.files[0].redactions).toBe(0);
    expect(files[0].content).toBe(originalContent);
    expect(result.totalRedactions).toBe(0);
  });

  it("returns the total number of redactions", () => {
    const result = sanitizeRepositoryContext([
      {
        path: "src/first.ts",
        content: "const token = ghp_123456789012345678901234567890;",
      },
      {
        path: "src/second.ts",
        content: 'const password = "another-secret-value-123";',
      },
    ]);

    expect(result.totalRedactions).toBe(2);
    expect(result.files).toHaveLength(2);
  });
});