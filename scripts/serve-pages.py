from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse


ROOT = Path(__file__).resolve().parent.parent / "dist"
BASE_PATH = "/serrurier"


class PagesHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def translate_path(self, path):
        path = unquote(urlsplit(path).path)
        if path == BASE_PATH:
            path = "/"
        elif path.startswith(f"{BASE_PATH}/"):
            path = path[len(BASE_PATH):]
        return super().translate_path(path)


parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, default=4173)
args = parser.parse_args()

server = ThreadingHTTPServer(("127.0.0.1", args.port), PagesHandler)
print(f"Serving dist at http://127.0.0.1:{args.port}{BASE_PATH}/", flush=True)
server.serve_forever()
