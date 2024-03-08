import { Interceptable } from "undici";

export function mockCreateIssue(
  mockPool: Interceptable,
  issueNumber: number,
  { owner, repo }: { owner: string; repo: string },
) {
  return mockPool
    .intercept({
      method: "POST",
      path: `/repos/${owner}/${repo}/issues`,
    })
    .reply(
      201,
      { number: issueNumber },
      { headers: { "content-type": "application/json" } },
    );
}
