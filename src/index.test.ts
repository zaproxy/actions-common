import { main } from "./index.js";
import fs from "fs";
import fetchMock from "fetch-mock";
import { ReportFixture } from "./models/ReportFixture.js";
import "jest-os-detection";
import { DefaultArtifactClient } from "@actions/artifact";

jest.mock("@actions/artifact");
jest.mocked(DefaultArtifactClient).mockImplementation(() => {
  return {
    uploadArtifact: jest.fn(),
    downloadArtifact: jest.fn(),
    listArtifacts: jest.fn(),
    getArtifact: jest.fn(),
    deleteArtifact: jest.fn(),
  };
});

describe("processReport", () => {
  describe("with a report file in place", () => {
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

        const mock = fetchMock
          .createInstance()
          .getOnce(
            `${baseUrl}/search/issues?q=is%3Aissue+state%3Aopen+repo%3A${owner}%2F${repo}+${issueTitle}&sort=updated&advanced_search=true`,
            { total_count: 0, incomplete_results: false, items: [] },
            {},
          )
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
          mock.fetchHandler.bind(mock),
        );
      });
    });
  });
});
