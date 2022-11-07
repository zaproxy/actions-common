import { main } from "./index";
import nock from "nock";
import { readFileSync } from "fs";
import { ReportFixture } from "./models/ReportFixture";
import { mockSearchIssues } from "./testHelpers/githubApiMocks/mockSearchIssues";
import { mockCreateIssue } from "./testHelpers/githubApiMocks/mockCreateIssue";
import Mock = jest.Mock;

jest.mock("@actions/artifact", () => ({
  create: () => ({
    uploadArtifact: jest.fn(),
  }),
}));

jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

describe("processReport", () => {
  describe("with a report file in place", () => {
    beforeEach(() => {
      const report = new ReportFixture();
      (readFileSync as Mock).mockReturnValue(JSON.stringify(report));
    });

    afterAll(() => {
      (readFileSync as Mock).mockReset();
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
