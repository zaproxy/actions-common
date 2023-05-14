import { createMessage } from "./action-helper";
import { SiteFixture } from "./models/SiteFixture";
import { AlertFixture } from "./models/AlertFixture";
import { InstanceFixture } from "./models/InstanceFixture";

describe("action-helper", () => {
  describe("createMessage", () => {
    it("returns the count of instances for an alert", () => {
      expect(
        createMessage(
          [
            new SiteFixture({
              alerts: [
                new AlertFixture({ instances: [new InstanceFixture()] }),
              ],
            }),
          ],
          "2343454356",
          "https://github.com/zaproxy/actions-common/actions/runs/4926339347"
        )
      ).toContain("total: 1");
    });

    it("returns an empty string if there are no sites", () => {
      expect(createMessage([], "runnerId", "runnerLink")).toBe("");
    });
  });
});
