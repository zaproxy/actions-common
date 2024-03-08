import { main } from "./index";
import fs from "fs";
import { Interceptable, MockAgent, setGlobalDispatcher } from "undici";
import { ReportFixture } from "./models/ReportFixture";
import { mockSearchIssues } from "./testHelpers/githubApiMocks/mockSearchIssues";
import { mockCreateIssue } from "./testHelpers/githubApiMocks/mockCreateIssue";
import "jest-os-detection";

jest.mock("@actions/artifact", () => ({
  create: () => ({
    uploadArtifact: jest.fn(),
  }),
}));

describe("processReport", () => {
  describe.skipMac("with a report file in place", () => {
    const originalReadFileSync = fs.readFileSync;
    let mockPool: Interceptable;

    beforeEach(() => {
      const report = new ReportFixture();
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(report));
    });

    afterAll(() => {
      fs.readFileSync = originalReadFileSync;
    });

    describe("without an open issue", () => {
      beforeEach(async () => {
        const mockAgent = new MockAgent();
        mockAgent.disableNetConnect();
        setGlobalDispatcher(mockAgent);
        mockPool = mockAgent.get("https://api.github.com");
      });

      afterEach(async () => {
        await mockPool.close();
      });

      // eslint-disable-next-line jest/expect-expect
      it("creates a new issue", async () => {
        const owner = "owner";
        const repo = "repo";
        const issueTitle = "issueTitle";

        mockSearchIssues(mockPool, { owner, repo }, issueTitle, []);
        mockCreateIssue(mockPool, 3, { owner, repo });

        await main.processReport(
          "token",
          "workSpace",
          [],
          "currentRunnerID",
          issueTitle,
          `${owner}/${repo}`,
        );
      });
    });
  });
});
