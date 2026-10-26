import test from "node:test";
import assert from "node:assert/strict";
import { filterPaletteCommands } from "./command-palette.js";

const commands = [
  { title: "Today", description: "Captures saved today", keywords: ["view", "date"] },
  { title: "Read later", description: "Open items saved to read later", keywords: ["view", "later"] },
  { title: "Backup history", description: "Restore a local backup", keywords: ["storage", "recovery"] },
  { title: "Quick capture", description: "Focus the capture field", keywords: ["new", "shortcut"] }
];

test("command palette returns all safe command entries when the query is empty", () => {
  assert.deepEqual(filterPaletteCommands(commands, "").map(item => item.title), [
    "Today", "Read later", "Backup history", "Quick capture"
  ]);
});

test("command palette matches all query words across title, description and keywords", () => {
  assert.deepEqual(filterPaletteCommands(commands, "view later").map(item => item.title), ["Read later"]);
  assert.deepEqual(filterPaletteCommands(commands, "restore recovery").map(item => item.title), ["Backup history"]);
  assert.deepEqual(filterPaletteCommands(commands, "QUICK FIELD").map(item => item.title), ["Quick capture"]);
});

test("command palette ignores malformed entries and caps the displayed command list", () => {
  assert.deepEqual(filterPaletteCommands([null, {}, { title: "Fine" }], "").map(item => item.title), ["Fine"]);
  const many = Array.from({ length: 40 }, (_, index) => ({ title: "Command " + index }));
  assert.equal(filterPaletteCommands(many, "").length, 24);
});

test("command palette returns no results for an unknown query", () => {
  assert.deepEqual(filterPaletteCommands(commands, "unavailable action"), []);
});
