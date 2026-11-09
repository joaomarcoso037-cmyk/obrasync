/**
 * Bloqueia copiar texto e dar zoom no app. Campos de formulário ficam de fora:
 * sem isso, ninguém conseguiria corrigir ou colar o que digitou.
 *
 * Isso desestimula a cópia, mas não protege dados: print de tela continua possível.
 * Só o iOS exige os eventos gesture*: o Safari ignora user-scalable=no.
 */
const editavel = (alvo: EventTarget | null) => alvo instanceof Element && !!alvo.closest('input, textarea, select');

export function aplicarProtecao() {
  const bloquearForaDeCampos = (e: Event) => {
    if (!editavel(e.target)) e.preventDefault();
  };
  for (const evento of ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart']) {
    document.addEventListener(evento, bloquearForaDeCampos);
  }

  const bloquear = (e: Event) => e.preventDefault();
  for (const evento of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(evento, bloquear, { passive: false });
  }

  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault();
  });
}
