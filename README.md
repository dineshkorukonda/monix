# Monarx Sentinel

Intrusion Monitoring & Defense for Linux Servers

Monarx Sentinel is an open-source host-level security tool that provides real-time threat monitoring, connection intelligence, and behavior-based attack detection for modern Linux servers.

## Features

- Real-time connection monitoring
- Threat detection (SYN floods, port scans, high connection counts)
- GeoIP intelligence
- Process tracking
- Security scanning
- Clean CLI interface

## Quick Start

```bash
# Clone the repo
git clone https://github.com/yourusername/monarx-sentinel.git
cd monarx-sentinel

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install
pip install -e .
```

## Usage

```bash
# Quick system snapshot
monarx-sentinel --monitor

# One-line health check
monarx-sentinel --status

# Live security dashboard
monarx-sentinel --watch

# List connections
monarx-sentinel --connections

# Show alerts
monarx-sentinel --alerts

# Security scan
monarx-sentinel --scan
monarx-sentinel scan --deep
```

## Example Output

```
[2025-12-28 00:15:01] INFO: Initializing connection collector...
[2025-12-28 00:15:02] INFO: Threat detection engine active.
[2025-12-28 00:15:02] INFO: Live TCP connections: 24 | Established: 18 | Listening: 6
[2025-12-28 00:15:02] INFO: Top processes: nginx(12), node(6), sshd(4)
[2025-12-28 00:15:02] INFO: Status: SECURE | Host: my-server
```

## Commands

| Command | Description |
|---------|-------------|
| `--monitor` / `-m` | Quick system snapshot |
| `--status` / `-s` | One-line health check |
| `--watch` / `-w` | Live security dashboard |
| `--connections` / `-c` | List active connections |
| `--alerts` / `-a` | Show security alerts |
| `--scan` | Security scan |

## Options

```bash
# JSON output
monarx-sentinel --monitor --json

# Filter connections by state
monarx-sentinel connections --state ESTABLISHED
monarx-sentinel connections --state LISTEN --limit 50

# Custom refresh interval
monarx-sentinel watch --refresh 5

# Deep security scan
monarx-sentinel scan --deep
```

## Project Structure

```
monarx-sentinel/
├── cli/
│   ├── __init__.py
│   ├── main.py
│   ├── commands/
│   │   ├── monitor.py
│   │   ├── status.py
│   │   ├── watch.py
│   │   ├── connections.py
│   │   ├── alerts.py
│   │   └── scan.py
│   ├── core/
│   │   ├── collector.py
│   │   ├── analyzer.py
│   │   └── scanner.py
│   └── utils/
│       ├── display.py
│       ├── geo.py
│       └── logger.py
├── pyproject.toml
├── requirements.txt
└── README.md
```

## Security Checks

The `scan --deep` command performs:

| Check | Description |
|-------|-------------|
| SSH Port | Warns if SSH runs on default port 22 |
| Dangerous Ports | Detects FTP, Telnet, SMB, RDP, VNC |
| Listening Count | Warns if too many ports are open |
| External Access | Checks for external DB connections |
| Suspicious Outbound | Detects connections to backdoor ports |

## Requirements

- Python 3.8+
- Linux (primary) / macOS (limited support)
- Root/sudo for full process visibility

## License

MIT License
