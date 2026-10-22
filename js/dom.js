export const SPRITE = 'assets/desenhos.svg';

export function el(tag, props = {}, ...filhos) {
  const no = document.createElement(tag);
  Object.entries(props).forEach(([chave, valor]) => {
    if (valor === undefined || valor === null || valor === false) return;
    if (chave === 'class') no.className = valor;
    else if (chave === 'text') no.textContent = valor;
    else if (chave === 'html') no.innerHTML = valor;
    else if (chave === 'style') no.style.cssText = valor;
    else if (chave === 'value') no.value = valor;
    else if (chave.startsWith('on')) no.addEventListener(chave.slice(2), valor);
    else no.setAttribute(chave, valor === true ? '' : valor);
  });
  filhos.flat().forEach((f) => f !== null && f !== undefined && f !== false && no.append(f));
  return no;
}

export function usoSvg(simbolo, classe = '', atributos = '') {
  const caixa = document.createElement('span');
  caixa.innerHTML = `<svg class="${classe}" aria-hidden="true" focusable="false" ${atributos}><use href="${SPRITE}#${simbolo}"/></svg>`;
  return caixa.firstElementChild;
}
