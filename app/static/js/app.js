// Lógica do Sistema PDV Bella Forneria '98
// Paleta: Primária: #DC2626 | Secundária: #F59E0B | Terciária: #16A34A | Neutra: #161315
const App = {
    state: {
        caixa: null,
        produtos: [],
        categorias: [],
        categoriaAtiva: 'Todos',
        carrinho: [],
        clienteAtual: null,
        pedidos: [],
        bairros: [],
        tipoEntrega: 'BALCAO', // BALCAO, MESA, DELIVERY
        bairroSelecionado: 'Centro',
        taxaEntrega: 0.0,
        formaPagamento: 'DINHEIRO',
        valorRecebido: 0,
        troco: 0,
        buscaTermo: '',
        tabAtiva: 'pdv', // pdv, kds, delivery, caixa, clientes
        // Personalização de Pizza
        pizzaEmEdicao: null,
        tamanhoSelecionado: 'GRANDE',
        bordaSelecionada: 'Tradicional (Sem recheio)',
        adicionaisSelecionados: [],
        observacaoItem: ''
    },

    init: async function() {
        await this.carregarCaixa();
        await this.carregarProdutos();
        await this.carregarBairros();
        await this.carregarPedidos();
        this.configurarAtalhosTeclado();
        this.configurarMascaras();
        this.iniciarAutoRefresh();
        this.render();
    },

    // Máscaras de entrada em tempo real para Telefone e CPF
    configurarMascaras: function() {
        // Função utilitária de máscara de telefone: (11) 4002-8922 ou (11) 98765-4321
        window.mascaraTelefone = function(el) {
            let v = el.value.replace(/\D/g, '');
            if (v.length > 11) v = v.substring(0, 11);

            if (v.length > 6) {
                if (v.length <= 10) {
                    el.value = `(${v.substring(0, 2)}) ${v.substring(2, 6)}-${v.substring(6)}`;
                } else {
                    el.value = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
                }
            } else if (v.length > 2) {
                el.value = `(${v.substring(0, 2)}) ${v.substring(2)}`;
            } else if (v.length > 0) {
                el.value = `(${v}`;
            } else {
                el.value = '';
            }
        };

        // Função utilitária de máscara de CPF: 000.000.000-00
        window.mascaraCPF = function(el) {
            let v = el.value.replace(/\D/g, '');
            if (v.length > 11) v = v.substring(0, 11);

            if (v.length > 9) {
                el.value = `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6, 9)}-${v.substring(9)}`;
            } else if (v.length > 6) {
                el.value = `${v.substring(0, 3)}.${v.substring(3, 6)}.${v.substring(6)}`;
            } else if (v.length > 3) {
                el.value = `${v.substring(0, 3)}.${v.substring(3)}`;
            } else {
                el.value = v;
            }
        };
    },

    iniciarAutoRefresh: function() {
        setInterval(async () => {
            if (['kds', 'delivery', 'caixa'].includes(this.state.tabAtiva)) {
                await this.carregarPedidos(false);
                if (this.state.tabAtiva === 'caixa') await this.carregarCaixa(false);
                this.render();
            }
        }, 5000);
    },

    configurarAtalhosTeclado: function() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                if (this.state.carrinho.length > 0) this.abrirModalPagamento();
            }
            if (e.key === 'F4') {
                e.preventDefault();
                this.limparCarrinho();
            }
            if (e.key === 'F7') {
                e.preventDefault();
                this.abrirModalCliente();
            }
            if (e.key === 'F9') {
                e.preventDefault();
                this.simularDelivery('IFOOD');
            }
            if (e.key === 'Escape') {
                this.fecharModais();
            }
        });
    },

    carregarCaixa: async function(renderApos = true) {
        try {
            const res = await fetch('/api/caixa/atual');
            this.state.caixa = await res.json();
            if (renderApos) this.render();
        } catch (err) {
            console.error("Erro ao carregar caixa:", err);
        }
    },

    carregarProdutos: async function() {
        try {
            const res = await fetch('/api/produtos');
            this.state.produtos = await res.json();
            const cats = ['Todos', ...new Set(this.state.produtos.map(p => p.categoria))];
            this.state.categorias = cats;
        } catch (err) {
            console.error("Erro ao carregar produtos:", err);
        }
    },

    carregarBairros: async function() {
        try {
            const res = await fetch('/api/frete/bairros');
            this.state.bairros = await res.json();
        } catch (err) {
            console.error("Erro ao carregar frete:", err);
        }
    },

    carregarPedidos: async function(renderApos = true) {
        try {
            const res = await fetch('/api/pedidos');
            this.state.pedidos = await res.json();
            if (renderApos) this.render();
        } catch (err) {
            console.error("Erro ao carregar pedidos:", err);
        }
    },

    clicarProduto: function(produtoId) {
        const prod = this.state.produtos.find(p => p.id === produtoId);
        if (!prod) return;

        if (prod.estoque <= 0) {
            alert(`[ESTOQUE ZERADO] A pizza "${prod.nome}" não possui estoque no momento!`);
            return;
        }

        if (prod.categoria.includes('Pizzas')) {
            this.abrirModalPersonalizarPizza(prod);
        } else {
            this.adicionarItemDireto(prod);
        }
    },

    abrirModalPersonalizarPizza: function(prod) {
        this.state.pizzaEmEdicao = prod;
        this.state.tamanhoSelecionado = 'GRANDE';
        this.state.bordaSelecionada = 'Tradicional (Sem recheio)';
        this.state.adicionaisSelecionados = [];

        document.getElementById('modal-pizza-nome').innerText = prod.nome;
        document.getElementById('modal-pizza-img').src = prod.imagem_url;
        document.getElementById('modal-pizza-desc').innerText = prod.descricao;

        this.renderOpcoesPersonalizacao();
        document.getElementById('modal-customizar-pizza').classList.remove('hidden');
    },

    renderOpcoesPersonalizacao: function() {
        const basePreco = this.state.pizzaEmEdicao.preco;
        let fatorTamanho = 1.0;
        if (this.state.tamanhoSelecionado === 'BROTO') fatorTamanho = 0.65;
        if (this.state.tamanhoSelecionado === 'MEDIA') fatorTamanho = 0.85;
        if (this.state.tamanhoSelecionado === 'GIGANTE') fatorTamanho = 1.25;

        let valorBorda = 0;
        if (this.state.bordaSelecionada.includes('Catupiry')) valorBorda = 12.00;
        if (this.state.bordaSelecionada.includes('Cheddar')) valorBorda = 10.00;
        if (this.state.bordaSelecionada.includes('Chocolate')) valorBorda = 14.00;
        if (this.state.bordaSelecionada.includes('Vulcão')) valorBorda = 16.00;

        let valorAdicionais = this.state.adicionaisSelecionados.reduce((acc, ad) => acc + ad.preco, 0);
        const totalCalc = (basePreco * fatorTamanho) + valorBorda + valorAdicionais;

        document.getElementById('modal-pizza-preco-total').innerText = `R$ ${totalCalc.toFixed(2)}`;
    },

    selecionarTamanhoPizza: function(tam) {
        this.state.tamanhoSelecionado = tam;
        document.querySelectorAll('.btn-tamanho-pizza').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`tam-${tam}`);
        if (btn) btn.classList.add('active');
        this.renderOpcoesPersonalizacao();
    },

    selecionarBordaPizza: function(borda) {
        this.state.bordaSelecionada = borda;
        this.renderOpcoesPersonalizacao();
    },

    toggleAdicional: function(nome, preco) {
        const idx = this.state.adicionaisSelecionados.findIndex(a => a.nome === nome);
        if (idx >= 0) {
            this.state.adicionaisSelecionados.splice(idx, 1);
        } else {
            this.state.adicionaisSelecionados.push({ nome, preco });
        }
        this.renderOpcoesPersonalizacao();
    },

    confirmarPizzaCustomizada: function() {
        const prod = this.state.pizzaEmEdicao;
        let fatorTamanho = 1.0;
        if (this.state.tamanhoSelecionado === 'BROTO') fatorTamanho = 0.65;
        if (this.state.tamanhoSelecionado === 'MEDIA') fatorTamanho = 0.85;
        if (this.state.tamanhoSelecionado === 'GIGANTE') fatorTamanho = 1.25;

        let valorBorda = 0;
        if (this.state.bordaSelecionada.includes('Catupiry')) valorBorda = 12.00;
        if (this.state.bordaSelecionada.includes('Cheddar')) valorBorda = 10.00;
        if (this.state.bordaSelecionada.includes('Chocolate')) valorBorda = 14.00;
        if (this.state.bordaSelecionada.includes('Vulcão')) valorBorda = 16.00;

        const valorAdicionais = this.state.adicionaisSelecionados.reduce((acc, ad) => acc + ad.preco, 0);
        const precoCalculado = (prod.preco * fatorTamanho) + valorBorda + valorAdicionais;
        const obs = document.getElementById('modal-pizza-obs').value.trim();

        this.state.carrinho.push({
            id: prod.id,
            nome: `${prod.nome} [${this.state.tamanhoSelecionado}]`,
            preco: precoCalculado,
            categoria: prod.categoria,
            quantidade: 1,
            detalhes: {
                tamanho: this.state.tamanhoSelecionado,
                borda: this.state.bordaSelecionada,
                adicionais: this.state.adicionaisSelecionados.map(a => a.nome),
                observacao: obs
            }
        });
        this.fecharModais();
        this.render();
    },

    adicionarItemDireto: function(prod) {
        const existente = this.state.carrinho.find(i => i.id === prod.id && !i.detalhes);
        if (existente) {
            if (existente.quantidade >= prod.estoque) {
                alert(`[ESTOQUE MÁXIMO] Quantidade máxima permitida: ${prod.estoque}`);
                return;
            }
            existente.quantidade += 1;
        } else {
            this.state.carrinho.push({
                id: prod.id,
                nome: prod.nome,
                preco: prod.preco,
                categoria: prod.categoria,
                quantidade: 1
            });
        }
        this.render();
    },

    alterarQuantidade: function(index, delta) {
        const item = this.state.carrinho[index];
        if (!item) return;
        const prod = this.state.produtos.find(p => p.id === item.id);

        item.quantidade += delta;
        if (item.quantidade <= 0) {
            this.state.carrinho.splice(index, 1);
        } else if (prod && item.quantidade > prod.estoque) {
            item.quantidade = prod.estoque;
            alert(`Estoque máximo: ${prod.estoque}`);
        }
        this.render();
    },

    removerDoCarrinho: function(index) {
        this.state.carrinho.splice(index, 1);
        this.render();
    },

    limparCarrinho: function() {
        if (this.state.carrinho.length === 0) return;
        if (confirm("CONFIRMAÇÃO: Deseja realmente cancelar e limpar todos os itens da comanda?")) {
            this.state.carrinho = [];
            this.state.clienteAtual = null;
            this.state.taxaEntrega = 0;
            this.state.tipoEntrega = 'BALCAO';
            this.render();
        }
    },

    calcularSubtotal: function() {
        return this.state.carrinho.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
    },

    calcularTotal: function() {
        return this.calcularSubtotal() + (this.state.tipoEntrega === 'DELIVERY' ? this.state.taxaEntrega : 0);
    },

    abrirCaixaModal: function() {
        document.getElementById('modal-abrir-caixa').classList.remove('hidden');
    },

    submeterAberturaCaixa: async function(e) {
        e.preventDefault();
        const operador = document.getElementById('abertura-operador').value;
        const valor = parseFloat(document.getElementById('abertura-valor').value);
        const obs = document.getElementById('abertura-obs').value;

        const res = await fetch('/api/caixa/abrir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operador, saldo_inicial: valor, observacoes: obs })
        });
        const data = await res.json();
        if (data.error) {
            alert(data.error);
        } else {
            this.fecharModais();
            await this.carregarCaixa();
        }
    },

    abrirModalMovimentacao: function(tipo) {
        document.getElementById('mov-tipo').value = tipo;
        document.getElementById('mov-titulo').innerText = tipo === 'SANGRIA' ? 'SANGRIA (Retirada de Caixa)' : 'SUPRIMENTO (Entrada de Troco)';
        document.getElementById('mov-valor').value = '';
        document.getElementById('mov-motivo').value = '';
        document.getElementById('modal-movimentacao-caixa').classList.remove('hidden');
    },

    submeterMovimentacaoCaixa: async function(e) {
        e.preventDefault();
        const tipo = document.getElementById('mov-tipo').value;
        const valor = parseFloat(document.getElementById('mov-valor').value);
        const motivo = document.getElementById('mov-motivo').value;

        const res = await fetch('/api/caixa/movimentacao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo, valor, motivo })
        });
        const data = await res.json();
        if (data.error) {
            alert(data.error);
        } else {
            this.fecharModais();
            await this.carregarCaixa();
        }
    },

    abrirModalFechamento: function() {
        document.getElementById('fechamento-saldo-informado').value = '';
        document.getElementById('fechamento-obs').value = '';
        document.getElementById('modal-fechar-caixa').classList.remove('hidden');
    },

    submeterFechamentoCaixa: async function(e) {
        e.preventDefault();
        const informado = parseFloat(document.getElementById('fechamento-saldo-informado').value);
        const obs = document.getElementById('fechamento-obs').value;

        const res = await fetch('/api/caixa/fechar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ saldo_dinheiro_informado: informado, observacoes: obs })
        });
        const data = await res.json();
        if (data.error) {
            alert(data.error);
        } else {
            let msg = `*** RELATÓRIO DO FECHAMENTO DE TURNO ***\n\n`;
            msg += `Saldo Esperado em Gaveta: R$ ${data.saldo_esperado.toFixed(2)}\n`;
            msg += `Saldo Informado pelo Operador: R$ ${data.saldo_informado.toFixed(2)}\n`;
            msg += `Diferença Apurada: R$ ${data.diferenca.toFixed(2)} ${data.diferenca === 0 ? '(CONCILIAÇÃO PERFEITA 100%)' : (data.diferenca > 0 ? '(SOBRA DE CAIXA)' : '(DIFERENÇA NEGATIVA / FALTA)')}`;
            alert(msg);
            this.fecharModais();
            await this.carregarCaixa();
        }
    },

    abrirModalPagamento: function() {
        if (!this.state.caixa || this.state.caixa.status !== 'ABERTO') {
            alert("[ERRO] O Caixa do estabelecimento está FECHADO.");
            this.abrirCaixaModal();
            return;
        }

        const total = this.calcularTotal();
        document.getElementById('pagamento-total').innerText = `R$ ${total.toFixed(2)}`;
        document.getElementById('pagamento-valor-recebido').value = total.toFixed(2);
        this.selecionarFormaPagamento(this.state.formaPagamento);
        this.calcularTroco();
        document.getElementById('modal-pagamento').classList.remove('hidden');
    },

    selecionarFormaPagamento: function(forma) {
        this.state.formaPagamento = forma;
        document.querySelectorAll('.btn-forma-pag').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`forma-${forma}`);
        if (btn) btn.classList.add('active');

        const cDinheiro = document.getElementById('container-troco-dinheiro');
        const cPix = document.getElementById('container-pix-qr');

        if (forma === 'DINHEIRO') {
            cDinheiro.classList.remove('hidden');
            cPix.classList.add('hidden');
        } else if (forma === 'PIX') {
            cDinheiro.classList.add('hidden');
            cPix.classList.remove('hidden');
        } else {
            cDinheiro.classList.add('hidden');
            cPix.classList.add('hidden');
        }
    },

    calcularTroco: function() {
        const total = this.calcularTotal();
        const recebido = parseFloat(document.getElementById('pagamento-valor-recebido').value) || 0;
        const troco = recebido - total;
        const trocoEl = document.getElementById('pagamento-troco');
        if (trocoEl) {
            trocoEl.innerText = `R$ ${troco > 0 ? troco.toFixed(2) : '0.00'}`;
            trocoEl.style.color = troco < 0 ? '#DC2626' : '#16A34A';
        }
    },

    confirmarPagamento: async function() {
        const total = this.calcularTotal();
        const recebido = parseFloat(document.getElementById('pagamento-valor-recebido').value) || 0;

        if (this.state.formaPagamento === 'DINHEIRO' && recebido < total) {
            alert(`[VALOR INSUFICIENTE] Faltam R$ ${(total - recebido).toFixed(2)} para cobrir a venda!`);
            return;
        }

        let destinoNome = "Balcão / Retirada";
        if (this.state.tipoEntrega === 'MESA') destinoNome = "Mesa do Salão";
        if (this.state.tipoEntrega === 'DELIVERY' && this.state.clienteAtual) destinoNome = this.state.clienteAtual.nome;

        const pedidoPayload = {
            origem: this.state.tipoEntrega,
            cliente_id: this.state.clienteAtual ? this.state.clienteAtual.id : null,
            cliente_nome: this.state.clienteAtual ? this.state.clienteAtual.nome : destinoNome,
            cliente_telefone: this.state.clienteAtual ? this.state.clienteAtual.telefone : "",
            cliente_endereco: this.state.tipoEntrega === 'DELIVERY' && this.state.clienteAtual 
                ? `${this.state.clienteAtual.endereco}, ${this.state.bairroSelecionado} - ${this.state.clienteAtual.complemento || ''}` 
                : (this.state.tipoEntrega === 'MESA' ? 'Salão' : "Balcão"),
            itens: this.state.carrinho,
            taxa_entrega: this.state.tipoEntrega === 'DELIVERY' ? this.state.taxaEntrega : 0,
            desconto: 0,
            forma_pagamento: this.state.formaPagamento,
            detalhes_pagamento: {
                valor_recebido: recebido,
                troco: Math.max(0, recebido - total)
            },
            status: 'EM_PREPARO'
        };

        const res = await fetch('/api/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedidoPayload)
        });

        const data = await res.json();
        if (data.success) {
            this.fecharModais();
            this.state.carrinho = [];
            this.state.clienteAtual = null;
            await this.carregarProdutos();
            await this.carregarCaixa();
            await this.carregarPedidos();
            this.exibirComandaImpressao(data.numero_comanda, pedidoPayload);
        } else {
            alert("Erro ao emitir pedido: " + (data.error || 'Erro'));
        }
    },

    exibirComandaImpressao: function(numeroComanda, pedido) {
        document.getElementById('comanda-numero').innerText = `#${numeroComanda}`;
        document.getElementById('comanda-data').innerText = new Date().toLocaleString('pt-BR');
        document.getElementById('comanda-cliente').innerText = pedido.cliente_nome;
        document.getElementById('comanda-origem').innerText = pedido.origem;

        let htmlItens = '';
        pedido.itens.forEach(item => {
            let det = '';
            if (item.detalhes) {
                det = `<div style="font-size:10px; color:#F59E0B; padding-left:8px;">↳ Borda: ${item.detalhes.borda}${item.detalhes.observacao ? ' | Obs: ' + item.detalhes.observacao : ''}</div>`;
            }
            htmlItens += `
                <div style="border-bottom: 1px dotted #383236; padding: 2px 0;">
                    <div style="display:flex; justify-content:space-between; font-weight:bold;">
                        <span>${item.quantidade}x ${item.nome}</span>
                        <span style="color:#F59E0B;">R$ ${(item.preco * item.quantidade).toFixed(2)}</span>
                    </div>
                    ${det}
                </div>
            `;
        });
        document.getElementById('comanda-itens-lista').innerHTML = htmlItens;
        document.getElementById('comanda-total').innerText = `R$ ${this.calcularTotal().toFixed(2)}`;
        document.getElementById('comanda-pagamento').innerText = pedido.forma_pagamento;
        document.getElementById('modal-comanda-impressao').classList.remove('hidden');
    },

    simularDelivery: async function(plataforma) {
        const res = await fetch('/api/delivery/simular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plataforma })
        });
        const data = await res.json();
        if (data.success) {
            this.mostrarToast(`*** NOVO PEDIDO CAPTURADO VIA ${plataforma} *** Comanda #${data.numero_comanda}`);
            await this.carregarPedidos();
            await this.carregarProdutos();
            await this.carregarCaixa();
        }
    },

    mostrarToast: function(mensagem) {
        const toast = document.getElementById('toast-notification');
        if (!toast) return;
        toast.innerText = mensagem;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 4500);
    },

    abrirModalCliente: function() {
        document.getElementById('modal-cliente').classList.remove('hidden');
        this.buscarClientes();
    },

    buscarClientes: async function() {
        const q = document.getElementById('busca-cliente-input').value;
        const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`);
        const clientes = await res.json();
        const container = document.getElementById('lista-busca-clientes');

        if (clientes.length === 0) {
            container.innerHTML = '<p style="font-size:11px; color:#888; text-align:center; padding: 8px;">[Nenhum cliente cadastrado]</p>';
            return;
        }

        container.innerHTML = clientes.map(c => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 4px; border-bottom: 1px solid #383236; background:#1e1a1d;">
                <div style="font-size:11px; cursor:pointer;" onclick="App.selecionarCliente(${JSON.stringify(c).replace(/"/g, '&quot;')})">
                    <strong style="color:#F59E0B;">${c.nome}</strong> | Tel: ${c.telefone} | CPF: ${c.cpf || 'S/N'}<br>
                    <span style="color:#888; font-size:10px;">${c.endereco ? c.endereco + ', ' + c.bairro : 'Sem endereço'}</span>
                </div>
                <div style="display:flex; gap: 4px;">
                    <button onclick="App.selecionarCliente(${JSON.stringify(c).replace(/"/g, '&quot;')})" class="win-button win-button-tertiary" style="font-size:10px;">Selecionar</button>
                    <button onclick="App.deletarCliente(${c.id}, '${c.nome.replace(/'/g, "\\'")}')" class="win-button win-button-primary" style="font-size:10px;">Excluir</button>
                </div>
            </div>
        `).join('');
    },

    selecionarCliente: function(cliente) {
        this.state.clienteAtual = cliente;
        if (cliente.bairro) {
            this.state.bairroSelecionado = cliente.bairro;
            this.atualizarFreteBairro();
        }
        this.fecharModais();
        this.render();
    },

    deletarCliente: async function(clienteId, nomeCliente) {
        if (!confirm(`CONFIRMAÇÃO DO SISTEMA:\nDeseja realmente EXCLUIR o cadastro do cliente "${nomeCliente}"?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/clientes?id=${clienteId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                if (this.state.clienteAtual && this.state.clienteAtual.id === clienteId) {
                    this.state.clienteAtual = null;
                }
                this.mostrarToast(`[OK] Cliente "${nomeCliente}" excluído com sucesso!`);
                await this.buscarClientes();
                await this.renderClientesModule();
                this.render();
            } else {
                alert(`Erro ao excluir: ${data.error || 'Falha no banco de dados'}`);
            }
        } catch (err) {
            console.error("Erro ao deletar cliente:", err);
            alert("Erro de comunicação ao excluir cliente.");
        }
    },

    salvarNovoCliente: async function(e) {
        e.preventDefault();
        const nome = document.getElementById('novo-cliente-nome').value.trim();
        const telefone = document.getElementById('novo-cliente-telefone').value.trim();
        const cpf = document.getElementById('novo-cliente-cpf').value.trim();
        const endereco = document.getElementById('novo-cliente-endereco').value.trim();
        const bairro = document.getElementById('novo-cliente-bairro').value;
        const complemento = document.getElementById('novo-cliente-complemento').value.trim();

        const res = await fetch('/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, telefone, cpf, endereco, bairro, complemento })
        });

        const data = await res.json();
        if (data.success) {
            this.state.clienteAtual = { id: data.cliente_id, nome, telefone, cpf, endereco, bairro, complemento };
            this.state.bairroSelecionado = bairro;
            this.atualizarFreteBairro();
            this.fecharModais();
            await this.renderClientesModule();
            this.render();
        }
    },

    alterarTipoEntrega: function(tipo) {
        this.state.tipoEntrega = tipo;
        if (tipo === 'DELIVERY') {
            this.atualizarFreteBairro();
        } else {
            this.state.taxaEntrega = 0;
        }
        this.render();
    },

    atualizarFreteBairro: async function() {
        const bairro = this.state.bairroSelecionado;
        const res = await fetch(`/api/frete/calcular?bairro=${encodeURIComponent(bairro)}`);
        const data = await res.json();
        this.state.taxaEntrega = data.valor_frete;
        this.render();
    },

    avancarStatusPedido: async function(pedidoId, statusAtual) {
        let proximo = 'EM_PREPARO';
        if (statusAtual === 'PENDENTE') proximo = 'EM_PREPARO';
        else if (statusAtual === 'EM_PREPARO') proximo = 'PRONTO';
        else if (statusAtual === 'PRONTO') proximo = 'EM_ROTA';
        else if (statusAtual === 'EM_ROTA') proximo = 'ENTREGUE';

        await fetch('/api/pedidos/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pedido_id: pedidoId, status: proximo })
        });
        await this.carregarPedidos();
    },

    fecharModais: function() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    },

    mudarAba: function(aba) {
        this.state.tabAtiva = aba;
        this.render();
    },

    render: function() {
        this.renderHeader();
        this.renderTabs();
    },

    renderHeader: function() {
        const cxBadge = document.getElementById('caixa-status-badge');
        const cxOperador = document.getElementById('caixa-operador-info');
        const cxSaldo = document.getElementById('caixa-saldo-info');

        if (this.state.caixa && this.state.caixa.status === 'ABERTO') {
            cxBadge.innerHTML = '<span style="color:#16A34A; font-weight:bold;">● CAIXA ABERTO</span>';
            cxOperador.innerText = this.state.caixa.operador;
            cxSaldo.innerText = `R$ ${this.state.caixa.saldo_dinheiro_esperado.toFixed(2)}`;
        } else {
            cxBadge.innerHTML = '<span style="color:#DC2626; font-weight:bold;">■ CAIXA FECHADO</span>';
            cxOperador.innerText = "Nenhum";
            cxSaldo.innerText = "R$ 0.00";
        }
    },

    renderTabs: function() {
        const abas = ['pdv', 'kds', 'delivery', 'caixa', 'clientes'];
        abas.forEach(a => {
            const btn = document.getElementById(`nav-${a}`);
            const pane = document.getElementById(`pane-${a}`);
            if (btn && pane) {
                if (a === this.state.tabAtiva) {
                    btn.classList.add('active');
                    pane.classList.remove('hidden');
                } else {
                    btn.classList.remove('active');
                    pane.classList.add('hidden');
                }
            }
        });

        if (this.state.tabAtiva === 'pdv') this.renderPDV();
        if (this.state.tabAtiva === 'kds') this.renderKDS();
        if (this.state.tabAtiva === 'delivery') this.renderDelivery();
        if (this.state.tabAtiva === 'caixa') this.renderCaixaModulo();
        if (this.state.tabAtiva === 'clientes') this.renderClientesModule();
    },

    renderPDV: function() {
        this.renderCategorias();
        this.renderProdutos();
        this.renderCarrinho();
    },

    renderCategorias: function() {
        const el = document.getElementById('pdv-categorias-bar');
        if (!el) return;
        el.innerHTML = this.state.categorias.map(cat => `
            <button onclick="App.state.categoriaAtiva = '${cat}'; App.renderProdutos(); App.renderCategorias();"
                    class="win-button ${this.state.categoriaAtiva === cat ? 'active' : ''}">
                📁 ${cat}
            </button>
        `).join(' ');
    },

    renderProdutos: function() {
        const grid = document.getElementById('pdv-produtos-grid');
        if (!grid) return;

        let prods = this.state.produtos;
        if (this.state.categoriaAtiva !== 'Todos') {
            prods = prods.filter(p => p.categoria === this.state.categoriaAtiva);
        }
        if (this.state.buscaTermo) {
            const b = this.state.buscaTermo.toLowerCase();
            prods = prods.filter(p => p.nome.toLowerCase().includes(b) || p.codigo.toLowerCase().includes(b));
        }

        if (prods.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; padding: 20px; text-align: center; color: #888;">[Nenhum sabor encontrado]</div>';
            return;
        }

        grid.innerHTML = prods.map(p => `
            <div onclick="App.clicarProduto(${p.id})" class="win-bevel-out" style="padding: 6px; cursor: pointer; display:flex; flex-direction:column; justify-content:space-between; background: #231f22;">
                <div>
                    <div style="height: 90px; overflow:hidden; border: 2px inset #0a0809; background:#000; margin-bottom: 4px;">
                        <img src="${p.imagem_url}" alt="${p.nome}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div style="font-size: 11px; font-weight: bold; color: #F59E0B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        🍕 ${p.nome}
                    </div>
                    <div style="font-size: 10px; color: #aaa; height: 26px; overflow: hidden; line-height: 1.2; margin-top:2px;">
                        ${p.descricao || ''}
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 6px; padding-top: 4px; border-top: 1px dashed #383236;">
                    <span class="digital-lcd" style="padding: 2px 4px; font-size: 14px; font-weight: bold;">R$ ${p.preco.toFixed(2)}</span>
                    <button class="win-button win-button-primary" style="font-size: 10px;">[+] Pedir</button>
                </div>
            </div>
        `).join('');
    },

    renderCarrinho: function() {
        const container = document.getElementById('pdv-carrinho-itens');
        const badgeCount = document.getElementById('carrinho-qtd-itens');
        const subtotalEl = document.getElementById('carrinho-subtotal');
        const totalEl = document.getElementById('carrinho-total');
        const freteEl = document.getElementById('carrinho-frete');
        const clienteBadge = document.getElementById('carrinho-cliente-badge');

        if (badgeCount) badgeCount.innerText = `${this.state.carrinho.reduce((a, b) => a + b.quantidade, 0)} itens`;

        if (clienteBadge) {
            if (this.state.clienteAtual) {
                clienteBadge.innerHTML = `
                    <div class="win-bevel-in" style="padding: 3px 6px; font-size: 11px; display:flex; justify-content:space-between; align-items:center; background:#2d261e; color:#F59E0B;">
                        <span>👤 <b>${this.state.clienteAtual.nome}</b></span>
                        <a href="javascript:void(0)" onclick="App.state.clienteAtual = null; App.render();" style="color:#DC2626; font-size:10px; font-weight:bold;">[x]</a>
                    </div>
                `;
            } else {
                clienteBadge.innerHTML = `
                    <button onclick="App.abrirModalCliente()" class="win-button" style="width: 100%; font-size: 11px;">
                        🔍 Identificar Cliente (F7)
                    </button>
                `;
            }
        }

        if (this.state.carrinho.length === 0) {
            container.innerHTML = `
                <div style="padding: 30px 10px; text-align: center; color: #888; font-size: 11px;">
                    <span style="font-size: 24px;">🛒</span><br>
                    <b style="color:#F59E0B;">[COMANDA VAZIA]</b><br>
                    Selecione as pizzas ao lado
                </div>
            `;
            if (subtotalEl) subtotalEl.innerText = "R$ 0.00";
            if (totalEl) totalEl.innerText = "R$ 0.00";
            if (freteEl) freteEl.innerText = "R$ 0.00";
            return;
        }

        container.innerHTML = this.state.carrinho.map((item, index) => `
            <div class="win-bevel-out" style="padding: 4px; margin-bottom: 4px; font-size: 11px; background:#231f22;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:bold; color:#F59E0B; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${item.nome}
                    </div>
                    <div style="font-weight:bold; color:#ffffff;">
                        R$ ${(item.preco * item.quantidade).toFixed(2)}
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 3px;">
                    <span style="color:#aaa; font-size:10px;">R$ ${item.preco.toFixed(2)} un</span>
                    <div>
                        <button onclick="App.alterarQuantidade(${index}, -1)" class="win-button" style="padding: 0 5px; font-size:10px;">-</button>
                        <span style="font-weight:bold; padding: 0 4px; color:#F59E0B;">${item.quantidade}</span>
                        <button onclick="App.alterarQuantidade(${index}, 1)" class="win-button" style="padding: 0 5px; font-size:10px;">+</button>
                        <button onclick="App.removerDoCarrinho(${index})" class="win-button win-button-primary" style="padding: 0 4px; font-size:9px; margin-left:4px;">Del</button>
                    </div>
                </div>
                ${item.detalhes ? `
                    <div style="font-size:10px; color:#bbb; border-top:1px dashed #383236; margin-top:2px; padding-top:2px;">
                        Borda: ${item.detalhes.borda}${item.detalhes.observacao ? ' | Obs: ' + item.detalhes.observacao : ''}
                    </div>
                ` : ''}
            </div>
        `).join('');

        const sub = this.calcularSubtotal();
        const tot = this.calcularTotal();
        if (subtotalEl) subtotalEl.innerText = `R$ ${sub.toFixed(2)}`;
        if (freteEl) freteEl.innerText = `R$ ${this.state.tipoEntrega === 'DELIVERY' ? this.state.taxaEntrega.toFixed(2) : '0.00'}`;
        if (totalEl) totalEl.innerText = `R$ ${tot.toFixed(2)}`;
    },

    renderKDS: function() {
        const container = document.getElementById('kds-pedidos-container');
        if (!container) return;

        // KDS: Pedidos ativos que possuam ao menos um item que precise ir ao forno (exclui pedidos só de bebidas)
        const pedidosAtivos = this.state.pedidos.filter(p => {
            if (!['PENDENTE', 'EM_PREPARO', 'PRONTO'].includes(p.status)) return false;
            const temItemForno = p.itens && p.itens.some(it => it.categoria !== 'Bebidas');
            return temItemForno;
        });

        if (pedidosAtivos.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; padding: 30px; text-align: center; color: #16A34A; font-size: 13px;">
                    <b>*** FORNO A LENHA EM ESPERA - NENHUMA PIZZA NA FILA ***</b>
                </div>
            `;
            return;
        }

        container.innerHTML = pedidosAtivos.map(p => `
            <div class="win-bevel-out" style="padding: 2px;">
                <div class="win-titlebar" style="font-size: 11px;">
                    <span>Comanda #${p.numero_comanda} [${p.origem}]</span>
                    <span>${new Date(p.criado_em).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div style="padding: 6px; font-size: 11px;">
                    <div style="font-weight:bold; margin-bottom: 4px; color:#F59E0B;">👤 Cliente: ${p.cliente_nome}</div>
                    <div class="win-bevel-in" style="padding: 4px; max-height: 120px; overflow-y:auto; margin-bottom: 6px;">
                        ${p.itens.map(it => `
                            <div style="border-bottom: 1px dotted #383236; padding: 2px 0;">
                                <b style="color:#F59E0B;">${it.quantidade}x</b> ${it.nome}
                                ${it.detalhes ? `<br><small style="color:#aaa;">↳ Borda: ${it.detalhes.borda}</small>` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <button onclick="App.avancarStatusPedido(${p.id}, '${p.status}')" class="win-button ${p.status === 'EM_PREPARO' ? 'win-button-secondary' : 'win-button-tertiary'}" style="width: 100%; font-weight: bold;">
                        ${p.status === 'PENDENTE' ? '>> INICIAR NO FORNO' : p.status === 'EM_PREPARO' ? '>> RETIRAR DO FORNO (PRONTO)' : '>> DESPACHAR PIZZA'}
                    </button>
                </div>
            </div>
        `).join('');
    },

    renderDelivery: function() {
        const tabela = document.getElementById('tabela-delivery-pedidos');
        if (!tabela) return;

        // Delivery & Rotas: Somente pedidos para entrega externa/delivery (nunca BALCAO ou MESA)
        const origensDelivery = ['DELIVERY', 'IFOOD', 'UBER_EATS', '99_FOOD'];
        const pedidosDelivery = this.state.pedidos.filter(p => origensDelivery.includes(p.origem));

        if (pedidosDelivery.length === 0) {
            tabela.innerHTML = `
                <tr>
                    <td colspan="6" style="padding: 20px; text-align: center; color: #888; font-size: 11px;">
                        [Nenhum pedido de delivery ou aplicativo pendente de despacho]
                    </td>
                </tr>
            `;
            return;
        }

        tabela.innerHTML = pedidosDelivery.map(p => `
            <tr style="font-size: 11px; background: #1a1619; border-bottom: 1px solid #383236; color:#fff;">
                <td style="padding: 4px; font-family: monospace; font-weight: bold; color:#F59E0B;">#${p.numero_comanda}</td>
                <td style="padding: 4px;"><b style="color:#DC2626;">[${p.origem}]</b></td>
                <td style="padding: 4px;">${p.cliente_nome}<br><small style="color:#aaa;">${p.cliente_endereco || 'Sem endereço'}</small></td>
                <td style="padding: 4px; font-weight: bold; color: #16A34A;">R$ ${p.total.toFixed(2)}</td>
                <td style="padding: 4px;"><span style="background:#0c0a0b; color:#F59E0B; padding:1px 4px; font-size:10px; border:1px solid #383236;">${p.status}</span></td>
                <td style="padding: 4px; text-align: right;">
                    <button onclick="App.avancarStatusPedido(${p.id}, '${p.status}')" class="win-button win-button-tertiary" style="font-size: 10px;">Avançar >></button>
                </td>
            </tr>
        `).join('');
    },

    renderCaixaModulo: function() {
        const cx = this.state.caixa;
        const infoEl = document.getElementById('caixa-modulo-detalhes');
        if (!infoEl) return;

        if (!cx || cx.status !== 'ABERTO') {
            infoEl.innerHTML = `
                <div class="win-bevel-out" style="padding: 20px; text-align: center;">
                    <h3 style="color:#DC2626; font-size:14px; margin-top:0;">*** CAIXA REGISTRADORA FECHADA ***</h3>
                    <p style="font-size:11px; color:#ccc;">O sistema do turno encontra-se travado até abertura com fundo de troco.</p>
                    <button onclick="App.abrirCaixaModal()" class="win-button win-button-primary" style="padding: 6px 14px; font-size:12px; font-weight:bold;">
                        🔑 Abrir Turno do Caixa
                    </button>
                </div>
            `;
            return;
        }

        const vDin = cx.vendas_por_forma.DINHEIRO ? cx.vendas_por_forma.DINHEIRO.total : 0.0;
        const vPix = cx.vendas_por_forma.PIX ? cx.vendas_por_forma.PIX.total : 0.0;
        const vCard = (cx.vendas_por_forma.CARTAO_CREDITO ? cx.vendas_por_forma.CARTAO_CREDITO.total : 0.0) +
                      (cx.vendas_por_forma.CARTAO_DEBITO ? cx.vendas_por_forma.CARTAO_DEBITO.total : 0.0);

        infoEl.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px;">
                <div class="win-bevel-in" style="padding: 6px;">
                    <div style="font-size:10px; color:#aaa;">Fundo de Troco Inicial:</div>
                    <div style="font-size:16px; font-weight:bold; font-family:monospace; color:#F59E0B;">R$ ${cx.saldo_inicial.toFixed(2)}</div>
                </div>
                <div class="win-bevel-in" style="padding: 6px;">
                    <div style="font-size:10px; color:#aaa;">Entradas em Dinheiro:</div>
                    <div style="font-size:16px; font-weight:bold; font-family:monospace; color:#16A34A;">R$ ${vDin.toFixed(2)}</div>
                </div>
                <div class="win-bevel-in" style="padding: 6px;">
                    <div style="font-size:10px; color:#aaa;">Entradas PIX / Cartões:</div>
                    <div style="font-size:16px; font-weight:bold; font-family:monospace; color:#F59E0B;">R$ ${(vPix + vCard).toFixed(2)}</div>
                </div>
                <div class="win-bevel-in digital-lcd" style="padding: 6px;">
                    <div style="font-size:10px; color:#aaa;">GAVETA FÍSICA CALCULADA:</div>
                    <div style="font-size:20px; font-weight:bold;">R$ ${cx.saldo_dinheiro_esperado.toFixed(2)}</div>
                </div>
            </div>

            <div style="display:flex; gap: 8px;">
                <button onclick="App.abrirModalMovimentacao('SUPRIMENTO')" class="win-button">
                    ➕ Suprimento (Aporte)
                </button>
                <button onclick="App.abrirModalMovimentacao('SANGRIA')" class="win-button">
                    ➖ Sangria (Retirada)
                </button>
                <button onclick="App.abrirModalFechamento()" class="win-button win-button-primary" style="margin-left:auto; font-weight:bold;">
                    🔒 Fechar Turno com Conciliação
                </button>
            </div>
        `;
    },

    renderClientesModule: async function() {
        const container = document.getElementById('clientes-modulo-lista');
        if (!container) return;
        const res = await fetch('/api/clientes');
        const clientes = await res.json();

        container.innerHTML = clientes.map(c => `
            <tr style="font-size: 11px; background: #1a1619; border-bottom: 1px solid #383236; color:#fff;">
                <td style="padding: 4px; font-weight: bold; color:#F59E0B;">${c.nome}</td>
                <td style="padding: 4px; font-family: monospace;">${c.telefone}</td>
                <td style="padding: 4px; font-family: monospace;">${c.cpf || '—'}</td>
                <td style="padding: 4px;">${c.endereco ? `${c.endereco}, ${c.bairro || ''}` : '—'}</td>
                <td style="padding: 4px; text-align: right; display:flex; gap:4px; justify-content: flex-end;">
                    <button onclick="App.selecionarCliente(${JSON.stringify(c).replace(/"/g, '&quot;')}); App.mudarAba('pdv');"
                            class="win-button win-button-secondary" style="font-size: 10px;">
                        Lançar Pedido >>
                    </button>
                    <button onclick="App.deletarCliente(${c.id}, '${c.nome.replace(/'/g, "\\'")}')"
                            class="win-button win-button-primary" style="font-size: 10px;">
                        Excluir
                    </button>
                </td>
            </tr>
        `).join('');
    }
};

window.addEventListener('DOMContentLoaded', () => {
    App.init();
});
