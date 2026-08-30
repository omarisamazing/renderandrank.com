(function () {
  "use strict";

  function isDetailRow(row) {
    return !!row.querySelector("td.rr-convo-cell") || !!row.querySelector("details.rr-thread");
  }

  function setupToolbar(toolbar) {
    var targetId = toolbar.getAttribute("data-target");
    if (!targetId) return;
    var table = document.getElementById(targetId);
    if (!table) return;
    var tbody = (table.tBodies && table.tBodies[0]) ? table.tBodies[0] : table;

    var allRows = Array.prototype.slice.call(tbody.rows || []);
    var primaryRows = allRows.filter(function (r) { return !isDetailRow(r); });

    var search = toolbar.querySelector("input[data-filter-search]");
    var selects = Array.prototype.slice.call(toolbar.querySelectorAll("select[data-filter-select]"));

    selects.forEach(function (sel) {
      var col = parseInt(sel.getAttribute("data-col"), 10);
      if (isNaN(col)) return;
      var seen = {};
      var values = [];
      primaryRows.forEach(function (row) {
        var cell = row.cells && row.cells[col];
        if (!cell) return;
        var v = (cell.textContent || "").trim();
        if (!v) return;
        if (!Object.prototype.hasOwnProperty.call(seen, v)) { seen[v] = true; values.push(v); }
      });
      values.sort(function (a, b) { return a.localeCompare(b); });
      values.forEach(function (v) {
        var opt = document.createElement("option");
        opt.value = v; opt.textContent = v; sel.appendChild(opt);
      });
    });

    function detailRowFor(row) {
      var next = row.nextElementSibling;
      if (next && isDetailRow(next)) return next;
      return null;
    }

    function rowMatches(row) {
      if (search && search.value) {
        var q = search.value.trim().toLowerCase();
        if (q && (row.textContent || "").toLowerCase().indexOf(q) === -1) return false;
      }
      for (var i = 0; i < selects.length; i++) {
        var sel = selects[i];
        if (!sel.value) continue;
        var col = parseInt(sel.getAttribute("data-col"), 10);
        if (isNaN(col)) continue;
        var cell = row.cells && row.cells[col];
        var v = cell ? (cell.textContent || "").trim() : "";
        if (v !== sel.value) return false;
      }
      return true;
    }

    function apply() {
      primaryRows.forEach(function (row) {
        var visible = rowMatches(row);
        row.style.display = visible ? "" : "none";
        var detail = detailRowFor(row);
        if (detail) detail.style.display = visible ? "" : "none";
      });
    }

    if (search) search.addEventListener("input", apply);
    selects.forEach(function (sel) { sel.addEventListener("change", apply); });
    apply();
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll(".rr-filter"), setupToolbar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
