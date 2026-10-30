(function () {
  'use strict';

  /* ---------- Configuração dos cadastros ---------- */
  // Para adicionar um campo, basta incluir um item em "campos".
  // coluna: true  -> aparece na tabela
  // tipo: text | email | textarea | select | moeda | numero
  var ENTIDADES = {
    clientes: {
      titulo: 'Clientes',
      singular: 'cliente',
      artigo: 'o',
      campos: [
        { id: 'nome', rotulo: 'Nome', obrigatorio: true, coluna: true, largo: true },
        { id: 'documento', rotulo: 'CPF / CNPJ', mascara: 'documento', coluna: true },
        { id: 'telefone', rotulo: 'Telefone', mascara: 'telefone', coluna: true },
        { id: 'email', rotulo: 'E-mail', tipo: 'email', coluna: true },
        { id: 'cidade', rotulo: 'Cidade', coluna: true },
        { id: 'endereco', rotulo: 'Endereço', largo: true },
        { id: 'obs', rotulo: 'Observações', tipo: 'textarea', largo: true }
      ]
    },
    fornecedores: {
      titulo: 'Fornecedores',
      singular: 'fornecedor',
      artigo: 'o',
      campos: [
        { id: 'nome', rotulo: 'Razão social / Nome', obrigatorio: true, coluna: true, largo: true },
        { id: 'documento', rotulo: 'CNPJ / CPF', mascara: 'documento', coluna: true },
        { id: 'contato', rotulo: 'Pessoa de contato', coluna: true },
        { id: 'telefone', rotulo: 'Telefone', mascara: 'telefone', coluna: true },
        { id: 'email', rotulo: 'E-mail', tipo: 'email', coluna: true },
        { id: 'endereco', rotulo: 'Endereço', largo: true },
        { id: 'obs', rotulo: 'Observações', tipo: 'textarea', largo: true }
      ]
    },
    produtos: {
      titulo: 'Produtos',
      singular: 'produto',
      artigo: 'o',
      campos: [
        { id: 'nome', rotulo: 'Nome', obrigatorio: true, coluna: true, largo: true },
        { id: 'codigo', rotulo: 'Código', coluna: true },
        { id: 'categoria', rotulo: 'Categoria', tipo: 'select', coluna: true,
          opcoes: ['Pães', 'Doces', 'Salgados', 'Bolos', 'Bebidas', 'Frios', 'Outros'] },
        { id: 'unidade', rotulo: 'Unidade', tipo: 'select',
          opcoes: ['un', 'kg', 'g', 'pct', 'cx', 'L'] },
        { id: 'custo', rotulo: 'Preço de custo (R$)', tipo: 'moeda' },
        { id: 'preco', rotulo: 'Preço de venda (R$)', tipo: 'moeda', coluna: true, numerica: true },
        { id: 'estoqueMin', rotulo: 'Estoque mínimo', tipo: 'numero' },
        { id: 'situacao', rotulo: 'Situação', tipo: 'select', coluna: true,
          opcoes: ['Ativo', 'Inativo'], padrao: 'Ativo' },
        { id: 'obs', rotulo: 'Observações', tipo: 'textarea', largo: true }
      ]
    }
  };

  /* ---------- Estado ---------- */
  var abaAtual = 'clientes';
  var editandoId = null;

  /* ---------- Elementos ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var el = {
    abas: $('abas'),
    titulo: $('lista-titulo'),
    etiqueta: $('lista-etiqueta'),
    busca: $('busca'),
    btnNovo: $('btn-novo'),
    cabecalho: $('tabela-cabecalho'),
    corpo: $('tabela-corpo'),
    vazio: $('vazio'),
    modal: $('modal'),
    modalTitulo: $('modal-titulo'),
    form: $('form-cadastro'),
    campos: $('campos'),
    erro: $('form-erro'),
    aviso: $('aviso')
  };

  /* ---------- Acesso ao banco (Supabase) ---------- */
  // Preencha com os dados do seu projeto: Supabase > Project Settings > API Keys
  var SUPABASE_URL = 'https://atgvbqhyqfdgibojietm.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_Y6XLW7WSJdl64_2guaLzFA_MvDcOrQm';

  var cache = { clientes: [], fornecedores: [], produtos: [] };

  function carregar(tipo) {
    return cache[tipo] || [];
  }

  // Linha do banco -> objeto plano usado pela tela
  function paraRegistro(linha) {
    var d = linha.dados || {};
    d.id = linha.id;
    d.criadoEm = linha.criado_em;
    d.atualizadoEm = linha.atualizado_em;
    return d;
  }

  function semControle(dados) {
    var limpo = {};
    Object.keys(dados).forEach(function (k) {
      if (k !== 'id' && k !== 'criadoEm' && k !== 'atualizadoEm') limpo[k] = dados[k];
    });
    return limpo;
  }

  // Mantém a mesma interface de antes: api('GET', 'clientes'), api('PUT', 'clientes/3', dados)...
  function api(metodo, caminho, corpo) {
    if (SUPABASE_URL.indexOf('SEU-PROJETO') !== -1) {
      return Promise.reject(new Error('Configure SUPABASE_URL e SUPABASE_KEY no cadastros.js.'));
    }
    var partes = caminho.split('/');
    var tipo = partes[0];
    var id = partes[1];
    var url = SUPABASE_URL + '/rest/v1/registros';
    var opcoes = { method: metodo, headers: { apikey: SUPABASE_KEY } };
    // Chaves antigas (JWT, começam com "eyJ") também vão no Authorization; as novas (sb_publishable_...) não.
    if (SUPABASE_KEY.indexOf('sb_') !== 0) opcoes.headers['Authorization'] = 'Bearer ' + SUPABASE_KEY;

    if (metodo === 'GET') {
      url += '?select=*&order=id&tipo=eq.' + encodeURIComponent(tipo);
    } else if (metodo === 'POST') {
      opcoes.headers['Content-Type'] = 'application/json';
      opcoes.headers['Prefer'] = 'return=representation';
      opcoes.body = JSON.stringify({ tipo: tipo, dados: semControle(corpo) });
    } else if (metodo === 'PUT') {
      url += '?id=eq.' + encodeURIComponent(id) + '&tipo=eq.' + encodeURIComponent(tipo);
      opcoes.method = 'PATCH';
      opcoes.headers['Content-Type'] = 'application/json';
      opcoes.headers['Prefer'] = 'return=representation';
      opcoes.body = JSON.stringify({ dados: semControle(corpo), atualizado_em: new Date().toISOString() });
    } else if (metodo === 'DELETE') {
      url += '?id=eq.' + encodeURIComponent(id) + '&tipo=eq.' + encodeURIComponent(tipo);
    }

    return fetch(url, opcoes).then(function (resp) {
      return resp.json().catch(function () { return null; }).then(function (dados) {
        if (!resp.ok) throw new Error((dados && dados.message) || 'Erro ao falar com o banco de dados.');
        return metodo === 'GET' ? (dados || []).map(paraRegistro) : dados;
      });
    });
  }

  function recarregar(tipo) {
    return api('GET', tipo).then(function (lista) {
      cache[tipo] = Array.isArray(lista) ? lista : [];
    });
  }

  /* ---------- Formatação e máscaras ---------- */
  function soDigitos(v) { return String(v || '').replace(/\D/g, ''); }

  function mascaraDocumento(v) {
    var d = soDigitos(v).slice(0, 14);
    if (d.length <= 11) {
      return d
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
    }
    return d
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  function mascaraTelefone(v) {
    var d = soDigitos(v).slice(0, 11);
    if (d.length <= 10) {
      return d
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return d
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  }

  var MASCARAS = { documento: mascaraDocumento, telefone: mascaraTelefone };

  function moeda(v) {
    var n = parseFloat(v);
    if (isNaN(n)) return '—';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function valorCelula(campo, registro) {
    var v = registro[campo.id];
    if (campo.tipo === 'moeda') return escapar(moeda(v));
    if (campo.id === 'situacao') {
      var ativo = v !== 'Inativo';
      return '<span class="selo ' + (ativo ? 'ativo' : 'inativo') + '">' + (ativo ? 'Ativo' : 'Inativo') + '</span>';
    }
    return v ? escapar(v) : '—';
  }

  /* ---------- Documento (CPF/CNPJ) ---------- */
  function cpfValido(d) {
    if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    for (var t = 9; t < 11; t++) {
      var soma = 0;
      for (var i = 0; i < t; i++) soma += parseInt(d[i], 10) * (t + 1 - i);
      var dv = ((soma * 10) % 11) % 10;
      if (dv !== parseInt(d[t], 10)) return false;
    }
    return true;
  }

  function cnpjValido(d) {
    if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
    var pesos = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for (var t = 12; t < 14; t++) {
      var soma = 0;
      for (var i = 0; i < t; i++) soma += parseInt(d[i], 10) * pesos[i + (13 - t)];
      var dv = soma % 11 < 2 ? 0 : 11 - (soma % 11);
      if (dv !== parseInt(d[t], 10)) return false;
    }
    return true;
  }

  function documentoValido(v) {
    var d = soDigitos(v);
    if (!d) return true; // campo opcional
    return d.length === 11 ? cpfValido(d) : cnpjValido(d);
  }

  /* ---------- Abas ---------- */
  function trocarAba(tipo) {
    if (!ENTIDADES[tipo]) tipo = 'clientes';
    abaAtual = tipo;
    var botoes = el.abas.querySelectorAll('.aba');
    for (var i = 0; i < botoes.length; i++) {
      var ativa = botoes[i].getAttribute('data-aba') === tipo;
      botoes[i].classList.toggle('ativa', ativa);
      botoes[i].setAttribute('aria-selected', ativa ? 'true' : 'false');
    }
    var cfg = ENTIDADES[tipo];
    el.titulo.textContent = cfg.titulo;
    el.etiqueta.textContent = 'Cadastro';
    el.btnNovo.textContent = '+ Novo ' + cfg.singular;
    el.busca.value = '';
    if (location.hash !== '#' + tipo) history.replaceState(null, '', '#' + tipo);
    desenharCabecalho();
    desenharLista();
  }

  /* ---------- Tabela ---------- */
  function colunas() {
    return ENTIDADES[abaAtual].campos.filter(function (c) { return c.coluna; });
  }

  function desenharCabecalho() {
    var html = '<tr>';
    colunas().forEach(function (c) {
      html += '<th' + (c.numerica ? ' class="num"' : '') + '>' + escapar(c.rotulo) + '</th>';
    });
    html += '<th class="col-acoes"><span class="sr-only">Ações</span></th></tr>';
    el.cabecalho.innerHTML = html;
  }

  function desenharContagens() {
    Object.keys(ENTIDADES).forEach(function (tipo) {
      $('cont-' + tipo).textContent = carregar(tipo).length;
    });
  }

  function desenharLista() {
    var cfg = ENTIDADES[abaAtual];
    var termo = el.busca.value.trim().toLowerCase();
    var termoDigitos = soDigitos(termo);
    var lista = carregar(abaAtual);

    var filtrada = lista.filter(function (r) {
      if (!termo) return true;
      return cfg.campos.some(function (c) {
        var v = String(r[c.id] == null ? '' : r[c.id]).toLowerCase();
        if (v.indexOf(termo) !== -1) return true;
        return termoDigitos && soDigitos(v).indexOf(termoDigitos) !== -1;
      });
    });

    filtrada.sort(function (a, b) {
      return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR');
    });

    var cols = colunas();
    var html = '';
    filtrada.forEach(function (r) {
      html += '<tr>';
      cols.forEach(function (c) {
        html += '<td' + (c.numerica ? ' class="num"' : '') + '>' + valorCelula(c, r) + '</td>';
      });
      html += '<td class="col-acoes">' +
        '<button type="button" class="botao-mini" data-acao="editar" data-id="' + escapar(r.id) + '">Editar</button>' +
        '<button type="button" class="botao-mini perigo" data-acao="excluir" data-id="' + escapar(r.id) + '">Excluir</button>' +
        '</td></tr>';
    });
    el.corpo.innerHTML = html;

    if (filtrada.length === 0) {
      el.vazio.hidden = false;
      el.vazio.textContent = lista.length === 0
        ? 'Nenhum ' + cfg.singular + ' cadastrado. Use o botão "Novo ' + cfg.singular + '" para começar.'
        : 'Nenhum resultado para "' + el.busca.value.trim() + '".';
    } else {
      el.vazio.hidden = true;
    }

    desenharContagens();
  }

  /* ---------- Formulário ---------- */
  function criarCampo(campo, valor) {
    var wrap = document.createElement('div');
    wrap.className = 'campo' + (campo.largo ? ' largo' : '');
    wrap.setAttribute('data-campo', campo.id);

    var label = document.createElement('label');
    label.setAttribute('for', 'f-' + campo.id);
    label.textContent = campo.rotulo;
    if (campo.obrigatorio) {
      var ast = document.createElement('span');
      ast.className = 'obrigatorio';
      ast.textContent = ' *';
      label.appendChild(ast);
    }
    wrap.appendChild(label);

    var input;
    if (campo.tipo === 'textarea') {
      input = document.createElement('textarea');
    } else if (campo.tipo === 'select') {
      input = document.createElement('select');
      var vazio = document.createElement('option');
      vazio.value = '';
      vazio.textContent = 'Selecione';
      input.appendChild(vazio);
      campo.opcoes.forEach(function (o) {
        var op = document.createElement('option');
        op.value = o;
        op.textContent = o;
        input.appendChild(op);
      });
    } else {
      input = document.createElement('input');
      if (campo.tipo === 'email') {
        input.type = 'email';
      } else if (campo.tipo === 'moeda') {
        input.type = 'number';
        input.step = '0.01';
        input.min = '0';
        input.inputMode = 'decimal';
      } else if (campo.tipo === 'numero') {
        input.type = 'number';
        input.step = '1';
        input.min = '0';
        input.inputMode = 'numeric';
      } else {
        input.type = 'text';
      }
    }

    input.id = 'f-' + campo.id;
    input.name = campo.id;
    if (campo.mascara) {
      input.addEventListener('input', function () {
        input.value = MASCARAS[campo.mascara](input.value);
      });
      input.inputMode = 'numeric';
    }

    var inicial = valor != null ? valor : (campo.padrao || '');
    input.value = campo.mascara ? MASCARAS[campo.mascara](inicial) : inicial;

    wrap.appendChild(input);
    return wrap;
  }

  function abrirFormulario(id) {
    var cfg = ENTIDADES[abaAtual];
    editandoId = id || null;
    var registro = id
      ? carregar(abaAtual).filter(function (r) { return String(r.id) === String(id); })[0]
      : null;

    if (id && !registro) { editandoId = null; }

    el.modalTitulo.textContent = (editandoId ? 'Editar ' : 'Novo ') + cfg.singular;
    el.campos.innerHTML = '';
    el.erro.textContent = '';
    cfg.campos.forEach(function (c) {
      el.campos.appendChild(criarCampo(c, registro ? registro[c.id] : null));
    });

    if (typeof el.modal.showModal === 'function') {
      el.modal.showModal();
    } else {
      el.modal.setAttribute('open', '');
    }
    var primeiro = el.campos.querySelector('input, select, textarea');
    if (primeiro) primeiro.focus();
  }

  function fecharFormulario() {
    if (typeof el.modal.close === 'function') el.modal.close();
    else el.modal.removeAttribute('open');
    editandoId = null;
  }

  function lerFormulario() {
    var dados = {};
    ENTIDADES[abaAtual].campos.forEach(function (c) {
      var campo = $('f-' + c.id);
      dados[c.id] = campo ? campo.value.trim() : '';
    });
    return dados;
  }

  function validar(dados) {
    var cfg = ENTIDADES[abaAtual];
    var invalidos = [];
    var mensagem = '';

    cfg.campos.forEach(function (c) {
      var ruim = false;
      var v = dados[c.id];
      if (c.obrigatorio && !v) {
        ruim = true;
        mensagem = mensagem || 'Preencha o campo "' + c.rotulo + '".';
      } else if (c.mascara === 'documento' && !documentoValido(v)) {
        ruim = true;
        mensagem = mensagem || 'CPF ou CNPJ inválido. Confira os números.';
      } else if (c.tipo === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        ruim = true;
        mensagem = mensagem || 'E-mail inválido. Use o formato nome@dominio.com.';
      } else if ((c.tipo === 'moeda' || c.tipo === 'numero') && v && (isNaN(parseFloat(v)) || parseFloat(v) < 0)) {
        ruim = true;
        mensagem = mensagem || 'O campo "' + c.rotulo + '" deve ser um número maior ou igual a zero.';
      }
      var wrap = el.campos.querySelector('[data-campo="' + c.id + '"]');
      if (wrap) wrap.classList.toggle('invalido', ruim);
      if (ruim) invalidos.push(c.id);
    });

    // Evita documento duplicado dentro do mesmo cadastro
    if (!invalidos.length && dados.documento) {
      var d = soDigitos(dados.documento);
      var duplicado = carregar(abaAtual).some(function (r) {
        return String(r.id) !== String(editandoId) && soDigitos(r.documento) === d;
      });
      if (duplicado) {
        invalidos.push('documento');
        mensagem = 'Já existe um ' + cfg.singular + ' com este documento.';
        var w = el.campos.querySelector('[data-campo="documento"]');
        if (w) w.classList.add('invalido');
      }
    }

    el.erro.textContent = mensagem;
    if (invalidos.length) {
      var foco = $('f-' + invalidos[0]);
      if (foco) foco.focus();
    }
    return invalidos.length === 0;
  }

  function aoEnviar(ev) {
    ev.preventDefault();
    var dados = lerFormulario();
    if (!validar(dados)) return;

    var tipo = abaAtual;
    var cfg = ENTIDADES[tipo];
    var editou = !!editandoId;
    var requisicao = editou
      ? api('PUT', tipo + '/' + editandoId, dados)
      : api('POST', tipo, dados);

    requisicao
      .then(function () { return recarregar(tipo); })
      .then(function () {
        fecharFormulario();
        desenharLista();
        mostrarAviso(cfg.singular.charAt(0).toUpperCase() + cfg.singular.slice(1) +
          (editou ? ' atualizado.' : ' cadastrado.'));
      })
      .catch(function (e) { el.erro.textContent = e.message; });
  }

  function excluir(id) {
    var tipo = abaAtual;
    var cfg = ENTIDADES[tipo];
    var item = carregar(tipo).filter(function (r) { return String(r.id) === String(id); })[0];
    if (!item) return;
    if (!confirm('Excluir ' + cfg.singular + ' "' + (item.nome || '') + '"? Essa ação não pode ser desfeita.')) return;

    api('DELETE', tipo + '/' + id)
      .then(function () { return recarregar(tipo); })
      .then(function () {
        desenharLista();
        mostrarAviso(cfg.singular.charAt(0).toUpperCase() + cfg.singular.slice(1) + ' excluído.');
      })
      .catch(function (e) { mostrarAviso(e.message); });
  }

  /* ---------- Aviso ---------- */
  var temporizador = null;
  function mostrarAviso(texto) {
    el.aviso.textContent = texto;
    el.aviso.classList.add('visivel');
    clearTimeout(temporizador);
    temporizador = setTimeout(function () {
      el.aviso.classList.remove('visivel');
    }, 2800);
  }

  /* ---------- Eventos ---------- */
  el.abas.addEventListener('click', function (ev) {
    var botao = ev.target.closest('.aba');
    if (botao) trocarAba(botao.getAttribute('data-aba'));
  });

  el.busca.addEventListener('input', desenharLista);
  el.btnNovo.addEventListener('click', function () { abrirFormulario(null); });

  el.corpo.addEventListener('click', function (ev) {
    var botao = ev.target.closest('button[data-acao]');
    if (!botao) return;
    var id = botao.getAttribute('data-id');
    if (botao.getAttribute('data-acao') === 'editar') abrirFormulario(id);
    else excluir(id);
  });

  el.form.addEventListener('submit', aoEnviar);
  $('btn-cancelar').addEventListener('click', fecharFormulario);
  $('modal-fechar').addEventListener('click', fecharFormulario);
  el.modal.addEventListener('cancel', function () { editandoId = null; });

  window.addEventListener('hashchange', function () {
    var tipo = location.hash.replace('#', '');
    if (ENTIDADES[tipo] && tipo !== abaAtual) trocarAba(tipo);
  });

  /* ---------- Início ---------- */
  var inicial = location.hash.replace('#', '');
  trocarAba(ENTIDADES[inicial] ? inicial : 'clientes');

  Promise.all(Object.keys(ENTIDADES).map(recarregar))
    .then(desenharLista)
    .catch(function () {
      mostrarAviso('Não foi possível carregar os dados. Confira a configuração do banco.');
    });
})();