
import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import { analyzeSecrets } from "./secrets-analyzer";
import type { SecurityRepositoryFile } from "./github-files";

function createFile(
  path: string,
  content: string,
): SecurityRepositoryFile {
  return {
    path,
    content,
    size: Buffer.byteLength(content, "utf8"),
    sha: "test-sha",
    kind: "source",
  };
}

function generatePrivateKey(): string {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return privateKey;
}

describe("analyzeSecrets", () => {
  it("ignores fictional private key markers in test files", () => {
    const file = createFile(
      "src/lib/ai/context-sanitizer.test.ts",
      [
        'const privateKey = "-----BEGIN PRIVATE KEY-----";',
        '"sensitive-private-key-content";',
        '"-----END PRIVATE KEY-----";',
      ].join("\n"),
    );

    const findings = analyzeSecrets([file]);

    expect(findings).toHaveLength(0);
  });

  it("detects a structurally valid private key", () => {
    const privateKey = generatePrivateKey();
    const file = createFile("src/config/keys.ts", privateKey);

    const findings = analyzeSecrets([file]);

    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe("SECRET_PRIVATE_KEY");
    expect(findings[0].severity).toBe("critical");
    expect(findings[0].confidence).toBe("high");
  });

  it("detects a valid private key inside a test file", () => {
    const privateKey = generatePrivateKey();
    const file = createFile(
      "src/lib/security/secrets-analyzer.test.ts",
      privateKey,
    );

    const findings = analyzeSecrets([file]);

    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe("SECRET_PRIVATE_KEY");
    expect(findings[0].severity).toBe("critical");
  });

  it("ignores incomplete private key blocks", () => {
    const file = createFile(
      "src/config/keys.ts",
      [
        "-----BEGIN PRIVATE KEY-----",
        "this-is-not-a-valid-base64-private-key",
      ].join("\n"),
    );

    const findings = analyzeSecrets([file]);

    expect(findings).toHaveLength(0);
  });

  it("preserves GitHub token detection", () => {
    const token = `ghp_${"A".repeat(30)}`;
    const file = createFile(
      "src/config.ts",
      `const token = "${token}";`,
    );

    const findings = analyzeSecrets([file]);

    expect(
      findings.some(
        (finding) => finding.ruleId === "SECRET_GITHUB_TOKEN",
      ),
    ).toBe(true);
  });

  it("preserves AWS access key detection", () => {
    const accessKey = ["AKIA", "QWERTYUIOPASDFGH"].join("");
    const file = createFile(
      "src/config.ts",
      `const accessKey = "${accessKey}";`,
    );

    const findings = analyzeSecrets([file]);

    expect(
      findings.some(
        (finding) => finding.ruleId === "SECRET_AWS_ACCESS_KEY",
      ),
    ).toBe(true);
  });

  it("preserves generic credential detection", () => {
    const file = createFile(
      "src/config.ts",
      'const password = "my-real-password-123";',
    );

    const findings = analyzeSecrets([file]);

    expect(
      findings.some(
        (finding) =>
          finding.ruleId === "SECRET_GENERIC_ASSIGNMENT",
      ),
    ).toBe(true);
  });
});
