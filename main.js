/* Prancheta FC — inicialização */
(function (P) {
  const A = P.app;
  A.setup.db = P.generateDatabase(2027);
  // A tela inicial mostra os espaços de carreira salvos neste aparelho
  A.render();
  if (P.slotsInit) P.slotsInit().then(() => { if (!A.g) A.render(); });
})(window.PFC);
