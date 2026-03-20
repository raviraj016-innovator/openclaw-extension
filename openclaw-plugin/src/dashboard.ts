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
      padding: 14px; margin-bottom: 8px; position: relative;
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

    .chat-section {
      background: #161616; border: 1px solid #222; border-radius: 8px;
      padding: 16px; margin-bottom: 24px;
    }
    .chat-messages {
      max-height: 400px; overflow-y: auto; margin-bottom: 12px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .chat-msg { padding: 10px 14px; border-radius: 10px; font-size: 14px; line-height: 1.5; max-width: 85%; white-space: pre-wrap; word-break: break-word; }
    .chat-msg.user { align-self: flex-end; background: #3b82f6; color: #fff; border-bottom-right-radius: 4px; }
    .chat-msg.assistant { align-self: flex-start; background: #1e293b; color: #e0e0e0; border-bottom-left-radius: 4px; }
    .chat-msg.thinking { align-self: flex-start; background: #1e293b; color: #666; font-style: italic; }
    .chat-input-row { display: flex; gap: 8px; }
    .chat-input {
      flex: 1; padding: 10px 12px; border: 1px solid #333; border-radius: 8px;
      background: #0d0d0d; color: #e0e0e0; font-size: 14px; font-family: inherit; resize: none;
    }
    .chat-input:focus { outline: none; border-color: #3b82f6; }
    .chat-send {
      padding: 10px 20px; background: #3b82f6; color: #fff; border: none; border-radius: 8px;
      font-size: 14px; cursor: pointer; font-weight: 600;
    }
    .chat-send:hover { background: #2563eb; }
    .chat-send:disabled { background: #333; cursor: not-allowed; }
    .chat-suggestions { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
    .chat-suggestion {
      padding: 6px 12px; background: #0d0d0d; border: 1px solid #333; border-radius: 6px;
      color: #888; font-size: 12px; cursor: pointer;
    }
    .chat-suggestion:hover { border-color: #3b82f6; color: #3b82f6; }

    .tab-btn {
      padding: 10px 24px; background: transparent; border: none; border-bottom: 2px solid transparent;
      color: #666; font-size: 14px; font-weight: 500; cursor: pointer; font-family: inherit;
    }
    .tab-btn.active { color: #fff; border-bottom-color: #3b82f6; }
    .tab-btn:hover { color: #999; }

    .api-links { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
    .api-link {
      background: #161616; border: 1px solid #333; border-radius: 6px;
      padding: 6px 12px; color: #3b82f6; text-decoration: none; font-size: 12px; font-family: monospace;
    }
    .api-link:hover { border-color: #3b82f6; }
    .refresh { color: #444; font-size: 11px; text-align: right; }
    .empty { color: #444; font-style: italic; padding: 40px; text-align: center; }
    .domain-tag { display: inline-block; background: #222; color: #999; font-size: 10px; padding: 2px 6px; border-radius: 3px; margin-right: 4px; }

    /* --- Copy buttons --- */
    .copy-btn {
      background: #222; border: 1px solid #333; border-radius: 4px;
      color: #888; font-size: 10px; font-family: monospace; padding: 2px 6px;
      cursor: pointer; margin-left: 6px; vertical-align: middle;
    }
    .copy-btn:hover { border-color: #3b82f6; color: #3b82f6; }

    /* --- Confidence badges --- */
    .badge {
      display: inline-block; font-size: 10px; padding: 2px 6px; border-radius: 4px;
      font-weight: 600; margin-left: 6px; vertical-align: middle;
    }
    .badge-verified { background: #10b98130; color: #10b981; }
    .badge-likely { background: #eab30830; color: #eab308; }
    .badge-inferred { background: #f9731630; color: #f97316; }
    .badge-none { background: #44444430; color: #666; }

    /* --- Delete button --- */
    .delete-btn {
      position: absolute; top: 10px; right: 10px;
      background: transparent; border: 1px solid #44222a; border-radius: 4px;
      color: #a44; font-size: 14px; width: 22px; height: 22px; line-height: 20px;
      text-align: center; cursor: pointer; padding: 0;
    }
    .delete-btn:hover { background: #a4433330; border-color: #a44; color: #f66; }

    /* --- Contact sub-tabs --- */
    .contact-subtab-bar { display: flex; gap: 0; margin-bottom: 16px; border-bottom: 2px solid #222; }
    .contact-subtab {
      padding: 8px 20px; background: transparent; border: none; border-bottom: 2px solid transparent;
      color: #666; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit;
    }
    .contact-subtab.active { color: #fff; border-bottom-color: #f97316; }
    .contact-subtab:hover { color: #999; }

    /* --- Export buttons --- */
    .export-btn {
      background: #161616; border: 1px solid #333; border-radius: 6px;
      padding: 6px 12px; color: #3b82f6; text-decoration: none; font-size: 12px; font-family: monospace;
      cursor: pointer; display: inline-block;
    }
    .export-btn:hover { border-color: #3b82f6; }

    /* --- Company group --- */
    .company-group {
      margin-bottom: 12px;
    }
    .company-header {
      background: #1a1a1a; border: 1px solid #222; border-radius: 8px 8px 0 0;
      padding: 10px 14px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;
      user-select: none;
    }
    .company-header:hover { background: #1e1e1e; }
    .company-header .company-name { font-weight: 600; color: #fff; font-size: 14px; }
    .company-header .company-count { color: #666; font-size: 12px; }
    .company-header .company-arrow { color: #555; font-size: 12px; transition: transform 0.2s; }
    .company-header.collapsed .company-arrow { transform: rotate(-90deg); }
    .company-body {
      border: 1px solid #222; border-top: none; border-radius: 0 0 8px 8px;
      overflow: hidden;
    }
    .company-body.hidden { display: none; }
    .company-body .visit-card { border-radius: 0; margin-bottom: 0; border-bottom: 1px solid #1a1a1a; }
    .company-body .visit-card:last-child { border-bottom: none; }

    /* --- Relationship strength bar --- */
    .rel-bar-container {
      display: inline-flex; align-items: center; gap: 6px; margin-top: 4px;
    }
    .rel-bar-track {
      width: 60px; height: 4px; background: #222; border-radius: 2px; overflow: hidden;
    }
    .rel-bar-fill {
      height: 100%; border-radius: 2px;
    }
    .rel-bar-label { font-size: 10px; color: #555; }

    /* --- Timeline --- */
    .contact-timeline {
      background: #0d0d0d; border: 1px solid #1a1a1a; border-radius: 6px;
      margin-top: 10px; padding: 12px; max-height: 250px; overflow-y: auto;
    }
    .timeline-item {
      display: flex; gap: 10px; align-items: flex-start; padding: 6px 0;
      border-bottom: 1px solid #161616; font-size: 12px;
    }
    .timeline-item:last-child { border-bottom: none; }
    .timeline-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;
      flex-shrink: 0; margin-top: 4px;
    }
    .timeline-time { color: #555; font-family: monospace; font-size: 11px; min-width: 130px; }
    .timeline-text { color: #999; flex: 1; }

    /* --- Merge candidates --- */
    .merge-section { margin-top: 32px; }
    .merge-pair {
      background: #161616; border: 1px solid #222; border-radius: 8px;
      padding: 14px; margin-bottom: 10px; display: flex; gap: 16px; align-items: center;
    }
    .merge-contact {
      flex: 1; padding: 10px; background: #0d0d0d; border-radius: 6px;
    }
    .merge-contact .mc-name { font-weight: 600; color: #fff; font-size: 13px; }
    .merge-contact .mc-detail { color: #888; font-size: 12px; margin-top: 2px; }
    .merge-vs { color: #444; font-weight: 700; font-size: 12px; flex-shrink: 0; }
    .merge-btn {
      padding: 6px 14px; background: #f97316; color: #fff; border: none; border-radius: 6px;
      font-size: 12px; cursor: pointer; font-weight: 600; flex-shrink: 0;
    }
    .merge-btn:hover { background: #ea580c; }
  </style>
</head>
<body>
  <h1><span>&#x1F99E;</span> OpenClaw Browser Context</h1>

  <div style="display:flex;gap:0;margin-bottom:20px;border-bottom:2px solid #222;">
    <button class="tab-btn active" onclick="switchTab('dashboard')" id="tab-dashboard">Dashboard</button>
    <button class="tab-btn" onclick="switchTab('contacts')" id="tab-contacts">Contacts</button>
  </div>

  <div id="page-dashboard">
  <p class="subtitle">Live view of everything captured from your browser</p>

  <div class="api-links">
    <a class="api-link" href="/context/active" target="_blank">/context/active</a>
    <a class="api-link" href="/context/tabs" target="_blank">/context/tabs</a>
    <a class="api-link" href="/context/browsing" target="_blank">/context/browsing</a>
    <a class="api-link" href="/context/summary" target="_blank">/context/summary</a>
    <a class="api-link" href="/contacts" target="_blank">/contacts</a>
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
    <div class="section-title">Ask About Your Browsing</div>
    <div class="chat-section">
      <div class="chat-suggestions">
        <span class="chat-suggestion" onclick="askQuestion(this.textContent)">What was I looking at in the last 5 mins?</span>
        <span class="chat-suggestion" onclick="askQuestion(this.textContent)">Summarize my browsing session</span>
        <span class="chat-suggestion" onclick="askQuestion(this.textContent)">What did I spend the most time on?</span>
        <span class="chat-suggestion" onclick="askQuestion(this.textContent)">What links did I click?</span>
      </div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input-row">
        <input type="text" class="chat-input" id="chat-input" placeholder="Ask about your browsing..." onkeydown="if(event.key==='Enter')sendChat()">
        <button class="chat-send" id="chat-send" onclick="sendChat()">Ask</button>
      </div>
    </div>
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
  </div><!-- end page-dashboard -->

  <div id="page-contacts" style="display:none;">
    <p class="subtitle">People discovered from your browsing</p>

    <!-- LinkedIn Intelligence section -->
    <div id="linkedin-intel-section" style="display:none;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <div style="background:#0A66C2;color:#fff;font-weight:700;font-size:14px;padding:6px 14px;border-radius:6px;">in</div>
        <span style="font-size:16px;font-weight:600;color:#fff;">LinkedIn Intelligence</span>
      </div>
      <div class="stats" id="linkedin-stats">
        <div class="stat" style="border-color:#0A66C230;"><div class="stat-value" id="li-total" style="color:#0A66C2;">-</div><div class="stat-label">LinkedIn Contacts</div></div>
        <div class="stat" style="border-color:#7B3FE430;"><div class="stat-value" id="li-salesnav" style="color:#7B3FE4;">-</div><div class="stat-label">From Sales Navigator</div></div>
        <div class="stat" style="border-color:#0A66C230;"><div class="stat-value" id="li-with-email" style="color:#10b981;">-</div><div class="stat-label">With Email</div></div>
      </div>
      <div id="li-top-companies" style="margin-top:10px;"></div>
    </div>

    <!-- Contact health stats row -->
    <div class="stats" id="contact-health-stats">
      <div class="stat green"><div class="stat-value" id="ch-total">-</div><div class="stat-label">Total Contacts</div></div>
      <div class="stat blue"><div class="stat-value" id="ch-email">-</div><div class="stat-label">With Email</div></div>
      <div class="stat orange"><div class="stat-value" id="ch-multi">-</div><div class="stat-label">Multiple Platforms</div></div>
      <div class="stat"><div class="stat-value" id="ch-recent">-</div><div class="stat-label">Last 24h</div></div>
    </div>

    <!-- Export buttons -->
    <div style="display:flex;gap:8px;margin-bottom:16px;align-items:center;">
      <a class="export-btn" href="/contacts/export/csv" target="_blank">Export CSV</a>
      <a class="export-btn" href="/contacts/export/vcard" target="_blank">Export vCard</a>
    </div>

    <!-- Search bar -->
    <div style="display:flex;gap:8px;margin-bottom:16px;">
      <input type="text" class="chat-input" id="contact-search" placeholder="Search by name, company, or email..." oninput="searchContacts()" style="flex:1;">
    </div>

    <!-- Sub-tabs: All Contacts | By Company -->
    <div class="contact-subtab-bar">
      <button class="contact-subtab active" onclick="switchContactSubtab('all')" id="subtab-all">All Contacts</button>
      <button class="contact-subtab" onclick="switchContactSubtab('company')" id="subtab-company">By Company</button>
    </div>

    <div id="contact-stats" style="color:#666;font-size:12px;margin-bottom:12px;"></div>

    <!-- All contacts view -->
    <div id="contacts-view-all">
      <div id="contacts-list"></div>
    </div>

    <!-- By company view -->
    <div id="contacts-view-company" style="display:none;">
      <div id="company-groups-list"></div>
    </div>

    <!-- Merge candidates section -->
    <div class="merge-section" id="merge-section" style="display:none;">
      <div class="section-title">Possible Duplicates</div>
      <div id="merge-candidates-list"></div>
    </div>
  </div>

  <script>
  // --- Utility ---
  function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  // --- Tab switching ---
  function switchTab(tab) {
    document.getElementById('page-dashboard').style.display = tab === 'dashboard' ? 'block' : 'none';
    document.getElementById('page-contacts').style.display = tab === 'contacts' ? 'block' : 'none';
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.getElementById('tab-' + tab).classList.add('active');
    if (tab === 'contacts') {
      loadContacts();
      loadContactHealth();
      loadMergeCandidates();
      loadLinkedInStats();
    }
  }

  // --- Contact sub-tab switching ---
  var currentContactSubtab = 'all';
  function switchContactSubtab(sub) {
    currentContactSubtab = sub;
    document.getElementById('contacts-view-all').style.display = sub === 'all' ? 'block' : 'none';
    document.getElementById('contacts-view-company').style.display = sub === 'company' ? 'block' : 'none';
    document.querySelectorAll('.contact-subtab').forEach(function(b) { b.classList.remove('active'); });
    document.getElementById('subtab-' + sub).classList.add('active');
    if (sub === 'company') loadCompanyView();
  }

  // --- Contact health stats ---
  async function loadContactHealth() {
    try {
      var res = await fetch('/contacts/health');
      var data = await res.json();
      document.getElementById('ch-total').textContent = data.totalContacts != null ? data.totalContacts : '-';
      document.getElementById('ch-email').textContent = data.withEmail != null ? data.withEmail : '-';
      document.getElementById('ch-multi').textContent = data.multiplePlatforms != null ? data.multiplePlatforms : '-';
      document.getElementById('ch-recent').textContent = data.extractedLast24h != null ? data.extractedLast24h : '-';
    } catch (e) {
      // Silently fail — stats will show dashes
    }
  }

  // --- LinkedIn stats ---
  async function loadLinkedInStats() {
    try {
      var res = await fetch('/contacts/linkedin-stats');
      var data = await res.json();
      var section = document.getElementById('linkedin-intel-section');
      if (!data || (data.totalLinkedIn == null && data.total_linkedin == null)) {
        section.style.display = 'none';
        return;
      }
      section.style.display = 'block';
      var total = data.totalLinkedIn != null ? data.totalLinkedIn : (data.total_linkedin || 0);
      var salesNav = data.fromSalesNav != null ? data.fromSalesNav : (data.from_sales_nav || 0);
      var withEmail = data.withEmail != null ? data.withEmail : (data.with_email || 0);
      document.getElementById('li-total').textContent = total;
      document.getElementById('li-salesnav').textContent = salesNav;
      document.getElementById('li-with-email').textContent = withEmail;

      var topCompanies = data.topCompanies || data.top_companies || [];
      var compContainer = document.getElementById('li-top-companies');
      if (Array.isArray(topCompanies) && topCompanies.length > 0) {
        compContainer.innerHTML = '<div style="font-size:12px;color:#888;margin-bottom:6px;font-weight:600;">Top Companies</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;">' +
          topCompanies.map(function(c) {
            var name = typeof c === 'string' ? c : (c.company || c.name || '');
            var count = typeof c === 'object' && c.count ? ' (' + c.count + ')' : '';
            return '<span style="background:#0A66C220;color:#0A66C2;font-size:11px;padding:3px 8px;border-radius:4px;">' + esc(name) + esc(count) + '</span>';
          }).join('') +
          '</div>';
      } else {
        compContainer.innerHTML = '';
      }
    } catch (e) {
      document.getElementById('linkedin-intel-section').style.display = 'none';
    }
  }

  // --- Confidence badge helper ---
  function confidenceBadge(email, confidence) {
    if (!email) return '<span class="badge badge-none">No email</span>';
    if (confidence >= 0.8) return '<span class="badge badge-verified">Verified</span>';
    if (confidence >= 0.5) return '<span class="badge badge-likely">Likely</span>';
    if (confidence > 0) return '<span class="badge badge-inferred">Inferred</span>';
    return '<span class="badge badge-none">No email</span>';
  }

  // --- Relationship strength bar ---
  function relationshipBar(timesViewed) {
    var maxViews = 20;
    var pct = Math.min(100, Math.round((timesViewed / maxViews) * 100));
    var color = pct > 60 ? '#10b981' : (pct > 30 ? '#eab308' : '#555');
    return '<div class="rel-bar-container">' +
      '<div class="rel-bar-track"><div class="rel-bar-fill" style="width:' + pct + '%;background:' + color + ';"></div></div>' +
      '<span class="rel-bar-label">' + esc(String(timesViewed)) + ' views</span>' +
    '</div>';
  }

  // --- Copy helpers ---
  function copyText(text) {
    navigator.clipboard.writeText(text).then(function() {
      // Briefly flash a confirmation — not strictly needed but nice UX
    }).catch(function() {});
  }

  function copyCard(name, headline, company, email) {
    var parts = [name];
    if (headline) parts.push(headline);
    else if (company) parts.push(company);
    if (email) parts.push(email);
    navigator.clipboard.writeText(parts.join(' - ')).catch(function() {});
  }

  // --- Event delegation for all dynamic buttons (avoids quoting issues in template literal) ---
  document.addEventListener('click', function(e) {
    var el = e.target;
    if (!el || !el.getAttribute) return;

    // Copy email button
    var copyVal = el.getAttribute('data-copy');
    if (copyVal) {
      e.stopPropagation();
      copyText(copyVal);
      return;
    }

    // Copy card button
    if (el.getAttribute('data-copy-card')) {
      e.stopPropagation();
      copyCard(
        el.getAttribute('data-card-name') || '',
        el.getAttribute('data-card-headline') || '',
        el.getAttribute('data-card-company') || '',
        el.getAttribute('data-card-email') || ''
      );
      return;
    }

    // Delete contact button
    var deleteId = el.getAttribute('data-delete-contact');
    if (deleteId) {
      e.stopPropagation();
      deleteContact(parseInt(deleteId, 10));
      return;
    }

    // Merge button
    var mergeA = el.getAttribute('data-merge-a');
    if (mergeA) {
      e.stopPropagation();
      mergeContacts(parseInt(mergeA, 10), parseInt(el.getAttribute('data-merge-b') || '0', 10));
      return;
    }

    // Company group toggle
    var companyGroupId = el.getAttribute('data-toggle-company');
    if (!companyGroupId) {
      // Check parent (click might be on child span)
      var parent = el.parentElement;
      if (parent) companyGroupId = parent.getAttribute('data-toggle-company');
    }
    if (companyGroupId) {
      toggleCompanyGroup(companyGroupId, el);
      return;
    }

    // Contact card timeline toggle — walk up to find the card
    var card = el.closest('[data-toggle-timeline]');
    if (card) {
      var cardId = card.getAttribute('data-toggle-timeline');
      var personId = parseInt(card.getAttribute('data-timeline-person') || '0', 10);
      toggleTimeline(cardId, personId);
      return;
    }
  });

  // --- Outreach readiness score bar ---
  function outreachReadinessBar(c) {
    var score = 0;
    if (c.email) score += 40;
    if (c.company) score += 20;
    if (c.role) score += 15;
    if (c.connection_degree) score += 10;
    if ((c.times_viewed || 0) > 1) score += 15;
    var color = score >= 70 ? '#10b981' : (score >= 40 ? '#eab308' : '#555');
    return '<div style="display:inline-flex;align-items:center;gap:6px;margin-top:4px;">' +
      '<div style="width:60px;height:4px;background:#222;border-radius:2px;overflow:hidden;">' +
        '<div style="width:' + score + '%;height:100%;background:' + color + ';border-radius:2px;"></div>' +
      '</div>' +
      '<span style="font-size:10px;color:#555;">' + score + '%</span>' +
    '</div>';
  }

  // --- Build a single contact card HTML ---
  function buildContactCard(c, includeDelete) {
    var platformIcon = { linkedin: '&#x1F517;', github: '&#x1F431;', twitter: '&#x1F426;', instagram: '&#x1F4F7;', facebook: '&#x1F465;' }[c.platform] || '&#x1F464;';

    // Connection degree badge (next to platform icon)
    var connectionDegreeBadge = c.connection_degree
      ? '<span style="background:#222;color:#10b981;font-size:10px;padding:1px 5px;border-radius:3px;margin-left:4px;">' + esc(String(c.connection_degree)) + '</span>'
      : '';

    // Sales Navigator badge
    var salesNavBadge = c.source_type === 'sales_nav'
      ? '<span style="background:#7B3FE4;color:white;font-size:10px;padding:1px 5px;border-radius:3px;margin-left:6px;">SN</span>'
      : '';

    // Premium data gold star
    var premiumStar = c.is_premium_data === 1
      ? '<span style="margin-left:4px;font-size:12px;" title="Premium data">&#x2B50;</span>'
      : '';

    // Company visits indicator
    var companyVisitsHtml = (c.company_visits && c.company_visits > 0)
      ? '<div style="color:#666;font-size:10px;margin-top:2px;">Company viewed ' + esc(String(c.company_visits)) + 'x</div>'
      : '';

    // Email row with badge and copy button
    var emailHtml;
    if (c.email) {
      emailHtml = '<div style="color:#10b981;font-size:13px;display:flex;align-items:center;flex-wrap:wrap;gap:4px;">' +
        '&#x1F4E7; ' + esc(c.email) +
        ' <span style="color:#666;font-size:11px;">(' + esc(c.email_source || '?') + (c.email_confidence > 0 ? ' ' + Math.round(c.email_confidence * 100) + '%' : '') + ')</span>' +
        confidenceBadge(c.email, c.email_confidence) +
        '<button class="copy-btn" data-copy="' + esc(c.email) + '">Copy</button>' +
      '</div>';
    } else {
      emailHtml = '<div style="color:#555;font-size:12px;font-style:italic;display:flex;align-items:center;gap:4px;">' +
        'No email found' + confidenceBadge(null, 0) +
      '</div>';
    }

    // Profile links
    var links = [];
    if (c.linkedin_url) links.push('<a href="' + esc(c.linkedin_url) + '" target="_blank" style="color:#3b82f6;font-size:11px;text-decoration:none;">LinkedIn</a>');
    if (c.github_url) links.push('<a href="' + esc(c.github_url) + '" target="_blank" style="color:#3b82f6;font-size:11px;text-decoration:none;">GitHub</a>');
    if (c.twitter_url) links.push('<a href="' + esc(c.twitter_url) + '" target="_blank" style="color:#3b82f6;font-size:11px;text-decoration:none;">Twitter</a>');
    if (c.website) links.push('<a href="' + esc(c.website) + '" target="_blank" style="color:#3b82f6;font-size:11px;text-decoration:none;">Website</a>');

    // "Copy Card" data attributes — use data-* to avoid quoting hell in template literal
    var copyCardAttr = 'data-copy-card="1" data-card-name="' + esc(c.name) +
      '" data-card-headline="' + esc(c.headline || '') +
      '" data-card-company="' + esc(c.company || '') +
      '" data-card-email="' + esc(c.email || '') + '"';

    // Delete button
    var deleteHtml = includeDelete !== false
      ? '<button class="delete-btn" title="Delete contact" data-delete-contact="' + (c.id || 0) + '">&times;</button>'
      : '';

    // Relationship strength bar (using times_viewed as proxy)
    var relHtml = c.person_id ? relationshipBar(c.times_viewed || 0) : '';

    // Expandable card for timeline
    var cardId = 'contact-card-' + (c.id || Math.random().toString(36).substr(2));
    var personId = c.person_id || '';

    return '<div class="visit-card" id="' + cardId + '" data-person-id="' + esc(String(personId)) + '" style="cursor:pointer;" data-toggle-timeline="' + cardId + '" data-timeline-person="' + (c.person_id || 0) + '">' +
      deleteHtml +
      '<div class="visit-header" style="padding-right:28px;">' +
        '<span class="visit-title">' + platformIcon + connectionDegreeBadge + ' ' + esc(c.name) + salesNavBadge + premiumStar + '</span>' +
        '<div style="display:flex;align-items:center;gap:8px;">' +
          '<button class="copy-btn" ' + copyCardAttr + '>Copy Card</button>' +
          '<span style="color:#555;font-size:11px;">Seen ' + esc(String(c.times_viewed || 0)) + 'x</span>' +
        '</div>' +
      '</div>' +
      (c.headline ? '<div style="color:#999;font-size:13px;">' + esc(c.headline) + '</div>' : '') +
      (c.company ? '<div style="color:#888;font-size:12px;">' + esc(c.role ? c.role + ' @ ' + c.company : c.company) + '</div>' : '') +
      (c.location ? '<div style="color:#666;font-size:11px;">&#x1F4CD; ' + esc(c.location) + '</div>' : '') +
      emailHtml +
      (links.length > 0 ? '<div style="margin-top:6px;">' + links.join(' &middot; ') + '</div>' : '') +
      relHtml +
      companyVisitsHtml +
      outreachReadinessBar(c) +
      '<div style="color:#444;font-size:10px;margin-top:4px;">Last seen: ' + esc(c.last_seen_at) + '</div>' +
      '<div class="contact-timeline" id="timeline-' + cardId + '" style="display:none;"></div>' +
    '</div>';
  }

  // --- Toggle timeline for a contact card ---
  async function toggleTimeline(cardId, personId) {
    var timelineEl = document.getElementById('timeline-' + cardId);
    if (!timelineEl) return;

    if (timelineEl.style.display !== 'none') {
      timelineEl.style.display = 'none';
      return;
    }

    timelineEl.style.display = 'block';
    timelineEl.innerHTML = '<div style="color:#555;font-size:12px;padding:8px;">Loading timeline...</div>';

    if (!personId) {
      timelineEl.innerHTML = '<div style="color:#555;font-size:12px;padding:8px;font-style:italic;">No person record linked.</div>';
      return;
    }

    try {
      var res = await fetch('/persons/' + personId + '/timeline');
      var data = await res.json();
      var events = data.timeline || data.events || data || [];
      if (!Array.isArray(events) || events.length === 0) {
        timelineEl.innerHTML = '<div style="color:#555;font-size:12px;padding:8px;font-style:italic;">No interactions recorded yet.</div>';
        return;
      }
      timelineEl.innerHTML = events.map(function(ev) {
        return '<div class="timeline-item">' +
          '<div class="timeline-dot"></div>' +
          '<span class="timeline-time">' + esc(ev.timestamp || ev.at || ev.date || '') + '</span>' +
          '<span class="timeline-text">' + esc(ev.description || ev.title || ev.action || ev.type || '') + '</span>' +
        '</div>';
      }).join('');
    } catch (e) {
      timelineEl.innerHTML = '<div style="color:#555;font-size:12px;padding:8px;">Error loading timeline: ' + esc(e.message) + '</div>';
    }
  }

  // --- Delete a contact ---
  async function deleteContact(id) {
    if (!id) return;
    if (!confirm('Delete this contact? This cannot be undone.')) return;
    try {
      await fetch('/contacts/' + id, { method: 'DELETE' });
      loadContacts();
      loadContactHealth();
    } catch (e) {
      alert('Failed to delete contact: ' + e.message);
    }
  }

  // --- Contacts ---
  async function loadContacts(query) {
    try {
      var url = '/contacts?limit=100';
      if (query) url += '&q=' + encodeURIComponent(query);
      var [contactsRes, statsRes] = await Promise.all([fetch(url), fetch('/contacts/stats')]);
      var data = await contactsRes.json();
      var stats = await statsRes.json();

      document.getElementById('contact-stats').textContent =
        stats.total + ' contacts | ' + stats.withEmail + ' with email | ' +
        Object.entries(stats.platforms || {}).map(function(e) { return e[0] + ': ' + e[1]; }).join(', ');

      var list = document.getElementById('contacts-list');
      if (!data.contacts || data.contacts.length === 0) {
        list.innerHTML = '<div class="empty">No contacts found. Visit some LinkedIn, GitHub, or Twitter profiles!</div>';
        return;
      }

      list.innerHTML = data.contacts.map(function(c) {
        return buildContactCard(c, true);
      }).join('');
    } catch (e) {
      document.getElementById('contacts-list').innerHTML = '<div class="empty">Error: ' + esc(e.message) + '</div>';
    }
  }

  var searchTimeout;
  function searchContacts() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(function() {
      var q = document.getElementById('contact-search').value.trim();
      loadContacts(q || undefined);
    }, 300);
  }

  // --- Company grouping view ---
  async function loadCompanyView() {
    var container = document.getElementById('company-groups-list');
    container.innerHTML = '<div class="empty">Loading companies...</div>';
    try {
      var res = await fetch('/contacts/companies');
      var data = await res.json();
      var companies = data.companies || data || [];
      if (!Array.isArray(companies) || companies.length === 0) {
        container.innerHTML = '<div class="empty">No company data found.</div>';
        return;
      }
      container.innerHTML = companies.map(function(group, idx) {
        var companyName = group.company || 'Unknown';
        var contacts = group.contacts || [];
        var groupId = 'company-group-' + idx;
        return '<div class="company-group">' +
          '<div class="company-header" data-toggle-company="' + groupId + '">' +
            '<span class="company-name">' + esc(companyName) + ' <span class="company-count">(' + contacts.length + ' contact' + (contacts.length !== 1 ? 's' : '') + ')</span></span>' +
            '<span class="company-arrow">&#x25BC;</span>' +
          '</div>' +
          '<div class="company-body" id="' + groupId + '">' +
            contacts.map(function(c) { return buildContactCard(c, true); }).join('') +
          '</div>' +
        '</div>';
      }).join('');
    } catch (e) {
      container.innerHTML = '<div class="empty">Error loading companies: ' + esc(e.message) + '</div>';
    }
  }

  function toggleCompanyGroup(groupId, headerEl) {
    var body = document.getElementById(groupId);
    if (!body) return;
    var isHidden = body.classList.contains('hidden');
    if (isHidden) {
      body.classList.remove('hidden');
      headerEl.classList.remove('collapsed');
    } else {
      body.classList.add('hidden');
      headerEl.classList.add('collapsed');
    }
  }

  // --- Merge candidates ---
  async function loadMergeCandidates() {
    try {
      var res = await fetch('/contacts/merge-candidates');
      var data = await res.json();
      var candidates = data.candidates || data || [];
      var section = document.getElementById('merge-section');
      var list = document.getElementById('merge-candidates-list');
      if (!Array.isArray(candidates) || candidates.length === 0) {
        section.style.display = 'none';
        return;
      }
      section.style.display = 'block';
      list.innerHTML = candidates.map(function(pair) {
        var a = pair.contact_a || pair.a || {};
        var b = pair.contact_b || pair.b || {};
        return '<div class="merge-pair">' +
          '<div class="merge-contact">' +
            '<div class="mc-name">' + esc(a.name) + '</div>' +
            (a.email ? '<div class="mc-detail">' + esc(a.email) + '</div>' : '') +
            (a.company ? '<div class="mc-detail">' + esc(a.company) + '</div>' : '') +
            (a.platform ? '<div class="mc-detail" style="color:#666;">' + esc(a.platform) + '</div>' : '') +
          '</div>' +
          '<span class="merge-vs">VS</span>' +
          '<div class="merge-contact">' +
            '<div class="mc-name">' + esc(b.name) + '</div>' +
            (b.email ? '<div class="mc-detail">' + esc(b.email) + '</div>' : '') +
            (b.company ? '<div class="mc-detail">' + esc(b.company) + '</div>' : '') +
            (b.platform ? '<div class="mc-detail" style="color:#666;">' + esc(b.platform) + '</div>' : '') +
          '</div>' +
          '<button class="merge-btn" data-merge-a="' + (a.person_id || a.id || 0) + '" data-merge-b="' + (b.person_id || b.id || 0) + '">Merge</button>' +
        '</div>';
      }).join('');
    } catch (e) {
      document.getElementById('merge-section').style.display = 'none';
    }
  }

  async function mergeContacts(personIdA, personIdB) {
    if (!confirm('Merge these two contacts? This will combine their data into one record.')) return;
    try {
      await fetch('/persons/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personIdA: personIdA, personIdB: personIdB })
      });
      loadContacts();
      loadMergeCandidates();
      loadContactHealth();
    } catch (e) {
      alert('Merge failed: ' + e.message);
    }
  }
  </script>

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

    // --- Chat ---
    function askQuestion(text) {
      document.getElementById('chat-input').value = text;
      sendChat();
    }

    async function sendChat() {
      var input = document.getElementById('chat-input');
      var btn = document.getElementById('chat-send');
      var messages = document.getElementById('chat-messages');
      var text = input.value.trim();
      if (!text) return;

      // Show user message
      var userMsg = document.createElement('div');
      userMsg.className = 'chat-msg user';
      userMsg.textContent = text;
      messages.appendChild(userMsg);

      // Show thinking
      var thinking = document.createElement('div');
      thinking.className = 'chat-msg thinking';
      thinking.textContent = 'Thinking...';
      messages.appendChild(thinking);
      messages.scrollTop = messages.scrollHeight;

      input.value = '';
      btn.disabled = true;

      try {
        var res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, minutes: 15 }),
        });
        var data = await res.json();
        thinking.remove();

        var aiMsg = document.createElement('div');
        aiMsg.className = 'chat-msg assistant';
        aiMsg.textContent = data.response || data.error || 'No response';
        messages.appendChild(aiMsg);
      } catch (e) {
        thinking.remove();
        var errMsg = document.createElement('div');
        errMsg.className = 'chat-msg assistant';
        errMsg.textContent = 'Error: ' + e.message;
        messages.appendChild(errMsg);
      }

      btn.disabled = false;
      messages.scrollTop = messages.scrollHeight;
      input.focus();
    }

    refresh();
    setInterval(refresh, 3000);
  </script>
</body>
</html>`;
