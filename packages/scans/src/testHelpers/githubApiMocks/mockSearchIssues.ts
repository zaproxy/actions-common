import nock from "nock";

interface Issue {
  number: number;
  state: "closed" | "open";
  body: string;
  comments: number;
  user: {
    login: string;
  };
}

export function mockSearchIssues(issues: Issue[]) {
  return nock("https://api.github.com")
    .get("/search/issues")
    .query(true)
    .reply(200, {
      total_count: issues.length,
      incomplete_results: false,
      items: issues,
    });
}
