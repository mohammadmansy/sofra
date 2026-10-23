(function () {
  "use strict";

  var STORAGE_KEY = "sofra:favorites:v2";
  var saved = new Set(load());

  var ICONS = {
    clock: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="13" r="8" stroke="currentColor" stroke-width="1.6"/><path d="M12 9v4l2.5 2M9 3h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    level: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12a8 8 0 1 0 8-8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 4v4H8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M16 5.5c1.7.3 2.8 1.6 2.8 3.2S17.7 11.7 16 12M17.5 14.4c1.7.6 2.8 2.2 3.1 4.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" fill="currentColor"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 20s-7.5-4.4-7.5-9.6A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.5 3C19.5 15.6 12 20 12 20Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5m0 0 6-6m-6 6 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.7"/><path d="m16.5 16.5 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
  };

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(saved)));
    } catch (e) {}
  }

  function findRecipe(id) {
    if (!window.RECIPES) return null;
    for (var i = 0; i < window.RECIPES.length; i++) {
      if (window.RECIPES[i].id === id) return window.RECIPES[i];
    }
    return null;
  }

  function normalize(text) {
    return String(text)
      .toLowerCase()
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[\u064B-\u0652]/g, "")
      .trim();
  }

  function ingredientText(item, factor) {
    if (item.q === null || item.q === undefined) return item.n;
    var q = item.q * factor;
    var shown = formatQty(q);
    var unit = item.u ? " " + item.u : "";
    return shown + unit + " " + item.n;
  }

  function formatQty(q) {
    var rounded = Math.round(q * 100) / 100;
    var whole = Math.floor(rounded);
    var fraction = Math.round((rounded - whole) * 100) / 100;
    var glyphs = { 0.25: "¼", 0.5: "½", 0.75: "¾", 0.33: "⅓", 0.67: "⅔" };
    if (glyphs[fraction] !== undefined) {
      if (whole === 0) return glyphs[fraction];
      return whole + glyphs[fraction];
    }
    if (fraction === 0) return String(whole);
    return String(rounded).replace(/\.0+$/, "").replace(/(\.\d)0+$/, "$1");
  }

  function servingsLabel(n) {
    if (n === 1) return "فرد واحد";
    if (n === 2) return "فردان";
    if (n <= 10) return n + " أفراد";
    return n + " فرد";
  }

  function placeholderImage() {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="#e9ecdf"/><circle cx="600" cy="430" r="165" fill="none" stroke="#81937b" stroke-width="4"/><circle cx="600" cy="430" r="112" fill="none" stroke="#bf6640" stroke-width="2" stroke-dasharray="5 10"/><path d="M600 265c32-48 92-48 113-35-13 46-56 68-92 64" fill="#81937b" opacity=".55"/><text x="600" y="444" text-anchor="middle" font-family="sans-serif" font-size="40" fill="#5e6a61">سُفرة</text></svg>';
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function useFallback(img) {
    if (img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = "1";
    img.src = placeholderImage();
  }

  document.addEventListener(
    "error",
    function (event) {
      var target = event.target;
      if (target && target.tagName === "IMG") {
        useFallback(target);
      }
    },
    true
  );

  function toast(message) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () {
      el.classList.remove("is-visible");
    }, 2600);
  }

  function updateSavedUI() {
    var count = saved.size;
    document.querySelectorAll("[data-saved-count]").forEach(function (el) {
      el.textContent = String(count);
    });
    document.querySelectorAll("[data-saved-wrap]").forEach(function (el) {
      el.classList.toggle("has-items", count > 0);
    });
    document.querySelectorAll("[data-saved-link]").forEach(function (el) {
      el.setAttribute("aria-label", count ? "الوصفات المحفوظة (" + count + ")" : "الوصفات المحفوظة");
    });

    document.querySelectorAll("[data-save]").forEach(function (button) {
      var active = saved.has(button.getAttribute("data-save"));
      button.classList.toggle("is-saved", active);
      button.setAttribute("aria-pressed", String(active));
      var label = button.querySelector(".save-label");
      if (label) {
        label.textContent = active ? "محفوظة في المفضلة" : "احفظ الوصفة";
      }
      var text = button.querySelector(".save-text");
      if (text) {
        text.textContent = active ? "محفوظة" : "احفظيها";
      }
      var baseLabel = button.getAttribute("data-label");
      if (baseLabel) {
        button.setAttribute("aria-label", active ? "إزالة " + baseLabel + " من المفضلة" : "حفظ " + baseLabel);
      }
    });
  }

  function toggleSave(id) {
    var recipe = findRecipe(id);
    if (!recipe) return;

    var nowSaved;
    if (saved.has(id)) {
      saved.delete(id);
      nowSaved = false;
      toast("تمت الإزالة من المحفوظات");
    } else {
      saved.add(id);
      nowSaved = true;
      toast("اتحفظت في المحفوظات");
    }

    persist();
    updateSavedUI();
    document.dispatchEvent(
      new CustomEvent("sufra:saved", { detail: { id: id, saved: nowSaved } })
    );
  }

  document.addEventListener("click", function (event) {
    var saveButton = event.target.closest("[data-save]");
    if (saveButton) {
      event.preventDefault();
      event.stopPropagation();
      toggleSave(saveButton.getAttribute("data-save"));
    }
  });

  var header = document.querySelector(".site-header");
  var progress = document.getElementById("scrollProgress");
  var nav = document.getElementById("nav");
  var menuBtn = document.getElementById("menuBtn");

  function closeMenu() {
    if (!header || !menuBtn) return;
    header.classList.remove("nav-open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "فتح القائمة");
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
    });
  }

  if (nav) {
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
  }

  document.addEventListener("click", function (event) {
    if (header && header.classList.contains("nav-open") && !header.contains(event.target)) {
      closeMenu();
    }
  });

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    }
    if (header) {
      header.classList.toggle("is-scrolled", y > 20);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && header && header.classList.contains("nav-open")) {
      closeMenu();
      menuBtn.focus();
    }
  });

  var searchLink = document.querySelector("[data-search-link]");
  if (searchLink) {
    searchLink.addEventListener("click", function (event) {
      var pageSearch = document.getElementById("searchInput");
      if (pageSearch) {
        event.preventDefault();
        pageSearch.focus();
        pageSearch.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  var revealObserver = null;
  if ("IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    document.querySelectorAll(".reveal").forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  function observeReveals(root) {
    if (!revealObserver) return;
    (root || document).querySelectorAll(".reveal:not(.is-in)").forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  var newsletter = document.getElementById("subscribeForm");
  if (newsletter) {
    newsletter.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = newsletter.querySelector('input[type="email"]');
      var note = newsletter.querySelector(".form-note");
      var value = input.value.trim();
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
      if (!valid) {
        if (note) {
          note.textContent = "اكتب ايميل صحيح عشان نقدر نوصلك.";
          note.classList.add("is-error");
        }
        input.focus();
        return;
      }
      if (note) {
        note.textContent = "تم الاشتراك. أول وصفة في السكة يوم الخميس.";
        note.classList.remove("is-error");
      }
      newsletter.reset();
      toast("وصلتنا! هتلاقي أول وصفة يوم الخميس");
    });
  }

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  function recipeCard(recipe, index) {
    var isSaved = saved.has(recipe.id);
    var href = "recipe.html?id=" + encodeURIComponent(recipe.id);
    var delay = 40 + (index || 0) * 55;
    return (
      '<article class="recipe-card" style="--d:' + delay + 'ms">' +
        '<a class="card-media" href="' + href + '" aria-label="افتح وصفة ' + recipe.title + '">' +
          '<img src="' + recipe.image + '" alt="' + recipe.imageAlt + '" loading="lazy" decoding="async" width="900" height="675">' +
          '<span class="card-tag">' + recipe.category + '</span>' +
        '</a>' +
        '<button class="save-toggle' + (isSaved ? " is-saved" : "") + '" type="button" data-save="' + recipe.id + '" data-label="' + recipe.title + '" aria-pressed="' + isSaved + '" aria-label="' + (isSaved ? "إزالة " + recipe.title + " من المفضلة" : "حفظ " + recipe.title) + '">' +
          ICONS.heart +
        '</button>' +
        '<div class="card-body">' +
          '<div class="card-meta"><span>' + ICONS.clock + recipe.minutes + " دقيقة</span><span>" + recipe.difficulty + "</span></div>" +
          '<h3><a href="' + href + '">' + recipe.title + "</a></h3>" +
          "<p>" + recipe.description + "</p>" +
          '<div class="card-foot">' +
            '<span class="rating">' + ICONS.star + recipe.rating + "</span>" +
            '<a class="card-open" href="' + href + '">الوصفة' + ICONS.arrow + "</a>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function getFilteredRecipes(options) {
    var list = (window.RECIPES || []).slice();
    var opts = options || {};
    if (opts.category && opts.category !== "all") {
      list = list.filter(function (r) {
        return r.category === opts.category;
      });
    }
    if (opts.favorites) {
      list = list.filter(function (r) {
        return saved.has(r.id);
      });
    }
    var q = opts.query ? normalize(opts.query) : "";
    if (q) {
      list = list.filter(function (r) {
        var haystack = normalize(
          [r.title, r.description, r.tag, r.category].concat(r.ingredients.map(function (i) { return i.n; })).join(" ")
        );
        return haystack.indexOf(q) !== -1;
      });
    }
    if (opts.sort === "fastest") {
      list.sort(function (a, b) { return a.minutes - b.minutes; });
    } else if (opts.sort === "rating") {
      list.sort(function (a, b) { return b.rating - a.rating; });
    }
    return list;
  }

  window.Sufra = {
    icons: ICONS,
    saved: saved,
    findRecipe: findRecipe,
    isSaved: function (id) { return saved.has(id); },
    toggleSave: toggleSave,
    updateSavedUI: updateSavedUI,
    toast: toast,
    normalize: normalize,
    ingredientText: ingredientText,
    formatQty: formatQty,
    servingsLabel: servingsLabel,
    placeholderImage: placeholderImage,
    recipeCard: recipeCard,
    getFilteredRecipes: getFilteredRecipes,
    observeReveals: observeReveals
  };

  updateSavedUI();
})();
