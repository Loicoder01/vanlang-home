// community.service.js — mock
(function(){ "use strict";
  window.VanLangCommunity = {
    DATA_MODE: (window.VANLANG_CONFIG||{}).DATA_MODE||"mock",
    load: function(){ return fetch("data/community.json").then(function(r){return r.json();}); }
  };
})();
