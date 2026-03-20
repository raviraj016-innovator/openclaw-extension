/**
 * Live dashboard HTML — shows browser context in real-time.
 * Served at http://localhost:18790/
 * Uses SQLite-backed endpoints for persistent data.
 * Auto-refreshes every 3 seconds.
 */

export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OpenClaw Browser Context</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #0a0a0a; color: #e0e0e0; padding: 24px;
      max-width: 1200px; margin: 0 auto;
    }
    h1 { font-size: 24px; margin-bottom: 8px; color: #fff; }
    h1 span { color: #f97316; }
    .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
    .stats { display: flex; gap: 16px; margin-bottom: 24px; }
    .stat {
      background: #161616; border: 1px solid #222; border-radius: 8px;
      padding: 16px 20px; flex: 1; text-align: center;
    }
    .stat-value { font-size: 28px; font-weight: 700; color: #fff; }
    .stat-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
    .stat.green .stat-value { color: #10b981; }
    .stat.blue .stat-value { color: #3b82f6; }
    .stat.orange .stat-value { color: #f97316; }

    .section { margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: 600; color: #888; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }

    .visit-card {
      background: #161616; border: 1px solid #222; border-radius: 8px;
      padding: 14px; margin-bottom: 8px;
    }
    .visit-card .visit-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .visit-title { font-weight: 600; color: #fff; font-size: 14px; }
    .visit-time { font-size: 11px; color: #555; font-family: monospace; }
    .visit-url { color: #555; font-size: 12px; word-break: break-all; margin-bottom: 4px; }
    .visit-meta { color: #444; font-size: 11px; }
    .visit-meta span { margin-right: 12px; }
    .visit-site { display: inline-block; background: #f9731620; color: #f97316; font-size: 11px; padding: 2px 8px; border-radius: 4px; margin-top: 4px; }
    .visit-content { background: #0d0d0d; border-radius: 4px; padding: 8px; font-size: 11px; color: #666; max-height: 60px; overflow: hidden; margin-top: 6px; font-family: monospace; white-space: pre-wrap; word-break: break-word; }

    .action-card {
      background: #161616; border: 1px solid #222; border-radius: 6px;
      padding: 8px 12px; margin-bottom: 4px; display: flex; gap: 12px; align-items: center; font-size: 12px;
    }
    .action-type { font-weight: 600; color: #3b82f6; min-width: 50px; }
    .action-text { color: #999; flex: 1; }
    .action-time { color: #444; font-family: monospace; font-size: 11px; }

    .summary-box {
      background: #161616; border: 1px solid #222; border-radius: 8px;
      padding: 16px; font-family: 'SF Mono', monospace; font-size: 12px;
      color: #888; white-space: pre-wrap; max-height: 400px; overflow-y: auto;
    }

    .api-links { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
    .api-link {
      background: #161616; border: 1px solid #333; border-radius: 6px;
      padding: 6px 12px; color: #3b82f6; text-decoration: none; font-size: 12px; font-family: monospace;
    }
    .api-link:hover { border-color: #3b82f6; }
    .refresh { color: #444; font-size: 11px; text-align: right; }
    .empty { color: #444; font-style: italic; padding: 40px; text-align: center; }
    .domain-tag { display: inline-block; background: #222; color: #999; font-size: 10px; padding: 2px 6px; border-radius: 3px; margin-right: 4px; }
  </style>
</head>
<body>
  <h1><span>&#x1F99E;</span> OpenClaw Browser Context</h1>
  <p class="subtitle">Live view of everything captured from your browser</p>

  <div class="api-links">
    <a class="api-link" href="/context/active" target="_blank">/context/active</a>
    <a class="api-link" href="/context/tabs" target="_blank">/context/tabs</a>
    <a class="api-link" href="/context/browsing" target="_blank">/context/browsing</a>
    <a class="api-link" href="/context/summary" target="_blank">/context/summary</a>
    <a class="api-link" href="/context/stats" target="_blank">/context/stats</a>
    <a class="api-link" href="/health" target="_blank">/health</a>
  </div>

  <div class="stats" id="stats">
    <div class="stat green"><div class="stat-value" id="stat-visits">-</div><div class="stat-label">Page Visits</div></div>
    <div class="stat blue"><div class="stat-value" id="stat-actions">-</div><div class="stat-label">Interactions</div></div>
    <div class="stat orange"><div class="stat-value" id="stat-domains">-</div><div class="stat-label">Domains</div></div>
    <div class="stat"><div class="stat-value" id="stat-db">-</div><div class="stat-label">DB Size (MB)</div></div>
  </div>

  <div class="section">
    <div class="section-title">Recent Pages (last 15 min)</div>
    <div id="visits-container"><div class="empty">Waiting for browsing data...</div></div>
  </div>

  <div class="section">
    <div class="section-title">Recent Actions (last 15 min)</div>
    <div id="actions-container"><div class="empty">No interactions yet...</div></div>
  </div>

  <div class="section">
    <div class="section-title">LLM Context Summary</div>
    <div class="summary-box" id="summary">Waiting for context...</div>
  </div>

  <p class="refresh" id="refresh">Auto-refreshing every 3s</p>

  <script>
    async function refresh() {
      try {
        const [statsRes, browsingRes, summaryRes] = await Promise.all([
          fetch('/context/stats'),
          fetch('/context/browsing?minutes=15'),
          fetch('/context/summary?minutes=15'),
        ]);
        const stats = await statsRes.json();
        const browsing = await browsingRes.json();
        const summary = await summaryRes.json();

        // Stats
        document.getElementById('stat-visits').textContent = stats.visits || 0;
        document.getElementById('stat-actions').textContent = stats.interactions || 0;
        document.getElementById('stat-domains').textContent = browsing.domainsVisited?.length || 0;
        document.getElementById('stat-db').textContent = stats.dbSizeMB || '0';

        // Recent pages
        const vc = document.getElementById('visits-container');
        if (!browsing.recentPages || browsing.recentPages.length === 0) {
          vc.innerHTML = '<div class="empty">No pages visited in the last 15 minutes. Browse something!</div>';
        } else {
          vc.innerHTML = browsing.recentPages.map(function(p) {
            return '<div class="visit-card">' +
              '<div class="visit-header">' +
                '<span class="visit-title">' + esc(p.title || '(untitled)') + '</span>' +
                '<span class="visit-time">' + esc(p.visitedAt || '') + '</span>' +
              '</div>' +
              '<div class="visit-url">' + esc(p.url) + '</div>' +
              '<div class="visit-meta">' +
                '<span>' + (p.contentLength || 0).toLocaleString() + ' chars</span>' +
                (p.timeSpentMs > 0 ? '<span>' + Math.round(p.timeSpentMs / 1000) + 's on page</span>' : '') +
              '</div>' +
              (p.siteName ? '<div class="visit-site">' + esc(p.siteName) + ' &middot; ' + esc(p.siteEntityType || '') + '</div>' : '') +
              (p.contentPreview ? '<div class="visit-content">' + esc(p.contentPreview) + '</div>' : '') +
            '</div>';
          }).join('');
        }

        // Recent actions
        var ac = document.getElementById('actions-container');
        if (!browsing.recentInteractions || browsing.recentInteractions.length === 0) {
          ac.innerHTML = '<div class="empty">No interactions recorded yet.</div>';
        } else {
          ac.innerHTML = browsing.recentInteractions.map(function(a) {
            return '<div class="action-card">' +
              '<span class="action-type">' + esc(a.type) + '</span>' +
              '<span class="action-text">' + esc(a.targetText || a.url || '') + '</span>' +
              '<span class="action-time">' + esc(a.at || '') + '</span>' +
            '</div>';
          }).join('');
        }

        // Summary
        document.getElementById('summary').textContent = summary.summary || 'No context yet';

        document.getElementById('refresh').textContent = 'Auto-refreshing every 3s';
      } catch (e) {
        document.getElementById('refresh').textContent = 'Error: ' + e.message;
      }
    }

    function esc(s) {
      if (!s) return '';
      var d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }

    refresh();
    setInterval(refresh, 3000);
  </script>
</body>
</html>`;
