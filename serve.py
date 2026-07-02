#!/usr/bin/env python3
"""静态网页服务器 — 支持手机同 WiFi 访问"""
import http.server
import os
import socket
import socketserver
import webbrowser
from pathlib import Path
from threading import Timer

PORT = 8080
BASE_DIR = Path(__file__).parent


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "127.0.0.1"


def open_browser():
    webbrowser.open(f"http://127.0.0.1:{PORT}")


if __name__ == "__main__":
    os.chdir(BASE_DIR)
    local_ip = get_local_ip()

    print("=" * 50)
    print("  IELTS 单词背诵 — 在线网页版")
    print("=" * 50)
    print(f"  电脑浏览器:  http://127.0.0.1:{PORT}")
    print(f"  手机浏览器:  http://{local_ip}:{PORT}")
    print("  (手机需与电脑连接同一 WiFi)")
    print("=" * 50)
    print("  手机可「添加到主屏幕」像 App 一样使用")
    print("=" * 50)

    Timer(1.0, open_browser).start()

    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n已停止")
