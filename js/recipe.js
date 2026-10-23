(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var id = params.get("id");
  var recipe = id ? window.Sufra.findRecipe(id) : null;
  var recipePage = document.getElementById("recipePage");
  var notFound = document.getElementById("notFound");
  var content = document.getElementById("recipeContent");

  function setMeta(selector, value) {
    var el = document.querySelector(selector);
    if (el) el.setAttribute("content", value);
  }

  function setCanonical(url) {
    var el = document.querySelector('link[rel="canonical"]');
    if (el) el.setAttribute("href", url);
  }

  if (!recipe) {
    if (recipePage) recipePage.hidden = true;
    if (notFound) notFound.hidden = false;
    document.title = "الوصفة مش موجودة | سُفرة";
    setMeta('meta[name="description"]', "الوصفة اللي بتدوري عليها مش موجودة. ابدأي من كل وصفات سُفرة.");
    var robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return;
  }

  var currentServings = recipe.baseServings;
  var maxServings = Math.min(20, Math.max(recipe.baseServings * 2, 8));
  var ingredientsList = document.getElementById("ingredientsList");
  var servingsValue = document.getElementById("servingsValue");
  var servingsMinus = document.getElementById("servingsMinus");
  var servingsPlus = document.getElementById("servingsPlus");
  var metaServings = document.getElementById("metaServings");
  var stepsList = document.getElementById("stepsList");
  var relatedWrap = document.getElementById("relatedWrap");
  var relatedGrid = document.getElementById("relatedGrid");
  var saveButton = document.getElementById("saveRecipe");
  var shareBtn = document.getElementById("shareBtn");
  var printBtn = document.getElementById("printBtn");
  var cook = document.getElementById("cook");
  var cookText = document.getElementById("cookText");
  var cookStepLabel = document.getElementById("cookStepLabel");
  var cookProgress = document.getElementById("cookProgress");
  var cookDots = document.getElementById("cookDots");
  var prevStep = document.getElementById("prevStep");
  var nextStep = document.getElementById("nextStep");
  var closeCookBtn = document.getElementById("closeCook");
  var startCook = document.getElementById("startCook");
  var timerDisplay = document.getElementById("timerDisplay");
  var timerToggle = document.getElementById("timerToggle");
  var timerReset = document.getElementById("timerReset");
  var cookIndex = 0;
  var timerSeconds = 600;
  var timerInterval = null;
  var timerRunning = false;
  var lastFocus = null;

  document.title = recipe.title + " | سُفرة";
  setCanonical(window.location.origin + window.location.pathname + "?id=" + encodeURIComponent(recipe.id));
  setMeta('meta[name="description"]', recipe.description);
  setMeta('meta[property="og:title"]', recipe.title + " | سُفرة");
  setMeta('meta[property="og:description"]', recipe.description);
  setMeta('meta[property="og:url"]', window.location.href);
  setMeta('meta[property="og:image"]', new URL(recipe.image, window.location.href).href);

  var image = document.getElementById("recipeImage");
  if (image) {
    image.src = recipe.image;
    image.alt = recipe.imageAlt;
  }

  function setText(elId, value) {
    var el = document.getElementById(elId);
    if (el) el.textContent = value;
  }

  setText("crumbTitle", recipe.title);
  setText("recipeCategory", recipe.category);
  setText("recipeKicker", recipe.category + " · " + recipe.tag);
  setText("recipeTitle", recipe.title);
  setText("recipeSummary", recipe.description);
  setText("recipeRating", String(recipe.rating));
  setText("recipeReviews", "من " + recipe.reviews + " تقييم");
  setText("metaMinutes", String(recipe.minutes));
  setText("metaDifficulty", recipe.difficulty);
  setText("metaCategory", recipe.category);
  setText("recipeStory", recipe.story);
  setText("tipText", recipe.tip);
  setText("ingredientsCount", recipe.ingredients.length + " مكونات");
  setText("metaServings", window.Sufra.servingsLabel(currentServings));
  if (servingsValue) servingsValue.textContent = String(currentServings);

  if (content) content.removeAttribute("aria-busy");

  if (saveButton) {
    saveButton.setAttribute("data-save", recipe.id);
    saveButton.setAttribute("data-label", recipe.title);
  }

  function renderIngredients() {
    var factor = currentServings / recipe.baseServings;
    if (!ingredientsList) return;
    ingredientsList.innerHTML = recipe.ingredients
      .map(function (item) {
        return (
          '<label><input type="checkbox"><span class="ing-text">' +
          window.Sufra.ingredientText(item, factor) +
          "</span></label>"
        );
      })
      .join("");
  }

  function updateServings(next) {
    currentServings = Math.max(1, Math.min(maxServings, next));
    if (servingsValue) servingsValue.textContent = String(currentServings);
    if (servingsMinus) servingsMinus.disabled = currentServings <= 1;
    if (servingsPlus) servingsPlus.disabled = currentServings >= maxServings;
    setText("metaServings", window.Sufra.servingsLabel(currentServings));
    renderIngredients();
  }

  if (servingsMinus) {
    servingsMinus.addEventListener("click", function () {
      updateServings(currentServings - 1);
    });
  }

  if (servingsPlus) {
    servingsPlus.addEventListener("click", function () {
      updateServings(currentServings + 1);
    });
  }

  updateServings(currentServings);

  if (stepsList) {
    stepsList.innerHTML = recipe.steps
      .map(function (step, index) {
        var num = String(index + 1).padStart(2, "0");
        return (
          '<div class="step-card">' +
            '<span class="step-card-num">' + num + "</span>" +
            "<p>" + step + "</p>" +
          "</div>"
        );
      })
      .join("");
  }

  function buildRelated() {
    if (!relatedGrid) return;
    var sameCategory = (window.RECIPES || []).filter(function (item) {
      return item.id !== recipe.id && item.category === recipe.category;
    });
    var rest = (window.RECIPES || []).filter(function (item) {
      return item.id !== recipe.id && item.category !== recipe.category;
    });
    var related = sameCategory.concat(rest).slice(0, 3);
    relatedGrid.innerHTML = related
      .map(function (item, index) {
        return window.Sufra.recipeCard(item, index);
      })
      .join("");
    if (relatedWrap) relatedWrap.hidden = related.length === 0;
    window.Sufra.updateSavedUI();
  }

  buildRelated();

  function addJsonLd() {
    var base = window.location.origin + window.location.pathname;
    var url = base + "?id=" + encodeURIComponent(recipe.id);
    var data = {
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: recipe.title,
      description: recipe.description,
      image: [new URL(recipe.image, window.location.href).href],
      author: { "@type": "Organization", name: "سُفرة" },
      inLanguage: "ar",
      recipeCategory: recipe.category,
      recipeCuisine: "عربي",
      totalTime: "PT" + recipe.minutes + "M",
      recipeYield: String(recipe.baseServings),
      recipeIngredient: recipe.ingredients.map(function (item) {
        return window.Sufra.ingredientText(item, 1);
      }),
      recipeInstructions: recipe.steps.map(function (step) {
        return { "@type": "HowToStep", text: step };
      }),
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: String(recipe.rating),
        reviewCount: String(recipe.reviews),
        bestRating: "5"
      },
      url: url
    };
    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  addJsonLd();

  function shareRecipe() {
    var payload = {
      title: recipe.title + " | سُفرة",
      text: recipe.description,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(payload).catch(function (error) {
        if (error && error.name !== "AbortError") copyLink();
      });
    } else {
      copyLink();
    }
  }

  function copyLink() {
    var link = window.location.href;
    function done() {
      window.Sufra.toast("اتنسخ رابط الوصفة");
    }
    function failed() {
      window.Sufra.toast("انسخي الرابط من شريط العنوان");
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(done).catch(failed);
      return;
    }

    var field = document.createElement("textarea");
    field.value = link;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    try {
      document.execCommand("copy");
      done();
    } catch (error) {
      failed();
    }
    document.body.removeChild(field);
  }

  if (shareBtn) shareBtn.addEventListener("click", shareRecipe);
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

  function renderTimer() {
    var mins = Math.floor(timerSeconds / 60);
    var secs = timerSeconds % 60;
    if (timerDisplay) {
      timerDisplay.textContent = String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
    }
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerRunning = false;
    if (timerToggle) timerToggle.textContent = "ابدأ";
  }

  function resetTimer() {
    stopTimer();
    timerSeconds = 600;
    renderTimer();
  }

  function toggleTimer() {
    if (timerRunning) {
      stopTimer();
      return;
    }
    if (timerSeconds <= 0) timerSeconds = 600;
    timerRunning = true;
    if (timerToggle) timerToggle.textContent = "وقّف";
    timerInterval = setInterval(function () {
      timerSeconds -= 1;
      renderTimer();
      if (timerSeconds <= 0) {
        stopTimer();
        if (timerToggle) timerToggle.textContent = "خلص الوقت";
        window.Sufra.toast("المؤقت خلص — شيكي على الطاسة");
      }
    }, 1000);
  }

  if (timerToggle) timerToggle.addEventListener("click", toggleTimer);
  if (timerReset) timerReset.addEventListener("click", resetTimer);
  renderTimer();

  function renderCookStep() {
    if (!cookText) return;
    var total = recipe.steps.length;
    cookText.textContent = recipe.steps[cookIndex];
    if (cookStepLabel) cookStepLabel.textContent = "الخطوة " + (cookIndex + 1) + " من " + total;
    if (cookProgress) cookProgress.style.width = ((cookIndex + 1) / total) * 100 + "%";
    if (prevStep) prevStep.disabled = cookIndex === 0;
    if (nextStep) {
      nextStep.textContent = cookIndex === total - 1 ? "خلصت الطبخ" : "الخطوة التالية";
    }
    if (cookDots) {
      cookDots.innerHTML = recipe.steps
        .map(function (_, index) {
          return '<i class="' + (index === cookIndex ? "is-active" : "") + '"></i>';
        })
        .join("");
    }
  }

  function openCook() {
    if (!cook) return;
    lastFocus = document.activeElement;
    cookIndex = 0;
    renderCookStep();
    resetTimer();
    cook.classList.add("is-open");
    cook.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (typeof cook.inert === "boolean") cook.inert = false;
    ["main", "top"].forEach(function (elId) {
      var el = document.getElementById(elId);
      if (el) el.inert = true;
    });
    var footer = document.querySelector(".footer");
    if (footer) footer.inert = true;
    window.setTimeout(function () {
      if (closeCookBtn) closeCookBtn.focus();
    }, 60);
  }

  function closeCook(finished) {
    if (!cook) return;
    stopTimer();
    cook.classList.remove("is-open");
    cook.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    ["main", "top"].forEach(function (elId) {
      var el = document.getElementById(elId);
      if (el) el.inert = false;
    });
    var footer = document.querySelector(".footer");
    if (footer) footer.inert = false;
    var focusTarget = lastFocus && lastFocus !== document.body && document.contains(lastFocus) ? lastFocus : startCook;
    if (focusTarget && typeof focusTarget.focus === "function") focusTarget.focus();
    lastFocus = null;
    if (finished) window.Sufra.toast("بالهنا والشفا — صحتين وعافية");
  }

  if (startCook) startCook.addEventListener("click", openCook);
  if (closeCookBtn) closeCookBtn.addEventListener("click", function () { closeCook(false); });
  if (cook) {
    cook.addEventListener("click", function (event) {
      if (event.target === cook) closeCook(false);
    });
    cook.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCook(false);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (cookIndex < recipe.steps.length - 1) {
          cookIndex += 1;
          renderCookStep();
        }
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (cookIndex > 0) {
          cookIndex -= 1;
          renderCookStep();
        }
        return;
      }
      if (event.key === "Tab" && cook.classList.contains("is-open")) {
        var focusable = cook.querySelectorAll("button:not(:disabled)");
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  if (prevStep) {
    prevStep.addEventListener("click", function () {
      if (cookIndex > 0) {
        cookIndex -= 1;
        renderCookStep();
      }
    });
  }

  if (nextStep) {
    nextStep.addEventListener("click", function () {
      if (cookIndex < recipe.steps.length - 1) {
        cookIndex += 1;
        renderCookStep();
      } else {
        closeCook(true);
      }
    });
  }
})();
