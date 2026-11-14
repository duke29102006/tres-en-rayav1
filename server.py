import json
import os
import sqlite3
from contextlib import closing
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse


ROOT = Path(__file__).resolve().parent
DATABASE = Path(os.environ.get("DATABASE_PATH", ROOT / "scores.sqlite3"))


def connect_database(database=DATABASE):
    connection = sqlite3.connect(database)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database(database=DATABASE):
    with closing(connect_database(database)) as connection, connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS scores (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                player1 INTEGER NOT NULL DEFAULT 0 CHECK (player1 >= 0),
                player2 INTEGER NOT NULL DEFAULT 0 CHECK (player2 >= 0),
                draws INTEGER NOT NULL DEFAULT 0 CHECK (draws >= 0)
            )
            """
        )
        connection.execute(
            "INSERT OR IGNORE INTO scores (id, player1, player2, draws) VALUES (1, 0, 0, 0)"
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                result TEXT NOT NULL CHECK (result IN ('player1', 'player2', 'draw')),
                mode TEXT NOT NULL CHECK (mode IN ('ai', 'pvp')),
                moves INTEGER NOT NULL CHECK (moves BETWEEN 0 AND 27),
                played_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


def get_scores(database=DATABASE):
    with closing(connect_database(database)) as connection, connection:
        row = connection.execute(
            "SELECT player1, player2, draws FROM scores WHERE id = 1"
        ).fetchone()
        return dict(row)


def record_game(result, mode, moves, database=DATABASE):
    if not isinstance(result, str) or result not in {"player1", "player2", "draw"}:
        raise ValueError("El resultado de la partida no es válido.")
    if not isinstance(mode, str) or mode not in {"ai", "pvp"}:
        raise ValueError("El modo de juego no es válido.")
    if type(moves) is not int or not 0 <= moves <= 27:
        raise ValueError("La cantidad de movimientos no es válida.")

    score_column = "draws" if result == "draw" else result
    with closing(connect_database(database)) as connection, connection:
        connection.execute(
            "UPDATE scores SET " + score_column + " = " + score_column + " + 1 WHERE id = 1"
        )
        connection.execute(
            "INSERT INTO games (result, mode, moves) VALUES (?, ?, ?)",
            (result, mode, moves),
        )
        row = connection.execute(
            "SELECT player1, player2, draws FROM scores WHERE id = 1"
        ).fetchone()
        return dict(row)


class GameRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = unquote(urlparse(self.path).path)
        if path == "/scores.sqlite3":
            self.send_json(404, {"error": "Recurso no encontrado."})
            return
        if path == "/api/health":
            self.send_json(200, {"status": "ok"})
            return
        if path == "/api/scores":
            self.send_json(200, get_scores())
            return
        if path.startswith("/api/"):
            self.send_json(404, {"error": "Ruta de API no encontrada."})
            return
        super().do_GET()

    def do_POST(self):
        if unquote(urlparse(self.path).path) != "/api/games":
            self.send_json(404, {"error": "Ruta de API no encontrada."})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 2048:
                raise ValueError("El tamaño de la solicitud no es válido.")
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError("El formato de la solicitud no es válido.")
            scores = record_game(
                payload.get("result"),
                payload.get("mode"),
                payload.get("moves"),
            )
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as error:
            self.send_json(400, {"error": str(error)})
            return

        self.send_json(201, {"scores": scores})


def main():
    initialize_database()
    host = os.environ.get("HOST", "0.0.0.0" if "PORT" in os.environ else "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), GameRequestHandler)
    print(f"Servidor activo en http://{host}:{port} (Ctrl+C para detener)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
