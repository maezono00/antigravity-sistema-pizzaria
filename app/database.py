import sqlite3
import os
from datetime import datetime

DB_FILE = os.path.join(os.path.dirname(__file__), "pdv_database.sqlite")

def get_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(force_reseed=False):
    conn = get_connection()
    cursor = conn.cursor()

    # Clientes (RF-01, RNF-02 LGPD)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT,
        telefone TEXT NOT NULL,
        endereco TEXT,
        bairro TEXT,
        complemento TEXT,
        criado_em TEXT NOT NULL
    )
    """)

    # Produtos do Catálogo de Pizzaria (Pizzas Tradicionais, Especiais, Doces, Bordas, Bebidas)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        nome TEXT NOT NULL,
        categoria TEXT NOT NULL,
        preco REAL NOT NULL,
        estoque INTEGER NOT NULL DEFAULT 100,
        descricao TEXT,
        imagem_url TEXT
    )
    """)

    # Sessão de Caixa (RF-07 Abertura/Fechamento Mapeado)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS caixa_sessoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operador TEXT NOT NULL,
        saldo_inicial REAL NOT NULL,
        saldo_final_esperado REAL DEFAULT 0,
        saldo_final_informado REAL DEFAULT 0,
        diferenca REAL DEFAULT 0,
        aberto_em TEXT NOT NULL,
        fechado_em TEXT,
        status TEXT NOT NULL DEFAULT 'ABERTO',
        observacoes TEXT
    )
    """)

    # Movimentações de Caixa (Sangria e Suprimento)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS caixa_movimentacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        caixa_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        valor REAL NOT NULL,
        motivo TEXT NOT NULL,
        criado_em TEXT NOT NULL,
        FOREIGN KEY(caixa_id) REFERENCES caixa_sessoes(id)
    )
    """)

    # Pedidos (RF-02, RF-03, RF-04, RF-05)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pedidos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        numero_comanda INTEGER NOT NULL,
        origem TEXT NOT NULL DEFAULT 'BALCAO', -- BALCAO, MESA, IFOOD, UBER_EATS, 99_FOOD, DELIVERY
        cliente_id INTEGER,
        cliente_nome TEXT,
        cliente_telefone TEXT,
        cliente_endereco TEXT,
        itens_json TEXT NOT NULL,
        subtotal REAL NOT NULL,
        taxa_entrega REAL NOT NULL DEFAULT 0,
        desconto REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL,
        forma_pagamento TEXT,
        detalhes_pagamento_json TEXT,
        status TEXT NOT NULL DEFAULT 'PENDENTE', -- PENDENTE, EM_PREPARO, FORNO, PRONTO, EM_ROTA, ENTREGUE, CANCELADO
        caixa_id INTEGER,
        rota_entregador TEXT,
        criado_em TEXT NOT NULL,
        FOREIGN KEY(cliente_id) REFERENCES clientes(id),
        FOREIGN KEY(caixa_id) REFERENCES caixa_sessoes(id)
    )
    """)

    # Tabela de bairros para frete da Pizzaria
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bairros_frete (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE NOT NULL,
        distancia_km REAL NOT NULL,
        valor_frete REAL NOT NULL,
        tempo_estimado_min INTEGER NOT NULL
    )
    """)

    conn.commit()

    if force_reseed:
        cursor.execute("DELETE FROM produtos")
        cursor.execute("DELETE FROM bairros_frete")

    seed_data(cursor, conn)
    conn.close()

def seed_data(cursor, conn):
    cursor.execute("SELECT COUNT(*) FROM produtos")
    if cursor.fetchone()[0] == 0:
        produtos_pizzaria = [
            # Pizzas Tradicionais
            ("PIZ-CAL", "Pizza Calabresa Especial", "Pizzas Tradicionais", 52.00, 95, "Molho de tomate pelado San Marzano, fatias de calabresa artesanal defumada, cebola roxa fininha e orégano fresco.", "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=400&q=80"),
            ("PIZ-MAR", "Pizza Margherita D.O.P.", "Pizzas Tradicionais", 56.00, 80, "Molho rústico artesanal, mussarela de búfala fresca ralada grossa, manjericão gigante e azeite extra virgem.", "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=400&q=80"),
            ("PIZ-MUS", "Pizza Mussarela Clássica", "Pizzas Tradicionais", 48.00, 110, "Massa de fermentação lenta 48h, camada generosa de mussarela derretida, rodelas de tomate e azeitonas pretas chilenas.", "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80"),
            ("PIZ-FRA", "Pizza Frango com Catupiry", "Pizzas Tradicionais", 58.00, 85, "Peito de frango desfiado temperado com ervas finas e cobertura original Catupiry cremoso em espiral.", "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80"),
            ("PIZ-POR", "Pizza Portuguesa da Casa", "Pizzas Tradicionais", 59.00, 75, "Presunto cozido fatiado, ovos caipiras cozidos, cebola, ervilhas frescas, mussarela e azeitonas pretas.", "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80"),
            
            # Pizzas Especiais / Premium
            ("PIZ-4Q", "Pizza 4 Queijos Premium", "Pizzas Especiais", 64.00, 70, "Blend harmônico de mussarela, provolone defumado, gorgonzola italiano picante e requeijão Catupiry.", "https://images.unsplash.com/photo-1573821663912-569905455b1c?w=400&q=80"),
            ("PIZ-PEP", "Pizza Pepperoni Supreme", "Pizzas Especiais", 62.00, 90, "Pepperoni curado de fabricação própria levemente tostado, mussarela e folhas de orégano selvagem.", "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80"),
            ("PIZ-BAC", "Pizza Bacon Crocante com Milho", "Pizzas Especiais", 59.00, 65, "Tiras crocantes de bacon defumado, milho verde no vapor e camada cremosa de requeijão cremoso.", "https://images.unsplash.com/photo-1594007654729-407eedc4be65?w=400&q=80"),
            ("PIZ-PAR", "Pizza Parma com Rúcula", "Pizzas Especiais", 69.00, 45, "Fatias de presunto de Parma curado cru, lascas de queijo parmesão maturado e rúcula fresca selvagem.", "https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?w=400&q=80"),

            # Pizzas Doces
            ("PIZ-NUT", "Pizza Nutella com Morango", "Pizzas Doces", 45.00, 50, "Creme de avelã Nutella legítimo espalhado em massa fininha crocante, finalizada com morangos frescos e raspas de chocolate.", "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&q=80"),
            ("PIZ-BAN", "Pizza Banana com Canela & Mel", "Pizzas Doces", 42.00, 40, "Fatias de banana nanica caramelizadas no forno a lenha, canela em pó do Ceilão e toque de chocolate branco.", "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80"),
            ("PIZ-ROM", "Pizza Romeu e Julieta", "Pizzas Doces", 44.00, 45, "Queijo minas meia-cura levemente derretido com goiabada cascão cremosa derretida no forno a lenha.", "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=400&q=80"),

            # Entradas & Calzones
            ("ENT-COR", "Corniccione Crocante ao Alecrim", "Entradas", 26.00, 60, "Massa de pizza fina e crocante regada com azeite de oliva extravirgem, sal grosso e folhas de alecrim fresco.", "https://images.unsplash.com/photo-1579751626657-72bc17010498?w=400&q=80"),
            ("CAL-CAR", "Calzone de Carne e Queijo", "Entradas", 38.00, 35, "Pizza fechada no forno recheada com carne desfiada suculenta, queijo mussarela e catupiry.", "https://images.unsplash.com/photo-1536964549204-cce9eab227bd?w=400&q=80"),

            # Bebidas
            ("BEB-COC2L", "Coca-Cola 2 Litros Pet", "Bebidas", 15.00, 150, "Refrigerante 2 Litros geladíssimo, ideal para acompanhar a pizza da família.", "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=80"),
            ("BEB-GUAR2L", "Guaraná Antarctica 2L", "Bebidas", 14.00, 120, "Refrigerante de Guaraná original bem gelado.", "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80"),
            ("BEB-COCLT", "Coca-Cola Lata 350ml", "Bebidas", 7.50, 180, "Lata individual gelada.", "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&q=80"),
            ("BEB-HEIN", "Cerveja Heineken Long Neck 330ml", "Bebidas", 12.90, 100, "Cerveja Puro Malte gelada.", "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400&q=80"),
            ("BEB-SUC", "Suco Natural de Laranja 1L", "Bebidas", 18.00, 50, "Jarra/garrafa de 1 litro de suco natural da fruta espremido na hora.", "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&q=80")
        ]
        cursor.executemany("""
            INSERT INTO produtos (codigo, nome, categoria, preco, estoque, descricao, imagem_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, produtos_pizzaria)

    cursor.execute("SELECT COUNT(*) FROM bairros_frete")
    if cursor.fetchone()[0] == 0:
        bairros = [
            ("Centro", 1.8, 6.00, 20),
            ("Bela Vista", 3.2, 9.00, 25),
            ("Consolação", 3.8, 10.00, 25),
            ("Jardins", 5.0, 14.00, 35),
            ("Pinheiros", 7.5, 18.00, 40),
            ("Vila Mariana", 6.2, 16.00, 35)
        ]
        cursor.executemany("""
            INSERT INTO bairros_frete (nome, distancia_km, valor_frete, tempo_estimado_min)
            VALUES (?, ?, ?, ?)
        """, bairros)

    cursor.execute("SELECT COUNT(*) FROM clientes")
    if cursor.fetchone()[0] == 0:
        clientes_iniciais = [
            ("Carlos Eduardo Silva", "123.456.789-01", "(11) 98765-4321", "Rua das Flores, 120", "Centro", "Apto 42", datetime.now().isoformat()),
            ("Mariana Souza Costa", "234.567.890-12", "(11) 97654-3210", "Av. Paulista, 1500", "Bela Vista", "Bloco B", datetime.now().isoformat()),
            ("Rodrigo Almeida", "345.678.901-23", "(11) 96543-2109", "Rua Augusta, 450", "Consolação", "Casa 2", datetime.now().isoformat()),
            ("Ana Beatriz Fernandes", "456.789.012-34", "(11) 95432-1098", "Rua Oscar Freire, 800", "Jardins", "Fundos", datetime.now().isoformat())
        ]
        cursor.executemany("""
            INSERT INTO clientes (nome, cpf, telefone, endereco, bairro, complemento, criado_em)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, clientes_iniciais)

    cursor.execute("SELECT COUNT(*) FROM caixa_sessoes WHERE status = 'ABERTO'")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO caixa_sessoes (operador, saldo_inicial, aberto_em, status, observacoes)
            VALUES ('Arthur (Caixa Pizzaria)', 200.00, ?, 'ABERTO', 'Abertura de turno da pizzaria com troco de notas e moedas')
        """, (datetime.now().isoformat(),))

    conn.commit()

if __name__ == "__main__":
    init_db(force_reseed=True)
    print("Database da Pizzaria inicializada com sucesso!")
