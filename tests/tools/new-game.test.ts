import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { newGamePlan, uniqueProbes } from "../../tools/certify.js";
import {
  buildNewGame,
  GAME_PLANS_MARKER,
  insertAtMarker,
  NEW_GAME_CONFIG_MARKERS,
  validateGameId,
} from "../../tools/new-game.js";

/* The rule forbids a dash used as punctuation, not the hyphen in a kebab case
   id and not the minus in `count - 1`, so the check reads prose only: an .md
   file whole, and a .ts file's comments and string literals. */
const DASH_AS_PUNCTUATION = /[\u2013\u2014]|(?<=\s)-(?=\s)/;

function proseOf(path: string, contents: string): string {
  if (path.endsWith(".md")) return contents;
  return (contents.match(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:[^"\\\n]|\\.)*"/g) ?? []).join("\n");
}

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
      "tests/games/sample-game/generator.test.ts",
      "tests/games/sample-game/module.test.ts",
      "tests/games/sample-game/render.test.ts",
    ]);
  });

  it("writes clean files with no placeholder text or dash punctuation in prose", () => {
    const result = buildNewGame(options);
    for (const [path, contents] of result.files) {
      expect(contents).not.toMatch(/TODO|FIXME|placeholder|implementation goes here/i);
      if (path.endsWith(".ts") || path.endsWith(".md")) {
        expect(proseOf(path, contents)).not.toMatch(DASH_AS_PUNCTUATION);
      }
    }
  });

  it("names the id once in the generated module and imports no other game", () => {
    const moduleFile = buildNewGame(options).files.get("src/games/sample-game/module.ts") as string;
    expect(moduleFile).toContain('id: "sample-game"');
    expect(moduleFile.match(/"sample-game"/g)).toHaveLength(1);
    expect(moduleFile).not.toMatch(/from ".*games\//);
  });

  /* v3 migration phase 6. The scaffold writes against the one contract the
     shell reads, and nothing of the deleted v2 surface. */
  it("writes a v3 module and no v2 surface anywhere", () => {
    const result = buildNewGame(options);
    const moduleFile = result.files.get("src/games/sample-game/module.ts") as string;
    expect(moduleFile).toContain('import { defineGameV3, type GameModuleV3 } from "../../contract/v3/game-module.js";');
    expect(moduleFile).toContain("export default defineGameV3(game);");
    for (const member of ["shareCapabilities", "difficulty", "telemetry", "shareArtifact"]) {
      expect(moduleFile).toContain(`  ${member},`);
    }
    for (const [path, contents] of result.files) {
      expect(contents, path).not.toMatch(/\bdefineGame\(|contract\/game-module|\bshareBlock\b|\bbucketOf\b|\bShareBlock\b/);
    }
  });

  it("writes every test file the certification plan names for the game", () => {
    const files = buildNewGame(options).files;
    const named = uniqueProbes([newGamePlan("sample-game")]).flatMap((probe) =>
      probe.kind === "test-file" && probe.path.startsWith("tests/games/sample-game/") ? [probe.path] : [],
    );
    expect(named.length).toBeGreaterThan(0);
    for (const path of named) expect(files.has(path), path).toBe(true);
  });

  it("never shows the target cell before a tap finds it", () => {
    const render = buildNewGame(options).files.get("src/games/sample-game/render.ts") as string;
    expect(render).not.toMatch(/isTarget|"\?"/);
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
    expect(result.plansInsertion).toBe(['  "sample-game": {', '    ...newGamePlan("sample-game"),', "  },"].join("\n"));
  });

  it("dates every scaffolded game to the first Monday of the epoch year", () => {
    const result = buildNewGame(options);
    const moduleFile = result.files.get("src/games/sample-game/module.ts") as string;
    expect(result.registryInsertion).toContain("epoch: { year: 2026, month: 1, day: 5 }");
    expect(moduleFile).toContain("epoch: { year: 2026, month: 1, day: 5 }");
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
    expect(first.plansInsertion).toBe(second.plansInsertion);
  });
});

describe("NEW_GAME_CONFIG_MARKERS", () => {
  it("names the insertion markers for registry, targets and plans", () => {
    expect(NEW_GAME_CONFIG_MARKERS).toEqual({
      registry: "SUITE_GAMES",
      targets: "TARGETS",
      plans: "GAME_PLANS",
    });
  });

  it("finds each marker exactly once in the file it patches", () => {
    const cases: readonly [string, string][] = [
      ["src/shell/registry.ts", "/* NEW_GAME_INSERTION: SUITE_GAMES */"],
      ["vite.config.ts", "/* NEW_GAME_INSERTION: TARGETS */"],
      ["tools/certify.ts", GAME_PLANS_MARKER],
    ];
    for (const [path, marker] of cases) {
      expect(readFileSync(path, "utf8").split(marker), path).toHaveLength(2);
    }
  });

  /* The GAME_PLANS row lands inside the object, after the last live plan, so a
     scaffolded game's plan is a key of GAME_PLANS and nothing else. */
  it("places the GAME_PLANS row inside GAME_PLANS", () => {
    const source = readFileSync("tools/certify.ts", "utf8");
    const patched = insertAtMarker(source, GAME_PLANS_MARKER, buildNewGame({ id: "sample-game", name: "SAMPLE GAME", hue: 96 }).plansInsertion);
    const start = patched.indexOf("export const GAME_PLANS");
    const row = patched.indexOf('"sample-game": {');
    expect(row).toBeGreaterThan(start);
    expect(patched.indexOf("\n};", start)).toBeGreaterThan(row);
  });
});

describe("the scaffold's display name", () => {
  it("upper cases it and refuses characters that would break a generated string", () => {
    expect(buildNewGame({ id: "sample-game", name: "  sample   game ", hue: 96 }).registryInsertion).toContain(
      'displayName: "SAMPLE GAME"',
    );
    expect(() => buildNewGame({ id: "sample-game", name: 'say "hi"', hue: 96 })).toThrow();
    expect(() => buildNewGame({ id: "sample-game", name: "cost $5", hue: 96 })).toThrow();
  });
});

describe("insertAtMarker", () => {
  const marker = "/* NEW_GAME_INSERTION: TARGETS */";

  it("refuses a source with no marker or with two", () => {
    expect(() => insertAtMarker("const A = {};", marker, "  x: 1,")).toThrow(/exactly one/);
    expect(() => insertAtMarker(`${marker}\n${marker}`, marker, "  x: 1,")).toThrow(/exactly one/);
  });

  it("indents the inserted entry like its siblings and keeps the marker", () => {
    const source = ["const TARGETS = {", '  hub: { outPath: "" },', `  ${marker}`, "};", ""].join(
      "\n",
    );
    const insertion = ['  "sample-game": {', '    outPath: "sample-game",', "  },"].join("\n");
    expect(insertAtMarker(source, marker, insertion)).toBe(
      [
        "const TARGETS = {",
        '  hub: { outPath: "" },',
        '  "sample-game": {',
        '    outPath: "sample-game",',
        "  },",
        `  ${marker}`,
        "};",
        "",
      ].join("\n"),
    );
  });
});
