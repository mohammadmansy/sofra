(function () {
  "use strict";

  var recipes = window.RECIPES || [];
  var categories = ["فطار", "غداء", "عشاء", "حلويات"];
  var grid = document.getElementById("recipesGrid");
  var searchInput = document.getElementById("searchInput");
  var sortSelect = document.getElementById("sortSelect");
  var savedFilter = document.getElementById("savedFilter");
  var clearButton = document.getElementById("clearFilters");
  var resetButton = document.getElementById("resetEmpty");
  var emptyState = document.getElementById("emptyState");
  var emptyTitle = emptyState ? emptyState.querySelector("h2") : null;
  var emptyText = emptyState ? emptyState.querySelector("p") : null;
  var resultsCount = document.getElementById("resultsCount");
  var toolbar = document.getElementById("archiveToolbar");
  var totalCount = document.getElementById("totalCount");

  if (!grid) return;

  var params = new URLSearchParams(window.location.search);
  var initialCategory = params.get("cat");
  var state = {
    query: params.get("q") || "",
    category: categories.indexOf(initialCategory) !== -1 ? initialCategory : "all",
    favorites: params.get("fav") === "1",
    sort: ["fastest", "rating"].indexOf(params.get("sort")) !== -1 ? params.get("sort") : "default"
  };

  function countLabel(n) {
    if (n === 1) return "وصفة واحدة";
    if (n === 2) return "وصفتان";
    if (n <= 10) return n + " وصفات";
    return n + " وصفة";
  }

  function hasFilters() {
    return Boolean(state.query) || state.category !== "all" || state.favorites || state.sort !== "default";
  }

  function updateURL() {
    var next = new URL(window.location.href);
    var p = next.searchParams;
    if (state.query) p.set("q", state.query);
    else p.delete("q");
    if (state.category !== "all") p.set("cat", state.category);
    else p.delete("cat");
    if (state.favorites) p.set("fav", "1");
    else p.delete("fav");
    if (state.sort !== "default") p.set("sort", state.sort);
    else p.delete("sort");
    p.delete("focus");
    next.hash = "";
    window.history.replaceState(null, "", next.pathname + (next.search ? "?" + p.toString() : ""));
  }

  function syncControls() {
    if (searchInput) searchInput.value = state.query;
    if (sortSelect) sortSelect.value = state.sort;
    document.querySelectorAll("[data-cat]").forEach(function (chip) {
      var active = chip.getAttribute("data-cat") === state.category;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });
    if (savedFilter) {
      savedFilter.setAttribute("aria-pressed", String(state.favorites));
      savedFilter.classList.toggle("is-active", state.favorites);
    }
    if (clearButton) clearButton.hidden = !hasFilters();
  }

  function renderEmpty() {
    if (emptyTitle) {
      emptyTitle.textContent = state.favorites && !state.query && state.category === "all"
        ? "لسه مفيش وصفات محفوظة"
        : "مفيش وصفة بالشكل ده";
    }
    if (emptyText) {
      emptyText.textContent = state.favorites && !state.query && state.category === "all"
        ? "دوسي على القلب اللي على أي وصفة، وهتلاقيها هنا مرة تانية."
        : "جرّبي كلمة أبسط، أو امسحي الفلاتر وابدأي من الأول.";
    }
  }

  function render() {
    var list = window.Sufra.getFilteredRecipes(state);
    grid.innerHTML = list
      .map(function (recipe, index) {
        return window.Sufra.recipeCard(recipe, index);
      })
      .join("");

    if (emptyState) emptyState.hidden = list.length > 0;
    grid.hidden = list.length === 0;

    if (resultsCount) {
      if (!list.length) {
        resultsCount.textContent = "مفيش نتائج مطابقة";
      } else if (state.favorites) {
        resultsCount.textContent = countLabel(list.length) + " في المحفوظات";
      } else if (state.query) {
        resultsCount.textContent = countLabel(list.length) + " فيها «" + state.query + "»";
      } else {
        resultsCount.textContent = countLabel(list.length) + " جاهزة على السفرة";
      }
    }

    syncControls();
    renderEmpty();
  }

  function applyURLState() {
    updateURL();
    render();
  }

  if (totalCount) totalCount.textContent = String(recipes.length);

  document.querySelectorAll("[data-cat-count]").forEach(function (el) {
    var cat = el.getAttribute("data-cat-count");
    var n = cat === "all"
      ? recipes.length
      : recipes.filter(function (recipe) { return recipe.category === cat; }).length;
    el.textContent = String(n);
  });

  document.querySelectorAll("[data-cat]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      state.category = chip.getAttribute("data-cat");
      applyURLState();
    });
  });

  if (savedFilter) {
    savedFilter.addEventListener("click", function () {
      state.favorites = !state.favorites;
      applyURLState();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      state.sort = sortSelect.value;
      applyURLState();
    });
  }

  var searchTimer;
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.query = searchInput.value.trim();
        applyURLState();
      }, 150);
    });

    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && searchInput.value) {
        event.preventDefault();
        searchInput.value = "";
        state.query = "";
        applyURLState();
      }
    });
  }

  function resetAll() {
    state.query = "";
    state.category = "all";
    state.favorites = false;
    state.sort = "default";
    applyURLState();
  }

  if (clearButton) clearButton.addEventListener("click", resetAll);
  if (resetButton) resetButton.addEventListener("click", resetAll);

  document.addEventListener("keydown", function (event) {
    var tag = (event.target.tagName || "").toLowerCase();
    var typing = tag === "input" || tag === "textarea" || tag === "select" || event.target.isContentEditable;
    if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  });

  document.addEventListener("sufra:saved", function () {
    if (state.favorites) render();
  });

  syncControls();
  render();

  if (params.get("focus") === "search" || window.location.hash === "#search") {
    window.setTimeout(function () {
      if (toolbar) toolbar.scrollIntoView({ behavior: "smooth", block: "start" });
      if (searchInput) searchInput.focus({ preventScroll: true });
    }, 280);
  }
})();
