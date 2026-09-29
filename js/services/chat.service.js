// chat.service.js — mock, no WebSocket
(function(){ "use strict";
  window.VanLangChat = {
    DATA_MODE: (window.VANLANG_CONFIG||{}).DATA_MODE||"mock",
    load: function(){ return fetch("data/community-chat.json").then(function(r){return r.json();}); }
  };
})();
