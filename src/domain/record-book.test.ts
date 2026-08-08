import { describe, expect, it } from "vitest";
import { recordLeaders, recordLineage } from "./record-book";
const definition = { key: "score", name: "Highest score", direction: "max" as const, scope: "all" as const };
describe("record book", () => {
  it("preserves tied ranks and honors scope", () => expect(recordLeaders(definition, [{ entityId: "a", value: 10 }, { entityId: "b", value: 10 }, { entityId: "c", value: 8 }]).map((item) => item.rank)).toEqual([1, 1, 3]));
  it("tracks only genuine record changes in historical order", () => expect(recordLineage(definition, [{ entityId: "a", value: 10, season: 2020 }, { entityId: "b", value: 9, season: 2021 }, { entityId: "c", value: 11, season: 2022 }]).map((item) => item.entityId)).toEqual(["a", "c"]));
});
