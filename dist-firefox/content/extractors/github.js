"use strict";
(() => {
  // src/content/extractors/github.ts
  var GitHubExtractor = {
    name: "github",
    priority: 10,
    matches(url) {
      return url.hostname === "github.com" || url.hostname.endsWith(".github.com");
    },
    extract(doc) {
      const path = location.pathname;
      const prMatch = path.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
      if (prMatch) {
        return extractPR(doc, prMatch[1], prMatch[2], prMatch[3]);
      }
      const issueMatch = path.match(/^\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
      if (issueMatch) {
        return extractIssue(doc, issueMatch[1], issueMatch[2], issueMatch[3]);
      }
      const repoMatch = path.match(/^\/([^/]+)\/([^/]+)\/?$/);
      if (repoMatch) {
        return extractRepo(doc, repoMatch[1], repoMatch[2]);
      }
      return null;
    }
  };
  function extractPR(doc, owner, repo, number) {
    const title = doc.querySelector(".gh-header-title .js-issue-title")?.textContent?.trim() ?? "";
    const author = doc.querySelector(".gh-header-meta .author")?.textContent?.trim() ?? "";
    const state = doc.querySelector(".State")?.textContent?.trim() ?? "";
    const filesChanged = doc.querySelector("#files_tab_counter")?.textContent?.trim() ?? "";
    const checksEl = doc.querySelector(".merge-status-list");
    const checks = checksEl?.textContent?.trim() ?? "";
    const labels = Array.from(doc.querySelectorAll(".IssueLabel")).map(
      (el) => el.textContent?.trim() ?? ""
    );
    const reviewers = Array.from(doc.querySelectorAll(".reviewers-status-icon + .css-truncate")).map(
      (el) => el.textContent?.trim() ?? ""
    );
    return {
      siteName: "GitHub",
      entityType: "pull_request",
      data: {
        owner,
        repo,
        number: parseInt(number, 10),
        title,
        author,
        state,
        filesChanged,
        checks,
        labels,
        reviewers,
        url: location.href
      }
    };
  }
  function extractIssue(doc, owner, repo, number) {
    const title = doc.querySelector(".gh-header-title .js-issue-title")?.textContent?.trim() ?? "";
    const author = doc.querySelector(".gh-header-meta .author")?.textContent?.trim() ?? "";
    const state = doc.querySelector(".State")?.textContent?.trim() ?? "";
    const labels = Array.from(doc.querySelectorAll(".IssueLabel")).map(
      (el) => el.textContent?.trim() ?? ""
    );
    const assignees = Array.from(doc.querySelectorAll(".assignee .css-truncate-target")).map(
      (el) => el.textContent?.trim() ?? ""
    );
    return {
      siteName: "GitHub",
      entityType: "issue",
      data: {
        owner,
        repo,
        number: parseInt(number, 10),
        title,
        author,
        state,
        labels,
        assignees,
        url: location.href
      }
    };
  }
  function extractRepo(doc, owner, repo) {
    const description = doc.querySelector('[itemprop="about"]')?.textContent?.trim() ?? "";
    const stars = doc.querySelector("#repo-stars-counter-star")?.textContent?.trim() ?? "";
    const language = doc.querySelector('[itemprop="programmingLanguage"]')?.textContent?.trim() ?? "";
    return {
      siteName: "GitHub",
      entityType: "repository",
      data: {
        owner,
        repo,
        description,
        stars,
        language,
        url: location.href
      }
    };
  }
  var github_default = GitHubExtractor;
})();
//# sourceMappingURL=github.js.map
