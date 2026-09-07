const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const context = vm.createContext({ window: {}, Date });
vm.runInContext(fs.readFileSync(path.join(__dirname, "../launch-schedule.js"), "utf8"), context);
const schedule = context.window.MaelstromLaunchSchedule;

test("site remains gated before 20 September in Bergen", () => {
  assert.equal(schedule.phase(new Date("2026-09-19T21:59:59Z")), "closed");
});

test("site can be entered while countdown remains from 20 to 22 September", () => {
  assert.equal(schedule.phase(new Date("2026-09-19T22:00:00Z")), "preview");
  assert.equal(schedule.phase(new Date("2026-09-22T21:59:59Z")), "preview");
});

test("countdown disappears at midnight in Bergen on 23 September", () => {
  assert.equal(schedule.phase(new Date("2026-09-22T22:00:00Z")), "open");
  assert.equal(schedule.OPENING_DATE.toISOString(), "2026-09-22T22:00:00.000Z");
});
