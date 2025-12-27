# Monarx Sentinel

🛡️ **Next-Gen Intrusion Monitoring & Defense for Linux Servers**

Monarx Sentinel is an open-source host-level security tool that provides real-time threat monitoring, connection intelligence, and behavior-based attack detection — built for modern Linux servers.

## ✨ Features

- **Real-time Connection Monitoring** - Track all TCP connections in real-time
- **Threat Detection** - Detect SYN floods, port scans, and high connection counts
- **GeoIP Intelligence** - Identify connection origins globally
- **Process Tracking** - See which processes own each connection
- **Beautiful CLI** - Rich terminal interface with colors and formatting
- **Security Scanning** - Deep security audits on demand

## 🚀 Quick Start

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/monarx-sentinel.git
cd monarx-sentinel

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install in development mode
pip install -e .
```

### Usage

```bash
# Quick system snapshot
monarx-sentinel monitor

# One-line health check
monarx-sentinel status

# Live security dashboard
monarx-sentinel watch

# List connections
monarx-sentinel connections

# Show alerts
monarx-sentinel alerts

# Security scan
monarx-sentinel scan
monarx-sentinel scan --deep
```

## 📖 Commands

| Command | Description |
|---------|-------------|
| `monarx-sentinel monitor` | 📊 Quick snapshot of system status |
| `monarx-sentinel status` | ✅ One-line health check |
| `monarx-sentinel watch` | 👁️ Live security dashboard |
| `monarx-sentinel connections` | 🔗 List active connections |
| `monarx-sentinel alerts` | 🚨 Show recent security alerts |
| `monarx-sentinel scan` | 🔍 Quick security scan |

### Command Options

```bash
# Monitor with JSON output
monarx-sentinel monitor --json

# Filter connections by state
monarx-sentinel connections --state ESTABLISHED
monarx-sentinel connections --state LISTEN --limit 50

# Watch with custom refresh
monarx-sentinel watch --refresh 5

# Deep security scan
monarx-sentinel scan --deep
```

## 📁 Project Structure

```
monarx-sentinel/
├── cli/
│   ├── __init__.py          # Package init with version
│   ├── main.py               # CLI entry point
│   ├── commands/             # CLI commands
│   │   ├── __init__.py
│   │   ├── monitor.py        # Quick status snapshot
│   │   ├── status.py         # One-line health check
│   │   ├── watch.py          # Live dashboard
│   │   ├── connections.py    # Connection listing
│   │   ├── alerts.py         # Security alerts
│   │   └── scan.py           # Security scanning
│   ├── core/                 # Core functionality
│   │   ├── __init__.py
│   │   ├── collector.py      # Connection data gathering
│   │   ├── analyzer.py       # Traffic analysis & threat detection
│   │   └── scanner.py        # Security checks
│   └── utils/                # Utilities
│       ├── __init__.py
│       ├── display.py        # Formatting helpers
│       └── geo.py            # GeoIP & DNS utilities
├── src/                      # Legacy dashboard (optional)
├── pyproject.toml            # Package configuration
├── requirements.txt          # Dependencies
└── README.md
```

## 🔒 Security Checks

The `scan --deep` command performs these security checks:

| Check | Description |
|-------|-------------|
| SSH Port | Warns if SSH runs on default port 22 |
| Dangerous Ports | Detects FTP, Telnet, SMB, RDP, VNC |
| Listening Count | Warns if too many ports are open |
| External Access | Checks for external DB connections |
| Suspicious Outbound | Detects connections to backdoor ports |

## 🛠️ Requirements

- Python 3.8+
- Linux (primary) / macOS (limited support)
- Root/sudo for full process visibility

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Part of the Monarx Security Suite** 🛡️
