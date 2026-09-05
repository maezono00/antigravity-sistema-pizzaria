import http.server
import socketserver
import json
import urllib.parse
import os
import mimetypes
from app.database import get_connection, init_db
from app.services import CaixaService, PedidoService, DeliverySimulator, ClienteService, FreteService

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

class PDVRequestHandler(http.server.BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/api/produtos":
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM produtos ORDER BY categoria ASC, nome ASC")
            produtos = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return self.send_json(produtos)

        elif path == "/api/caixa/atual":
            caixa = CaixaService.get_caixa_atual()
            return self.send_json(caixa)

        elif path == "/api/caixa/historico":
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM caixa_sessoes ORDER BY id DESC LIMIT 10")
            caixas = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return self.send_json(caixas)

        elif path == "/api/caixa/movimentacoes":
            caixa = CaixaService.get_caixa_atual()
            if not caixa:
                return self.send_json([])
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM caixa_movimentacoes WHERE caixa_id = ? ORDER BY id DESC", (caixa["id"],))
            movs = [dict(row) for row in cursor.fetchall()]
            conn.close()
            return self.send_json(movs)

        elif path == "/api/pedidos":
            status_filter = query.get("status", [None])[0]
            pedidos = PedidoService.listar_pedidos(status_filter)
            return self.send_json(pedidos)

        elif path == "/api/clientes":
            q = query.get("q", [""])[0]
            clientes = ClienteService.buscar(q)
            return self.send_json(clientes)

        elif path == "/api/frete/bairros":
            bairros = FreteService.listar_bairros()
            return self.send_json(bairros)

        elif path == "/api/frete/calcular":
            bairro = query.get("bairro", ["Centro"])[0]
            calculo = FreteService.calcular_frete(bairro)
            return self.send_json(calculo)

        else:
            if path == "/" or path == "":
                filepath = os.path.join(STATIC_DIR, "index.html")
            else:
                relpath = path.lstrip("/")
                filepath = os.path.join(STATIC_DIR, relpath)

            if os.path.isfile(filepath):
                mime, _ = mimetypes.guess_type(filepath)
                if not mime:
                    mime = "application/octet-stream"
                self.send_response(200)
                self.send_header("Content-Type", f"{mime}; charset=utf-8" if "text" in mime or "javascript" in mime or "json" in mime else mime)
                with open(filepath, "rb") as f:
                    content = f.read()
                    self.send_header("Content-Length", str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
            else:
                index_path = os.path.join(STATIC_DIR, "index.html")
                if os.path.exists(index_path):
                    with open(index_path, "rb") as f:
                        content = f.read()
                        self.send_response(200)
                        self.send_header("Content-Type", "text/html; charset=utf-8")
                        self.send_header("Content-Length", str(len(content)))
                        self.end_headers()
                        self.wfile.write(content)
                else:
                    self.send_response(404)
                    self.end_headers()
                    self.wfile.write(b"Not Found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        body = self.read_json_body()

        if path == "/api/pedidos":
            res = PedidoService.criar_pedido(body)
            return self.send_json(res, status=201)

        elif path == "/api/pedidos/status":
            pedido_id = body.get("pedido_id")
            novo_status = body.get("status")
            rota = body.get("rota_entregador")
            res = PedidoService.atualizar_status(pedido_id, novo_status, rota)
            return self.send_json(res)

        elif path == "/api/delivery/simular":
            plataforma = body.get("plataforma", "IFOOD")
            res = DeliverySimulator.simular_pedido_externo(plataforma)
            return self.send_json(res, status=201)

        elif path == "/api/clientes":
            res = ClienteService.salvar(body)
            return self.send_json(res, status=200)

        elif path == "/api/clientes/deletar":
            cliente_id = body.get("id")
            res = ClienteService.deletar(cliente_id)
            return self.send_json(res)

        elif path == "/api/caixa/abrir":
            operador = body.get("operador", "Operador de Caixa")
            saldo_inicial = body.get("saldo_inicial", 100.0)
            obs = body.get("observacoes", "")
            res = CaixaService.abrir_caixa(operador, saldo_inicial, obs)
            return self.send_json(res)

        elif path == "/api/caixa/movimentacao":
            tipo = body.get("tipo", "SANGRIA")
            valor = body.get("valor", 0.0)
            motivo = body.get("motivo", "")
            res = CaixaService.registrar_movimentacao(tipo, valor, motivo)
            return self.send_json(res)

        elif path == "/api/caixa/fechar":
            saldo_informado = body.get("saldo_dinheiro_informado", 0.0)
            obs = body.get("observacoes", "")
            res = CaixaService.fechar_caixa(saldo_informado, obs)
            return self.send_json(res)

        else:
            return self.send_json({"error": "Rota POST nao encontrada"}, status=404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path.startswith("/api/clientes"):
            cliente_id = query.get("id", [None])[0]
            if not cliente_id:
                # Tentar ler path /api/clientes/123
                parts = path.strip("/").split("/")
                if len(parts) >= 3 and parts[2].isdigit():
                    cliente_id = int(parts[2])
            if cliente_id:
                res = ClienteService.deletar(int(cliente_id))
                return self.send_json(res)
            return self.send_json({"error": "ID do cliente não informado"}, status=400)

        return self.send_json({"error": "Rota DELETE não encontrada"}, status=404)

def run_server(port=8000):
    init_db()
    with ReusableTCPServer(("", port), PDVRequestHandler) as httpd:
        print(f"============================================================")
        print(f"🚀 Sistema de Caixa e PDV iniciado com sucesso!")
        print(f"👉 Acesse a aplicação em: http://localhost:{port}")
        print(f"============================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nEncerrando servidor...")
            httpd.server_close()

if __name__ == "__main__":
    run_server(8000)
