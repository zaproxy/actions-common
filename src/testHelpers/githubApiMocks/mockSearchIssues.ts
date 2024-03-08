import { Interceptable } from "undici";

interface Issue {
  number: number;
  state: "closed" | "open";
  body: string;
  comments: number;
  user: {
    login: string;
  };
}

export function mockSearchIssues(
  mockPool: Interceptable,
  { owner, repo }: { owner: string; repo: string },
  issueTitle: string,
  issues: Issue[],
) {
  mockPool
    .intercept({
      path: `/search/issues?q=is%3Aissue+state%3Aopen+repo%3A${owner}%2F${repo}+${issueTitle}&sort=updated`,
    })
    .reply(
      200,
      {
        total_count: issues.length,
        incomplete_results: false,
        items: issues,
      },
      { headers: { "content-type": "application/json" } },
    );
}
