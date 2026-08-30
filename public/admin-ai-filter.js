/*
 * admin-ai-filter.js — client-side search/filter for the /admin AI-check table.
 *
 * Loaded same-origin via <script src="/admin-ai-filter.js" defer> in the admin
 * page shell (functions/admin/index.ts). CSP-safe: script-src 'self' already
 * allows this external same-origin file, so no inline script is needed.
 *
 * Selectors are matched to the rendered markup in functions/admin/index.ts:
 * the input `id="ai-check-search"` and the table `id="ai-check-table"` (a
 * `.rr-table` with a `<thead>` and a `<tbody>` of one `<tr>` per check).
 *
 * Behaviour: reads the search box (#ai-check-search) and, on each input event,
 * case-insensitively shows/hides <tbody> <tr> rows of the AI-check table
 * (#ai-check-table) whose combined cell text does not contain the query. When
 * every row is hidden a "No matching checks" row is shown instead. Fully
 * dependency-free vanilla JS; guards for missing elements so it is inert on any
 * page that lacks the table or the input.
 */
(function () {
  'use strict';

  function init() {
    var input = document.getElementById('ai-check-search');
    var table = document.getElementById('ai-check-table');
    if (!input || !table) return;

    var tbody = table.querySelector('tbody');
    if (!tbody) return;

    // Build (once) a hidden "no results" row spanning all columns. It is added
    // to the tbody and toggled on when a query hides every real data row.
    var colCount =
      (table.querySelector('thead tr')
        ? table.querySelectorAll('thead tr th').length
        : 0) || 1;
    var emptyRow = document.createElement('tr');
    emptyRow.setAttribute('data-ai-check-empty', '');
    emptyRow.style.display = 'none';
    var emptyCell = document.createElement('td');
    emptyCell.colSpan = colCount;
    emptyCell.textContent = 'No matching checks';
    emptyCell.style.textAlign = 'center';
    emptyCell.style.color = '#9a9a93';
    emptyCell.style.padding = '20px 12px';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);

    function filter() {
      var query = input.value.toLowerCase().trim();
      var rows = tbody.querySelectorAll('tr');
      var visible = 0;
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row === emptyRow) continue;
        var text = (row.textContent || '').toLowerCase();
        if (query === '' || text.indexOf(query) !== -1) {
          row.style.display = '';
          visible++;
        } else {
          row.style.display = 'none';
        }
      }
      emptyRow.style.display = visible === 0 && query !== '' ? '' : 'none';
    }

    input.addEventListener('input', filter);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
