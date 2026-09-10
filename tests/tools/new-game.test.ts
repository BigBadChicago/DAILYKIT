import { describe, expect, it } from "vitest";

import {
  buildNewGame,
  NEW_GAME_CONFIG_MARKERS,
  validateGameId,
} from "../../tools/new-game.js";

describe("buildNewGame", () => {
  const options = { id: "sample-game", name: "SAMPLE GAME", hue: 96 };

  it("declares every generated path and nothing else", () => {
    const result = buildNewGame(options);
    expect([...result.files.keys()]).toEqual([
      "src/games/sample-game/rules.ts",
      "src/games/sample-game/generator.ts",
      "src/games/sample-game/module.ts",
      "src/games/sample-game/render.ts",
      "src/games/sample-game/style.css",
      "src/games/sample-game/help.ts",
      "src/shell/entries/sample-game.ts",
      "src/shell/entries/sample-game.html",
      "tests/games/sample-game/rules.test.ts",
      "tests/games/sample-game/module.test.ts",
    ]);
  });

  it("writes clean files with no placeholder text or dash punctuation in prose", () => {
    const result = buildNewGame(options);
    for (const [path, contents] of result.files) {
      expect(contents).not.toMatch(/TODO|FIXME|placeholder|implementation goes here/i);
      if (path.endsWith(".ts") || path.endsWith(".md")) {
        expect(contents).not.toMatch(/[–—]|(?<=\s)-(?=\s)/);
      }
    }
  });

  it("names the id once in the generated module and imports no other game", () => {
    const moduleFile = buildNewGame(options).files.get("src/games/sample-game/module.ts") as string;
    expect(moduleFile).toContain('id: "sample-game"');
    expect(moduleFile.match(/"sample-game"/g)).toHaveLength(1);
    expect(moduleFile).not.toMatch(/from ".*games\//);
  });

  it("writes an entry that imports the generated module and calls mountShell", () => {
    const entryFile = buildNewGame(options).files.get("src/shell/entries/sample-game.ts") as string;
    expect(entryFile).toContain('import gameModule from "../../games/sample-game/module.js";');
    expect(entryFile).toContain("mountShell(gameModule);");
  });

  it("prints the exact registry and allow list insertions", () => {
    const result = buildNewGame(options);
    expect(result.registryInsertion).toContain('    id: "sample-game"');
    expect(result.registryInsertion).toContain('    status: "planned"');
    expect(result.targetsInsertion).toContain('  "sample-game": {');
    expect(result.targetsInsertion).toContain('    productionSafe: false');
    expect(result.targetsInsertion).toContain('    gameId: "sample-game"');
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
