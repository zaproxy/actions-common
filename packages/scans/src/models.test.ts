import { isFilteredSite } from "./models";

describe("FilteredSite", () => {
  describe("isFilteredSite", () => {
    it("rejects a site without ignoredAlerts", () => {
      expect(isFilteredSite({ "@name": "https://example.org" })).toBe(false);
    });
  });
});
