// Progressive enhancement for /admin: rewrite each <time class="rr-time">'s
// UTC text to the viewer's LOCAL locale string using its datetime (ISO UTC)
// attribute. No-JS fallback keeps the UTC-labelled text. CSP-safe (same-origin).
(function () {
  try {
    var fmt = new Intl.DateTimeFormat(undefined, {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    var nodes = document.querySelectorAll('time.rr-time[datetime]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var d = new Date(el.getAttribute('datetime'));
      if (isNaN(d.getTime())) continue;
      el.textContent = fmt.format(d);
      el.title = d.toISOString();
    }
  } catch (e) { /* leave UTC fallback text in place */ }
})();
