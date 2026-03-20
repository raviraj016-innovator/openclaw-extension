"use strict";
(() => {
  // src/content/extractors/jira.ts
  var JiraExtractor = {
    name: "jira",
    priority: 10,
    matches(url) {
      return url.hostname.endsWith(".atlassian.net") || url.hostname.endsWith(".jira.com");
    },
    extract(doc) {
      const issueKey = doc.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]')?.textContent?.trim() ?? doc.querySelector("#key-val")?.textContent?.trim() ?? extractIssueKeyFromUrl();
      if (!issueKey) return null;
      const summary = doc.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]')?.textContent?.trim() ?? doc.querySelector("#summary-val")?.textContent?.trim() ?? "";
      const status = doc.querySelector('[data-testid="issue.views.issue-base.foundation.status.status-field-wrapper"] span')?.textContent?.trim() ?? doc.querySelector("#status-val")?.textContent?.trim() ?? "";
      const assignee = doc.querySelector('[data-testid="issue.views.field.user.assignee"] span')?.textContent?.trim() ?? doc.querySelector("#assignee-val")?.textContent?.trim() ?? "Unassigned";
      const priority = doc.querySelector('[data-testid="issue.views.field.priority.priority"] span')?.textContent?.trim() ?? doc.querySelector("#priority-val")?.textContent?.trim() ?? "";
      const issueType = doc.querySelector('[data-testid="issue.views.issue-base.foundation.issue-type.button"] span')?.textContent?.trim() ?? doc.querySelector("#type-val")?.textContent?.trim() ?? "";
      const labels = Array.from(doc.querySelectorAll('[data-testid="issue.views.field.multi-select.labels"] a, .labels .lozenge')).map(
        (el) => el.textContent?.trim() ?? ""
      );
      return {
        siteName: "Jira",
        entityType: "issue",
        data: {
          issueKey,
          summary,
          status,
          assignee,
          priority,
          issueType,
          labels,
          url: location.href
        }
      };
    }
  };
  function extractIssueKeyFromUrl() {
    const match = location.pathname.match(/\/browse\/([A-Z]+-\d+)/);
    return match?.[1] ?? null;
  }
  var jira_default = JiraExtractor;
})();
//# sourceMappingURL=jira.js.map
