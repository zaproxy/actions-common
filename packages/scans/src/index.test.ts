import { main } from "./index";
import nock from "nock";
import fs from "fs";
import { ReportFixture } from "./models/ReportFixture";
import { mockSearchIssues } from "./testHelpers/githubApiMocks/mockSearchIssues";
import { mockCreateIssue } from "./testHelpers/githubApiMocks/mockCreateIssue";

jest.mock("@actions/artifact", () => ({
  create: () => ({
    uploadArtifact: jest.fn(),
  }),
}));

describe("processReport", () => {
  describe("with a report file in place", () => {
    const originalReadFileSync = fs.readFileSync;

    beforeEach(() => {
      const report = new ReportFixture();
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(report));
    });

    afterAll(() => {
      fs.readFileSync = originalReadFileSync;
    });

    describe("without an open issue", () => {
      beforeEach(async () => {
        mockSearchIssues([]);
      });

      afterEach(() => {
        nock.restore();
      });

      it("creates a new issue", async () => {
        const owner = "owner";
        const repo = "repo";
        const scope = mockCreateIssue(3, { owner, repo });

        await main.processReport(
          "token",
          "workSpace",
          [],
          "currentRunnerID",
          "issueTitle",
          `${owner}/${repo}`
        );

        expect(scope.isDone()).toBe(true);
      });
    });
  });
});
