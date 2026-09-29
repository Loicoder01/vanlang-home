// vanlang-home — atlas.js
// Sprite renderer dùng art thật của ArtPack v1 (atlas.json — regions trích nguyên văn).
// Cách dùng trong HTML: <div class="sprite" data-sprite="hero_axe_male" data-h="200"></div>
// Sau DOMContentLoaded main.js gọi VANLANG_ATLAS.init() để áp background.
(function () {
  "use strict";

  var BASE = "assets/art/";

  // [x, y, w, h] — pixels, khớp atlas.json ArtPack v1.2
  var SHEETS = {
    heroes: {
      file: BASE + "nhan_vat.png", w: 1536, h: 1024,
      regions: {
        hero_axe_male:     [131, 9, 263, 491],
        hero_bow_male:     [671, 10, 230, 489],
        hero_bamboo_male:  [1150, 4, 239, 495],
        hero_axe_female:   [141, 519, 247, 489],
        hero_bow_female:   [663, 531, 243, 478],
        hero_bamboo_female:[1164, 520, 229, 490]
      }
    },
    weapons: {
      file: BASE + "vu_khi.png", w: 1536, h: 1024,
      regions: {
        weapon_axe_01:     [89, 79, 138, 246],
        weapon_axe_10:     [317, 63, 167, 254],
        weapon_axe_20:     [551, 44, 195, 279],
        weapon_axe_30:     [785, 53, 212, 271],
        weapon_axe_40:     [1056, 56, 184, 265],
        weapon_axe_50:     [1298, 20, 218, 302],
        weapon_bow_01:     [97, 344, 121, 310],
        weapon_bow_10:     [339, 345, 132, 308],
        weapon_bow_20:     [582, 345, 134, 308],
        weapon_bow_30:     [831, 341, 166, 306],
        weapon_bow_40:     [1085, 341, 148, 318],
        weapon_bow_50:     [1340, 328, 160, 338],
        weapon_bamboo_01:  [58, 671, 139, 304],
        weapon_bamboo_10:  [313, 670, 138, 307],
        weapon_bamboo_20:  [551, 666, 144, 310],
        weapon_bamboo_30:  [818, 666, 151, 314],
        weapon_bamboo_40:  [1073, 668, 142, 316],
        weapon_bamboo_50:  [1319, 666, 158, 327]
      }
    },
    npcs: {
      file: BASE + "npc.png", w: 1448, h: 1086,
      regions: {
        npc_hung_vuong: [55, 1, 248, 361],
        npc_lac_an:     [100, 366, 198, 356],
        npc_dong_lu:    [432, 369, 254, 353],
        npc_ba_may:     [810, 651, 256, 344],
        npc_son_linh:   [1167, 366, 241, 357],
        npc_van_ung:    [100, 724, 198, 359],
        npc_thanh_moc:  [467, 726, 177, 357],
        npc_song_hong:  [1183, 727, 214, 356]
      }
    }
  };

  // Áp sprite cho 1 element: background-image + size + position theo chiều cao hiển thị.
  function apply(el, defaultHeight) {
    var name = el.getAttribute("data-sprite");
    if (!name) return;
    var found = null;
    Object.keys(SHEETS).some(function (sheetKey) {
      var sheet = SHEETS[sheetKey];
      if (sheet.regions[name]) { found = { sheet: sheet, rect: sheet.regions[name] }; return true; }
      return false;
    });
    if (!found) return;
    var rect = found.rect;
    var h = parseInt(el.getAttribute("data-h") || defaultHeight || rect[3], 10);
    var scale = h / rect[3];
    el.style.width = Math.round(rect[2] * scale) + "px";
    el.style.height = h + "px";
    el.style.backgroundImage = 'url("' + found.sheet.file + '")';
    el.style.backgroundSize = Math.round(found.sheet.w * scale) + "px " + Math.round(found.sheet.h * scale) + "px";
    el.style.backgroundPosition = -Math.round(rect[0] * scale) + "px " + -Math.round(rect[1] * scale) + "px";
    el.style.backgroundRepeat = "no-repeat";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", el.getAttribute("data-alt") || name);
  }

  window.VANLANG_ATLAS = {
    SHEETS: SHEETS,
    applyOne: function (el, defaultHeight) { apply(el, defaultHeight); },
    init: function (defaultHeight) {
      var nodes = document.querySelectorAll("[data-sprite]");
      Array.prototype.forEach.call(nodes, function (el) { apply(el, defaultHeight); });
    }
  };
})();
