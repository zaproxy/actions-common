import { main } from "./index.js";
import fs from "fs";
import fetchMock from "fetch-mock";
import { ReportFixture } from "./models/ReportFixture.js";
import "jest-os-detection";
import { Fetch } from "@octokit/types";

jest.mock("@actions/artifact", () => ({
  create: () => ({
    uploadArtifact: jest.fn(),
  }),
}));

describe("processReport", () => {
  describe.skipMac("with a report file in place", () => {
    const originalReadFileSync = fs.readFileSync;
    const baseUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";

    beforeEach(() => {
      const report = new ReportFixture();
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(report));
    });

    afterAll(() => {
      fs.readFileSync = originalReadFileSync;
    });

    describe("without an open issue", () => {
      // eslint-disable-next-line jest/expect-expect
      it("creates a new issue", async () => {
        const owner = "owner";
        const repo = "repo";
        const issueTitle = "issueTitle";

        // Fetch is a type from @octokit/types, which is set to any..
        // so we have to disable the eslint check for now.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const mock: Fetch = fetchMock
          .sandbox()
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          .getOnce(
            `${baseUrl}/search/issues?q=is%3Aissue+state%3Aopen+repo%3A${owner}%2F${repo}+${issueTitle}&sort=updated`,
            { total_count: 0, incomplete_results: false, items: [] },
            {},
          )
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          .postOnce(
            `${baseUrl}/repos/${owner}/${repo}/issues`,
            { number: 3 },
            {},
          );

        await main.processReport(
          "token",
          "workSpace",
          [],
          "currentRunnerID",
          issueTitle,
          `${owner}/${repo}`,
          true,
          "zap_scan",
          mock,
        );
      });
    });
  });
});
