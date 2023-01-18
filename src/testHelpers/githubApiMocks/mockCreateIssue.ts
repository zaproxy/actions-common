import nock from "nock";

export function mockCreateIssue(
  issueNumber: number,
  { owner, repo }: { owner: string; repo: string }
) {
  return nock("https://api.github.com")
    .post(`/repos/${owner}/${repo}/issues`)
    .reply(201, { number: issueNumber });
}
