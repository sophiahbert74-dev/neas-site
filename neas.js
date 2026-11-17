/* Renderizador do site do NEAS: monta a página a partir do <template id="neas-tpl">
   e da classe Component, e atualiza só o que muda (morphdom). */
(function () {
  var handlers = [];
  var comp, raiz, tpl, pendente = false;
  function look(ctx, path) {
    return path.trim().split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, ctx);
  }
  function preencher(s, ctx) {
    return s.replace(/\{\{([^}]+)\}\}/g, function (m, p) {
      var v = look(ctx, p);
      return typeof v === 'function' ? '' : (v == null ? '' : String(v));
    });
  }
  function expandir(node, ctx) {
    Array.prototype.slice.call(node.childNodes).forEach(function (c) {
      if (c.nodeType === 3) { if (c.textContent.indexOf('{{') > -1) c.textContent = preencher(c.textContent, ctx); return; }
      if (c.nodeType !== 1) return;
      var tag = c.tagName.toLowerCase();
      if (tag === 'sc-for') {
        var lista = look(ctx, c.getAttribute('list').replace(/[{}]/g, '')) || [];
        var as = c.getAttribute('as');
        var frag = document.createDocumentFragment();
        lista.forEach(function (item) {
          var cl = c.cloneNode(true);
          var sub = Object.assign({}, ctx); sub[as] = item;
          expandir(cl, sub);
          while (cl.firstChild) frag.appendChild(cl.firstChild);
        });
        c.parentNode.replaceChild(frag, c);
        return;
      }
      if (tag === 'sc-if') {
        var v = look(ctx, c.getAttribute('value').replace(/[{}]/g, ''));
        if (!v) { c.parentNode.removeChild(c); return; }
        expandir(c, ctx);
        var f2 = document.createDocumentFragment();
        while (c.firstChild) f2.appendChild(c.firstChild);
        c.parentNode.replaceChild(f2, c);
        return;
      }
      Array.prototype.slice.call(c.attributes).forEach(function (a) {
        if (/^on[a-z]+$/i.test(a.name)) {
          var fn = look(ctx, a.value.replace(/[{}]/g, ''));
          c.removeAttribute(a.name);
          if (typeof fn === 'function') { handlers.push(fn); c.setAttribute('data-neas-' + a.name.slice(2).toLowerCase(), String(handlers.length - 1)); }
        } else if (a.value.indexOf('{{') > -1) {
          c.setAttribute(a.name, preencher(a.value, ctx));
        }
      });
      expandir(c, ctx);
    });
  }
  function render() {
    pendente = false;
    handlers = [];
    var frag = tpl.content.cloneNode(true);
    expandir(frag, comp.renderVals());
    var novo = document.createElement('div');
    novo.appendChild(frag);
    window.morphdom(raiz, novo, { childrenOnly: true });
  }
  function agendar() { if (!pendente) { pendente = true; requestAnimationFrame(render); } }
  function DCLogic() { this.state = {}; }
  DCLogic.prototype.setState = function (p) {
    Object.assign(this.state, typeof p === 'function' ? p(this.state) : p);
    agendar();
  };
  window.DCLogic = DCLogic;
  function disparar(tipo, e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-neas-' + tipo + ']') : null;
    if (!el) return;
    var fn = handlers[+el.getAttribute('data-neas-' + tipo)];
    if (fn) fn({ currentTarget: el, target: e.target, preventDefault: function () { e.preventDefault(); } });
  }
  document.addEventListener('click', function (e) { disparar('click', e); });
  document.addEventListener('scroll', function (e) { if (e.target && e.target.nodeType === 1) disparar('scroll', e); }, true);
  document.addEventListener('DOMContentLoaded', function () {
    tpl = document.getElementById('neas-tpl');
    raiz = document.getElementById('neas-app');
    comp = new window.NEASComponent();
    render();
    if (comp.componentDidMount) comp.componentDidMount();
    if (location.hash) { var alvo = document.getElementById(location.hash.slice(1)); if (alvo) setTimeout(function () { alvo.scrollIntoView(); }, 50); }
  });
})();
