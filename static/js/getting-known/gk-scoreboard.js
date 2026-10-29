/* One made-up year of a small channel, read two ways. Views swing month to
   month; the list grows by about 300 and each month's mini launch sells about
   five of a $100 to $200 product, the speaking coach's numbers ($150 is my
   midpoint). The view counts are invented. The "feels like" line
   follows the month-over-month change of whichever scoreboard is picked. */
window.GkScoreboard = (function () {
  var VIEWS = [820, 2400, 610, 1500, 430, 3100, 900, 700, 5200, 1100, 560, 1800];
  var NEW_EMAILS = [260, 310, 290, 300, 280, 330, 300, 270, 340, 310, 290, 320];
  var SALES = [4, 6, 5, 5, 4, 6, 5, 4, 6, 5, 4, 6];
  var PRICE = 150;

  function feelViews(month) {
    var now = VIEWS[month];
    if (month === 0) return "First month. Everything feels possible.";
    var change = Math.round((now / VIEWS[month - 1] - 1) * 100);
    if (change <= -40) return "Down " + -change + "%. Talking into a void. Who is this even for?";
    if (change < 0) return "Down " + -change + "%. Doubting the thumbnail, the title, yourself.";
    if (change >= 100) return "Up " + change + "%! You're a rockstar. Until next month.";
    return "Up " + change + "%. Fine, for now.";
  }

  function init(root) {
    if (!root || root.getAttribute("data-gk-ready")) return;
    root.setAttribute("data-gk-ready", "1");
    var chart = root.querySelector("#gk-sb-chart");
    var scrub = root.querySelector("#gk-sb-scrub");
    var tabs = Array.prototype.slice.call(root.querySelectorAll("[data-gk-board]"));
    var board = "views";
    var bars = VIEWS.map(function (_, i) {
      var bar = document.createElement("span");
      bar.className = "gk-sb-bar";
      bar.innerHTML = "<i></i><b>" + "JFMAMJJASOND".charAt(i) + "</b>";
      chart.appendChild(bar);
      return bar;
    });

    function listAt(month) {
      return NEW_EMAILS.slice(0, month + 1).reduce(function (a, b) { return a + b; }, 0);
    }

    function paint() {
      var month = Number(scrub.value) - 1;
      var values = board === "views" ? VIEWS : NEW_EMAILS.map(function (_, i) { return listAt(i); });
      var max = Math.max.apply(null, values);
      bars.forEach(function (bar, i) {
        bar.firstChild.style.height = (values[i] / max * 100) + "%";
        bar.classList.toggle("is-future", i > month);
        bar.classList.toggle("is-now", i === month);
      });
      var big = root.querySelector(".gk-sb-big");
      var feel = root.querySelector(".gk-sb-feel");
      if (board === "views") {
        big.textContent = VIEWS[month].toLocaleString() + " views this month";
        feel.textContent = feelViews(month);
        return;
      }
      big.textContent = listAt(month).toLocaleString() + " on the list, $" + (SALES[month] * PRICE).toLocaleString() + " this month";
      feel.textContent = "+" + NEW_EMAILS[month] + " emails, " + SALES[month] + " sales from the mini launch. Up and to the right, every month.";
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        board = tab.getAttribute("data-gk-board");
        tabs.forEach(function (other) { other.setAttribute("aria-pressed", String(other === tab)); });
        root.classList.toggle("is-list", board === "list");
        paint();
      });
    });
    scrub.addEventListener("input", paint);
    root.querySelector("#gk-sb-tabs").hidden = false;
    root.querySelector("#gk-sb-scrub-wrap").hidden = false;
    paint();
  }

  return { init: init };
})();
