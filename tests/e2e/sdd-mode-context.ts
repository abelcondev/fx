import { expect } from "bun:test";

/**
 * The effective SDD/TDD line fx puts in every request. It is asserted against
 * the prompt a fake gateway actually received, so it proves the model reads the
 * live configuration and is told that the configuration outranks memory.
 */
export type SddContextExpectation =
  | { enabled: false; source: string }
  | { enabled: true; tdd: "off" | "auto" | "on" | "strict"; source: string };

export function expectSddContext(body: string, expected: SddContextExpectation) {
  const request = JSON.parse(body) as {
    prompt: Array<{ role?: string; content?: unknown }>;
  };
  const messages = request.prompt.map((message) => ({
    role: message.role,
    text: typeof message.content === "string" ? message.content : "",
  }));
  const matching = messages.filter((message) =>
    message.text.startsWith("Runtime context: SDD is "),
  );

  expect(matching).toHaveLength(1);
  expect(matching[0]!.role).toBe("system");
  const text = matching[0]!.text;

  if (expected.enabled) {
    expect(text).toContain(`SDD is on for this workspace (${expected.source})`);
    expect(text).toContain(`tdd is ${expected.tdd}`);
    expect(text).toContain("files under `sdd/` are not source");
    expect(text).toContain("does not cover behavior and does not count");
  } else {
    expect(text).toContain(`SDD is off for this workspace (${expected.source})`);
    expect(text).toContain(
      "does not require a change record, test-first work or an end-of-turn test run",
    );
  }
  expect(text).toContain("it wins over any memory fact about how fx behaves");
}
