// vanlang-home — auth.service.js (MOCK frontend only)
// 1 USER = 1 TÀI KHOẢN VĂN LANG (account_id). Dùng chung cho homepage + game + BXH + chat.
// DATA_MODE="mock" -> demo memory + sessionStorage flag (không password/token giả, không credential)
// Sau này đổi sang ApiAuthProvider (Auth API -> Game Account Service -> DB, HttpOnly cookie)
(function(){
  "use strict";
  var cfg = window.VANLANG_CONFIG || {};
  var KEY = cfg.AUTH_DEMO_KEY || "vanlang_auth_demo";

  var MOCK_ACCOUNT = {
    account_id: 10001,
    username: "LacLong01",
    email: "laclong01@example.com",
    displayName: "Lạc Long",
    avatarSeed: "LL",
    createdAt: "2026-09-28",
    mainCharacterId: "char_axe_1"
  };
  var MOCK_CHARACTERS = [
    { charId: "char_axe_1", name: "Lạc Vệ Phong", level: 35, classId: "axe", className: "Lạc Vệ", power: 4820, rank: 128 },
    { charId: "char_bow_1", name: "Vân Ưng", level: 28, classId: "bow", className: "Lạc Vũ", power: 3610, rank: 412 },
    { charId: "char_bamboo_1", name: "Trúc Phong", level: 22, classId: "bamboo", className: "Trúc Vệ", power: 2840, rank: 890 }
  ];

  function getDemoFlag(){
    try { return sessionStorage.getItem(KEY) === "loggedInDemo"; } catch(e){ return false; }
  }
  function setDemoFlag(on){
    try { if(on) sessionStorage.setItem(KEY, "loggedInDemo"); else sessionStorage.removeItem(KEY); } catch(e){}
  }

  var AuthService = {
    DATA_MODE: (cfg.DATA_MODE || "mock"),
    isLoggedIn: function(){ return getDemoFlag(); },
    getAccount: function(){ return getDemoFlag() ? Object.assign({}, MOCK_ACCOUNT) : null; },
    getCharacters: function(){ return getDemoFlag() ? MOCK_CHARACTERS.slice() : []; },
    getMainCharacter: function(){
      if(!getDemoFlag()) return null;
      var id = MOCK_ACCOUNT.mainCharacterId;
      for(var i=0;i<MOCK_CHARACTERS.length;i++) if(MOCK_CHARACTERS[i].charId===id) return Object.assign({}, MOCK_CHARACTERS[i]);
      return Object.assign({}, MOCK_CHARACTERS[0]);
    },
    // Mock login: chỉ validate presence, không password thật, không token
    loginDemo: function(username, password){ // eslint-disable-line no-unused-vars
      if(!username || !password) return { ok:false, error:"Thiếu tên tài khoản hoặc mật khẩu" };
      setDemoFlag(true);
      window.dispatchEvent(new CustomEvent("vanlang:authchange", { detail:{ loggedIn:true }}));
      return { ok:true, account: Object.assign({}, MOCK_ACCOUNT) };
    },
    registerDemo: function(username, email, pw, pw2){
      if(!username || !email || !pw || !pw2) return { ok:false, error:"Vui lòng điền đủ thông tin" };
      if(pw !== pw2) return { ok:false, error:"Mật khẩu nhập lại không khớp" };
      if(pw.length < 6) return { ok:false, error:"Mật khẩu tối thiểu 6 ký tự" };
      setDemoFlag(true);
      window.dispatchEvent(new CustomEvent("vanlang:authchange", { detail:{ loggedIn:true }}));
      return { ok:true };
    },
    logout: function(){
      setDemoFlag(false);
      window.dispatchEvent(new CustomEvent("vanlang:authchange", { detail:{ loggedIn:false }}));
    }
  };
  window.VanLangAuth = AuthService;
})();
