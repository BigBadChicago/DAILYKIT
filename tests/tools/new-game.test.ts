import { describe, expect, it } from "vitest";

import {
  buildNewGame,
  NEW_GAME_CONFIG_MARKERS,
  validateGameId,
} from "../../tools/new-game.js";

describe("buildNewGame", () => {
  const options = { id: "scaffold-check", name: "SCAFFOLD CHECK", hue: 96 };

  it("declares every generated path and nothing else", () => {
    const result = buildNewGame(options);
    expect([...result.files.keys()]).toEqual([
      "src/games/scaffold-check/rules.ts",
      "src/games/scaffold-check/generator.ts",
      "src/games/scaffold-check/module.ts",
      "src/games/scaffold-check/render.ts",
      "src/games/scaffold-check/style.css",
      "src/games/scaffold-check/help.ts",
      "src/shell/entries/scaffold-check.ts",
      "src/shell/entries/scaffold-check.html",
      "tests/games/scaffold-check/rules.test.ts",
      "tests/games/scaffold-check/module.test.ts",
    ]);
  });

  it("writes clean files with no placeholder text or dash punctuation in prose", () => {
    const result = buildNewGame(options);
    for (const [path, contents] of result.files) {
      expect(contents).not.toMatch(/TODO|FIXME|placeholder|implementation goes here/i);
      if (path.endsWith(".ts") || path.endsWith(".md")) {
        expect(contents).not.toMatch(/\b[a-z]+-[a-z]+\b/);
      }
    }
  });

  it("names the id once in the generated module and imports no other game", () => {
    const moduleFile = buildNewGame(options).files.get("src/games/scaffold-check/module.ts") as string;
    expect(moduleFile).toContain('id: "scaffold-check"');
    expect(moduleFile.match(/"scaffold-check"/g)).toHaveLength(1);
    expect(moduleFile).not.toMatch(/from ".*games\//);
  });

  it("writes an entry that imports the generated module and calls mountShell", () => {
    const entryFile = buildNewGame(options).files.get("src/shell/entries/scaffold-check.ts") as string;
    expect(entryFile).toContain('import gameModule from "../../games/scaffold-check/module.js";');
    expect(entryFile).toContain("mountShell(gameModule);");
  });

  it("prints the exact registry and allow list insertions", () => {
    const result = buildNewGame(options);
    expect(result.registryInsertion).toContain('    id: "scaffold-check"');
    expect(result.registryInsertion).toContain('    status: "planned"');
    expect(result.targetsInsertion).toContain('  "scaffold-check": {');
    expect(result.targetsInsertion).toContain('    productionSafe: false');
    expect(result.targetsInsertion).toContain('    gameId: "scaffold-check"');
  });

  it("rejects invalid ids and duplicate ids", () => {
    expect(() => validateGameId("Scaffold")).toThrow();
    expect(() => validateGameId("scaffold_check")).toThrow();
    expect(() => validateGameId("poker-grid")).toThrow();
  });

  it("is byte identical for the same options", () => {
    const first = buildNewGame(options);
    const second = buildNewGame(options);
    expect(first.files).toEqual(second.files);
    expect(first.registryInsertion).toBe(second.registryInsertion);
    expect(first.targetsInsertion).toBe(second.targetsInsertion);
  });
});

describe("NEW_GAME_CONFIG_MARKERS", () => {
  it("names the insertion markers for registry and targets", () => {
    expect(NEW_GAME_CONFIG_MARKERS).toEqual({
      registry: "SUITE_GAMES",
      targets: "TARGETS",
    });
  });
});
