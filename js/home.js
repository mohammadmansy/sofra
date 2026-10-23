(function () {
  "use strict";

  var recipes = window.RECIPES || [];
  var picks = ["salmon", "shakshuka", "lemon-cake"];
  var picksGrid = document.getElementById("homePicks");
  var categoryGrid = document.getElementById("categoryGrid");

  function byId(id) {
    for (var i = 0; i < recipes.length; i++) {
      if (recipes[i].id === id) return recipes[i];
    }
    return null;
  }

  if (picksGrid) {
    var picked = picks.map(byId).filter(Boolean);
    picksGrid.innerHTML = picked
      .map(function (recipe, index) {
        return window.Sufra.recipeCard(recipe, index);
      })
      .join("");
  }

  if (categoryGrid) {
    var categories = [
      {
        name: "فطار",
        image: "img/pancakes.jpg",
        alt: "بان كيك بالعسل على طبق فطار"
      },
      {
        name: "غداء",
        image: "img/salad.jpg",
        alt: "سلطة خضار طازجة"
      },
      {
        name: "عشاء",
        image: "img/lemon-pasta.jpg",
        alt: "طبق باستا بالليمون"
      },
      {
        name: "حلويات",
        image: "img/lemon-cake.jpg",
        alt: "قطعة كيك ليمون بالقشطة"
      }
    ];

    categoryGrid.innerHTML = categories
      .map(function (cat) {
        var count = recipes.filter(function (recipe) {
          return recipe.category === cat.name;
        }).length;
        return (
          '<a class="category-tile reveal" href="recipes.html?cat=' + encodeURIComponent(cat.name) + '">' +
            '<img src="' + cat.image + '" alt="' + cat.alt + '" loading="lazy" width="600" height="800">' +
            '<span class="category-tile-arrow">' +
              window.Sufra.icons.arrow +
            "</span>" +
            '<div class="category-tile-body">' +
              "<strong>" + cat.name + "</strong>" +
              "<span>" + count + " وصفات</span>" +
            "</div>" +
          "</a>"
        );
      })
      .join("");

    window.Sufra.observeReveals(categoryGrid);
  }

  document.addEventListener("sufra:saved", function () {
    if (picksGrid) window.Sufra.updateSavedUI();
  });
})();
