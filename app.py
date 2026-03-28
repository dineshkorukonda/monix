#!/usr/bin/env python3
"""
Monix - Web Security Monitoring

Entry point for the Monix API server. Runs the Flask API on port 3030 by default.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api.server import app  # noqa: E402


def main():
    port = int(os.environ.get("PORT", 3030))
    app.run(host="0.0.0.0", port=port, debug=False)


if __name__ == "__main__":
    main()
