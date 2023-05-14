import { createMessage } from "./action-helper";
import { SiteFixture } from "./models/SiteFixture";
import { AlertFixture } from "./models/AlertFixture";
import { InstanceFixture } from "./models/InstanceFixture";

describe("action-helper", () => {
  describe("createMessage", () => {
    it("returns the snapshot message", () => {
      expect(
        createMessage(
          [
            {
              "@name": "http://localhost:8080",
              alerts: [
                {
                  name: "Cross Site Scripting (Reflected)",
                  pluginid: "40012",
                  riskcode: "2",
                  confidence: "3",
                  instances: [
                    { uri: "http://localhost:8080/bodgeit/contact.jsp" },
                  ],
                },
              ],
            },
          ],

          "2343454356",
          "https://github.com/zaproxy/actions-common/actions/runs/4926339347"
        )
      ).toMatchInlineSnapshot(`
        "- Site: [http://localhost:8080](http://localhost:8080) 
         	 **New Alerts** 
        	- **Medium risk (Confidence: High): Cross Site Scripting (Reflected)** [[40012]](https://www.zaproxy.org/docs/alerts/40012) total: 1:  
        		- [http://localhost:8080/bodgeit/contact.jsp](http://localhost:8080/bodgeit/contact.jsp) 



        https://github.com/zaproxy/actions-common/actions/runs/4926339347
        2343454356"
      `);
    });

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
