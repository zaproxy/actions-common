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

    it("shows the risk in front of the alert", () => {
      expect(
        createMessage(
          [
            new SiteFixture({
              alerts: [
                new AlertFixture({
                  instances: [new InstanceFixture()],
                  riskcode: "3",
                  confidence: "2",
                }),
              ],
            }),
          ],
          "2343454356",
          "https://github.com/zaproxy/actions-common/actions/runs/4926339347"
        )
      ).toContain("High risk (Confidence: Medium):");
    });

    it("shows a link to the risk description", () => {
      expect(
        createMessage(
          [
            new SiteFixture({
              alerts: [
                new AlertFixture({
                  instances: [new InstanceFixture()],
                  pluginid: "40012",
                }),
              ],
            }),
          ],
          "2343454356",
          "https://github.com/zaproxy/actions-common/actions/runs/4926339347"
        )
      ).toContain("https://www.zaproxy.org/docs/alerts/40012");
    });

    it("returns an empty string if there are no sites", () => {
      expect(createMessage([], "runnerId", "runnerLink")).toBe("");
    });
  });
});
