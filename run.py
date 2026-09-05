#!/usr/bin/env python3
"""
Script Principal de Execução - Sistema de Caixa & Gestão de Pedidos
Execute com: python3 run.py
"""
import os
import sys
import socket

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app.server import run_server

def find_available_port(start_port=8000, max_attempts=10):
    for port in range(start_port, start_port + max_attempts):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            s.bind(("0.0.0.0", port))
            s.close()
            return port
        except OSError:
            continue
    return start_port

if __name__ == "__main__":
    port = find_available_port(8000)
    run_server(port)
