// ranking.service.js — DATA_MODE mock, reads data/rankings.json (DEMO)
(function(){ "use strict";
  window.VanLangRanking = {
    DATA_MODE: (window.VANLANG_CONFIG||{}).DATA_MODE||"mock",
    load: function(){ return fetch("data/rankings.json").then(function(r){return r.json();}); }
  };
})();
