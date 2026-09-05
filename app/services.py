import json
import random
import re
from datetime import datetime
from app.database import get_connection

class CaixaService:
    @staticmethod
    def get_caixa_atual():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM caixa_sessoes WHERE status = 'ABERTO' ORDER BY id DESC LIMIT 1")
        caixa = cursor.fetchone()
        
        if not caixa:
            conn.close()
            return None
        
        caixa_id = caixa["id"]
        
        cursor.execute("SELECT tipo, SUM(valor) as total FROM caixa_movimentacoes WHERE caixa_id = ? GROUP BY tipo", (caixa_id,))
        movs = {row["tipo"]: row["total"] for row in cursor.fetchall()}
        suprimentos = movs.get("SUPRIMENTO", 0.0) or 0.0
        sangrias = movs.get("SANGRIA", 0.0) or 0.0

        cursor.execute("""
            SELECT forma_pagamento, SUM(total) as total, COUNT(*) as quantidade
            FROM pedidos 
            WHERE caixa_id = ? AND status != 'CANCELADO'
            GROUP BY forma_pagamento
        """, (caixa_id,))
        vendas_por_forma = {row["forma_pagamento"]: {"total": row["total"], "quantidade": row["quantidade"]} for row in cursor.fetchall()}

        total_vendas = sum(item["total"] for item in vendas_por_forma.values())
        total_dinheiro = vendas_por_forma.get("DINHEIRO", {}).get("total", 0.0)

        saldo_dinheiro_esperado = caixa["saldo_inicial"] + total_dinheiro + suprimentos - sangrias

        conn.close()
        return {
            "id": caixa["id"],
            "operador": caixa["operador"],
            "saldo_inicial": caixa["saldo_inicial"],
            "aberto_em": caixa["aberto_em"],
            "status": caixa["status"],
            "suprimentos": suprimentos,
            "sangrias": sangrias,
            "vendas_por_forma": vendas_por_forma,
            "total_vendas": round(total_vendas, 2),
            "saldo_dinheiro_esperado": round(saldo_dinheiro_esperado, 2)
        }

    @staticmethod
    def abrir_caixa(operador, saldo_inicial, observacoes=""):
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM caixa_sessoes WHERE status = 'ABERTO'")
        aberto = cursor.fetchone()
        if aberto:
            conn.close()
            return {"error": "Já existe um caixa aberto no momento."}

        agora = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO caixa_sessoes (operador, saldo_inicial, aberto_em, status, observacoes)
            VALUES (?, ?, ?, 'ABERTO', ?)
        """, (operador, float(saldo_inicial), agora, observacoes))
        conn.commit()
        caixa_id = cursor.lastrowid
        conn.close()
        return {"success": True, "caixa_id": caixa_id}

    @staticmethod
    def registrar_movimentacao(tipo, valor, motivo):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM caixa_sessoes WHERE status = 'ABERTO' ORDER BY id DESC LIMIT 1")
        caixa = cursor.fetchone()
        if not caixa:
            conn.close()
            return {"error": "Nenhum caixa aberto para registrar movimentação."}

        agora = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO caixa_movimentacoes (caixa_id, tipo, valor, motivo, criado_em)
            VALUES (?, ?, ?, ?, ?)
        """, (caixa["id"], tipo.upper(), float(valor), motivo, agora))
        conn.commit()
        conn.close()
        return {"success": True}

    @staticmethod
    def fechar_caixa(saldo_dinheiro_informado, observacoes=""):
        caixa_atual = CaixaService.get_caixa_atual()
        if not caixa_atual:
            return {"error": "Nenhum caixa aberto."}

        saldo_esperado = caixa_atual["saldo_dinheiro_esperado"]
        informado = float(saldo_dinheiro_informado)
        diferenca = informado - saldo_esperado
        agora = datetime.now().isoformat()

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE caixa_sessoes
            SET status = 'FECHADO',
                fechado_em = ?,
                saldo_final_esperado = ?,
                saldo_final_informado = ?,
                diferenca = ?,
                observacoes = ?
            WHERE id = ?
        """, (agora, saldo_esperado, informado, diferenca, observacoes, caixa_atual["id"]))
        conn.commit()
        conn.close()
        return {
            "success": True,
            "saldo_esperado": saldo_esperado,
            "saldo_informado": informado,
            "diferenca": round(diferenca, 2),
            "fechado_em": agora
        }

class PedidoService:
    @staticmethod
    def criar_pedido(dados):
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM caixa_sessoes WHERE status = 'ABERTO' ORDER BY id DESC LIMIT 1")
        caixa = cursor.fetchone()
        caixa_id = caixa["id"] if caixa else None

        cursor.execute("SELECT MAX(numero_comanda) FROM pedidos")
        max_comanda = cursor.fetchone()[0]
        numero_comanda = (max_comanda or 100) + 1

        itens = dados.get("itens", [])
        subtotal = sum(item["preco"] * item["quantidade"] for item in itens)
        taxa_entrega = float(dados.get("taxa_entrega", 0.0))
        desconto = float(dados.get("desconto", 0.0))
        total = round(subtotal + taxa_entrega - desconto, 2)

        for item in itens:
            cursor.execute("UPDATE produtos SET estoque = MAX(0, estoque - ?) WHERE id = ?", (item["quantidade"], item.get("id")))

        agora = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO pedidos (
                numero_comanda, origem, cliente_id, cliente_nome, cliente_telefone, cliente_endereco,
                itens_json, subtotal, taxa_entrega, desconto, total, forma_pagamento,
                detalhes_pagamento_json, status, caixa_id, rota_entregador, criado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            numero_comanda,
            dados.get("origem", "BALCAO"),
            dados.get("cliente_id"),
            dados.get("cliente_nome", "Cliente Balcão"),
            dados.get("cliente_telefone", ""),
            dados.get("cliente_endereco", ""),
            json.dumps(itens),
            subtotal,
            taxa_entrega,
            desconto,
            total,
            dados.get("forma_pagamento", "DINHEIRO"),
            json.dumps(dados.get("detalhes_pagamento", {})),
            dados.get("status", "EM_PREPARO"),
            caixa_id,
            dados.get("rota_entregador", ""),
            agora
        ))
        conn.commit()
        pedido_id = cursor.lastrowid
        conn.close()

        return {
            "success": True,
            "pedido_id": pedido_id,
            "numero_comanda": numero_comanda,
            "total": total,
            "status": "EM_PREPARO"
        }

    @staticmethod
    def listar_pedidos(filtro_status=None, limite=50):
        conn = get_connection()
        cursor = conn.cursor()
        if filtro_status:
            cursor.execute("SELECT * FROM pedidos WHERE status = ? ORDER BY id DESC LIMIT ?", (filtro_status, limite))
        else:
            cursor.execute("SELECT * FROM pedidos ORDER BY id DESC LIMIT ?", (limite,))
        pedidos = [dict(row) for row in cursor.fetchall()]
        for p in pedidos:
            p["itens"] = json.loads(p["itens_json"]) if p["itens_json"] else []
            p["detalhes_pagamento"] = json.loads(p["detalhes_pagamento_json"]) if p["detalhes_pagamento_json"] else {}
        conn.close()
        return pedidos

    @staticmethod
    def atualizar_status(pedido_id, novo_status, rota_entregador=None):
        conn = get_connection()
        cursor = conn.cursor()
        if rota_entregador:
            cursor.execute("UPDATE pedidos SET status = ?, rota_entregador = ? WHERE id = ?", (novo_status, rota_entregador, pedido_id))
        else:
            cursor.execute("UPDATE pedidos SET status = ? WHERE id = ?", (novo_status, pedido_id))
        conn.commit()
        conn.close()
        return {"success": True}

class DeliverySimulator:
    PLATAFORMAS = ["IFOOD", "UBER_EATS", "99_FOOD"]

    @staticmethod
    def simular_pedido_externo(plataforma="IFOOD"):
        if plataforma not in DeliverySimulator.PLATAFORMAS:
            plataforma = random.choice(DeliverySimulator.PLATAFORMAS)

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM produtos WHERE categoria LIKE '%Pizzas%' ORDER BY RANDOM() LIMIT 2")
        prods = [dict(row) for row in cursor.fetchall()]

        cursor.execute("SELECT * FROM clientes ORDER BY RANDOM() LIMIT 1")
        cliente = dict(cursor.fetchone())

        cursor.execute("SELECT * FROM bairros_frete WHERE nome = ?", (cliente.get("bairro", "Centro"),))
        bairro_info = cursor.fetchone()
        frete = bairro_info["valor_frete"] if bairro_info else 8.00
        conn.close()

        itens_pedido = []
        for p in prods:
            itens_pedido.append({
                "id": p["id"],
                "nome": p["nome"],
                "preco": p["preco"],
                "quantidade": random.choice([1, 2]),
                "adicionais": ["Bacon extra", "Borda Catupiry"]
            })

        payload = {
            "origem": plataforma,
            "cliente_id": cliente["id"],
            "cliente_nome": f"{cliente['nome']} ({plataforma})",
            "cliente_telefone": cliente["telefone"],
            "cliente_endereco": f"{cliente['endereco']}, {cliente['bairro']} - {cliente['complemento']}",
            "itens": itens_pedido,
            "taxa_entrega": frete,
            "desconto": 0.0,
            "forma_pagamento": "PIX" if plataforma == "IFOOD" else "CARTAO_CREDITO",
            "detalhes_pagamento": {
                "provedor": plataforma,
                "transacao_id": f"EXT-{random.randint(100000, 999999)}",
                "status": "APROVADO"
            },
            "status": "EM_PREPARO"
        }

        return PedidoService.criar_pedido(payload)

class ClienteService:
    @staticmethod
    def normalizar_telefone(tel):
        """Mantém a formatação do telefone e aceita formato numérico contínuo como 1140028922"""
        if not tel:
            return ""
        tel_limpo = re.sub(r'[^0-9]', '', str(tel))
        if len(tel_limpo) == 10: # (XX) XXXX-XXXX -> XX XXXX-XXXX ou formatação direta
            return f"({tel_limpo[:2]}) {tel_limpo[2:6]}-{tel_limpo[6:]}"
        elif len(tel_limpo) == 11: # (XX) 9XXXX-XXXX
            return f"({tel_limpo[:2]}) {tel_limpo[2:7]}-{tel_limpo[7:]}"
        return tel.strip()

    @staticmethod
    def normalizar_cpf(cpf):
        """Aplica formatação padrão de CPF: 000.000.000-00"""
        if not cpf:
            return ""
        cpf_limpo = re.sub(r'[^0-9]', '', str(cpf))
        if len(cpf_limpo) == 11:
            return f"{cpf_limpo[:3]}.{cpf_limpo[3:6]}.{cpf_limpo[6:9]}-{cpf_limpo[9:]}"
        return cpf.strip()

    @staticmethod
    def buscar(query=""):
        conn = get_connection()
        cursor = conn.cursor()
        if query:
            q = f"%{query}%"
            cursor.execute("SELECT * FROM clientes WHERE nome LIKE ? OR telefone LIKE ? OR cpf LIKE ? LIMIT 30", (q, q, q))
        else:
            cursor.execute("SELECT * FROM clientes ORDER BY id DESC LIMIT 30")
        clientes = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return clientes

    @staticmethod
    def salvar(dados):
        conn = get_connection()
        cursor = conn.cursor()
        telefone = ClienteService.normalizar_telefone(dados.get("telefone", ""))
        cpf = ClienteService.normalizar_cpf(dados.get("cpf", ""))

        if dados.get("id"):
            cursor.execute("""
                UPDATE clientes SET nome = ?, cpf = ?, telefone = ?, endereco = ?, bairro = ?, complemento = ?
                WHERE id = ?
            """, (dados["nome"], cpf, telefone, dados.get("endereco"), dados.get("bairro"), dados.get("complemento"), dados["id"]))
            cliente_id = dados["id"]
        else:
            cursor.execute("""
                INSERT INTO clientes (nome, cpf, telefone, endereco, bairro, complemento, criado_em)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (dados["nome"], cpf, telefone, dados.get("endereco"), dados.get("bairro"), dados.get("complemento"), datetime.now().isoformat()))
            cliente_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return {"success": True, "cliente_id": cliente_id}

    @staticmethod
    def deletar(cliente_id):
        conn = get_connection()
        cursor = conn.cursor()
        # Desvincular pedidos ou preservar histórico de vendas definindo cliente_id = NULL
        cursor.execute("UPDATE pedidos SET cliente_id = NULL WHERE cliente_id = ?", (cliente_id,))
        cursor.execute("DELETE FROM clientes WHERE id = ?", (cliente_id,))
        conn.commit()
        conn.close()
        return {"success": True}

class FreteService:
    @staticmethod
    def calcular_frete(bairro):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bairros_frete WHERE LOWER(nome) = LOWER(?)", (bairro.strip(),))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                "bairro": row["nome"],
                "distancia_km": row["distancia_km"],
                "valor_frete": row["valor_frete"],
                "tempo_estimado_min": row["tempo_estimado_min"]
            }
        return {
            "bairro": bairro,
            "distancia_km": 5.0,
            "valor_frete": 12.00,
            "tempo_estimado_min": 35
        }

    @staticmethod
    def listar_bairros():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bairros_frete ORDER BY nome ASC")
        rows = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return rows
