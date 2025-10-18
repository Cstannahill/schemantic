import fs from "fs";
import path from "path";

describe("generated types shape", () => {
  const generatedPath = path.resolve(
    __dirname,
    "..",
    "..",
    "test-output",
    "generated",
    "types.ts"
  );
  let content: string;

  beforeAll(() => {
    content = fs.readFileSync(generatedPath, "utf8");
  });

  test("transforms include typed param (val: Record<string, unknown>)", () => {
    // check at least one transform uses the typed val parameter
    const transformTyped =
      /\.transform\(\s*\(val:\s*Record<string,\s*unknown>\)/m.test(content);
    expect(transformTyped).toBe(true);
  });

  test("validate functions return structured success shape", () => {
    // check validate functions use safeParse and return { success: true, data: ... }
    const validateSuccessShape =
      /function\s+validate[A-Za-z0-9_]+\([\s\S]*?safeParse\([\s\S]*?\)[\s\S]*?return\s+\{\s*success:\s*true,\s*data:/m.test(
        content
      );
    const validateFailShape = /return\s+\{\s*success:\s*false,\s*errors:/m.test(
      content
    );
    expect(validateSuccessShape || validateFailShape).toBe(true);
  });
});
