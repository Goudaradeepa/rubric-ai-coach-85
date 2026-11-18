import { describe, expect, it } from "vitest";
import { studentNamesMatch } from "@/lib/student-identity";

describe("studentNamesMatch", () => {
  it("matches names regardless of letter case, spaces, or punctuation", () => {
    expect(studentNamesMatch("Deepa Goudra", "deepa goudra")).toBe(true);
    expect(studentNamesMatch("Deepa Goudra", "Deepa-Goudra")).toBe(true);
  });

  it("does not match different student names or blank values", () => {
    expect(studentNamesMatch("Deepa Goudra", "Deepa Gowda")).toBe(false);
    expect(studentNamesMatch("", "Deepa Goudra")).toBe(false);
    expect(studentNamesMatch("Deepa Goudra", "")).toBe(false);
  });
});