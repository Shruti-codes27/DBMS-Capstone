"""
Vercel serverless entrypoint wrapping HospitalHandler from webapp/server.py.
Uses /tmp/hospital.db on Vercel because the deployment filesystem is read-only.
"""

import os
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import hospital
from webapp.server import HospitalHandler


class handler(HospitalHandler):
    def _ensure_db(self):
        hospital.init_db(seed=True)

    def do_GET(self):
        self._ensure_db()
        super().do_GET()

    def do_POST(self):
        self._ensure_db()
        super().do_POST()
