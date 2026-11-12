/* Prancheta FC — inicialização */
(function (P) {
  const A = P.app;
  A.setup.db = P.generateDatabase(2027);
  // Se existir uma carreira salva neste navegador, a tela inicial oferece "Continuar"
  A.render();
})(window.PFC);
