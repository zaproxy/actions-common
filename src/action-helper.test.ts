import { createMessage } from "./action-helper";

describe("action-helper", () => {
  describe("createMessage", () => {
    it("returns an empty string if there are no sites", () => {
      expect(createMessage([], "runnerId", "runnerLink")).toBe("");
    });
  });
});
