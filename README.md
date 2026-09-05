# 🍕 Sistema Integrado de Caixa, Gestão de Pedidos e Delivery (PDV)

Sistema de Ponto de Venda (PDV) e Central de Pedidos de alta usabilidade, desenvolvido para atender integralmente aos requisitos funcionais e operacionais das atividades práticas de gestão de vendas e delivery.

---

## ⚡ Como Executar em 1 Comando

Não é necessário instalar Node.js, compilar pacotes pesados ou configurar bancos externos. O projeto funciona 100% com **Python 3** nativo e banco de dados **SQLite3** embutido.

### Opção 1 (Via terminal):
```bash
python3 run.py
```
ou:
```bash
./iniciar.sh
```

A aplicação iniciará automaticamente o servidor e informará o endereço para abrir no navegador:
👉 **http://localhost:8000** (ou http://localhost:8001 caso a porta 8000 esteja ocupada).

---

## 🎯 Requisitos Implementados

### 1. RF-01: Cadastro e Gestão de Clientes
- Consulta ágil por nome, telefone ou CPF na comanda (atalho **F7**).
- Cadastro de novos clientes com endereço completo, bairro e validação.
- Histórico e associação direta com os pedidos.

### 2. RF-02: Lançamento e Notificação de Pedidos (PDV)
- Interface inspirada no **Stitch** e focada em touch-screen e agilidade no balcão.
- Navegação por categorias (*Pizzas, Hambúrgueres, Acompanhamentos, Bebidas, Sobremesas*).
- Carrinho/comanda dinâmico em tempo real com controle de quantidade.
- Monitor de Cozinha (**KDS**) com avanço de etapas de preparo (*Pendente -> Em Preparo -> Pronto -> Despachado*).
- Atalhos de teclado rápidos para o operador de caixa:
  - **F2**: Finalizar e Liquidar Venda
  - **F4**: Limpar Comanda
  - **F7**: Identificar Cliente
  - **F9**: Capturar simulação de pedido iFood
  - **ESC**: Fechar modais

### 3. RF-03: Processamento e Liquidação de Pagamentos
- Suporte a múltiplos métodos de pagamento:
  - **Dinheiro**: Cálculo instantâneo e seguro de troco.
  - **PIX**: Geração de QR Code e chave em tempo real.
  - **Cartão de Crédito e Débito**.
- Impressão/Visualização imediata do cupom de comanda física para conferência.

### 4. RF-04: Cálculo de Frete e Roteamento de Entregas
- Cálculo automático da taxa de entrega baseado no bairro e distância em km.
- Separação entre pedidos de Balcão e Delivery.
- Acompanhamento do status de rota dos entregadores.

### 5. RF-05: Integrador de Plataformas de Delivery (iFood, Uber Eats, 99 Food)
- **Adapter Pattern** unificado para captura de pedidos externos.
- Botões interativos na interface (**Simular iFood**, **Simular Uber**, **Simular 99**) para demonstrações práticas sem necessidade de credenciais de produção de terceiros.
- Alertas e notificações automáticas na tela quando novos pedidos chegam.

### 6. RF-06: Controle e Baixa Automática de Estoque
- Atualização em tempo real do estoque a cada venda realizada.
- Bloqueio de venda caso o produto não possua saldo em estoque.
- Badges visuais destacando itens com estoque baixo.

### 7. RF-07: Abertura e Fechamento Mapeado de Caixa
- Abertura de turno com registro do operador e fundo de troco inicial.
- Lançamento de movimentações financeiras: **Sangria** (retirada) e **Suprimento** (aporte) com justificativas.
- Fechamento cego e conciliação mapeada: cálculo automático de divergências (sobras ou faltas) e relatório financeiro por meio de pagamento com 100% de precisão.

---

## 📂 Estrutura do Projeto

```
antigravity-projeto-final/
├── app/
│   ├── static/
│   │   ├── css/style.css       # Estilização visual complementar
│   │   ├── js/app.js           # Lógica do Caixa, KDS, Delivery e Modais
│   │   └── index.html          # Interface PDV completa (Tailwind + Icons)
│   ├── database.py             # Modelagem e persistência SQLite
│   ├── services.py             # Regras de negócio, cálculo de frete e adaptador delivery
│   └── server.py               # Servidor HTTP RESTful local
├── run.py                      # Script de execução imediata
├── iniciar.sh                  # Script executável bash
├── requisitos.txt              # Especificação de requisitos original
├── aspectos_tecnicos_programacao.txt # Diretrizes arquiteturais originais
└── README.md                   # Documentação do projeto
```
