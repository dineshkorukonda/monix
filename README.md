# Monix

Intrusion Monitoring & Defense for Linux Servers

Monix is an open-source host-level security tool that provides real-time threat monitoring, connection intelligence, and behavior-based attack detection for modern Linux servers.

## Features

- Real-time connection monitoring
- Threat detection (SYN floods, port scans, high connection counts)
- GeoIP intelligence
- Process tracking
- Security scanning
- Clean CLI interface
- **monix-web <url>** (Instant CLI web security analysis)
- Live dashboard UI
- **Web Security Analyzer** (Modern Next.js interface)
- **Comprehensive URL Scanning** (SSL, DNS, Headers, Ports, Cookies)

## Quick Start

```bash
# Clone the repo
git clone https://github.com/dinexh/monix.git
cd monix

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install
pip install -e .
```

## Usage

```bash
# Quick system snapshot
monix --monitor

# One-line health check
monix --status

# Live security dashboard
monix --watch

# List connections
monix --connections

# Show alerts
monix --alerts

# Security scan
monix --scan
monix scan --deep

# Open web interface
monix --web
# or
monix web

# CLI Web Analysis
monix-web dineshkorkonda.in
# or
monix web mycrux.in
```


### Web Interface

Monix includes a comprehensive web-based interface with two main features:

#### 1. Server Dashboard (`/monix`)

Real-time monitoring dashboard showing:
- **System Statistics**: CPU, memory, disk usage, network I/O, uptime
- **Active Connections**: Live network connections with geo-location
- **Security Alerts**: Real-time threat detection alerts
- **Traffic Analysis**: Web traffic patterns and suspicious IP detection

**Quick Start**:
```bash
# Start API server and open dashboard
monix --web

# Or manually:
python api/server.py  # In one terminal
cd web && npm run dev -p 3500  # In another terminal
# Then visit http://localhost:3500/monix
```

#### 2. URL Security Analyzer (`/`)

Modern security scanner for analyzing URLs and web applications:
- SSL certificate validation
- DNS record analysis
- Security headers assessment
- Port scanning
- Technology stack detection
- Geographic intelligence

**Access**: Visit `http://localhost:3500` (or your server IP)

## Commands

| Command | Description |
|---------|-------------|
| `--monitor` / `-m` | Quick system snapshot |
| `--status` / `-s` | One-line health check |
| `--watch` / `-w` | Live security dashboard |
| `--connections` / `-c` | List active connections |
| `--alerts` / `-a` | Show security alerts |
| `--scan` | Security scan |
| `--web` | Open web interface (starts API server and opens browser) |

## Options

```bash
# JSON output
monix --monitor --json

# Filter connections by state
monix connections --state ESTABLISHED
monix connections --state LISTEN --limit 50

# Custom refresh interval
monix watch --refresh 5

# Deep security scan
monix scan --deep

# Web interface options
monix web --port 3030 --nextjs-port 3500
monix web --no-open  # Don't open browser automatically
```

## Example Output

```
[2025-12-28 00:15:01] INFO: Initializing connection collector...
[2025-12-28 00:15:02] INFO: Threat detection engine active.
[2025-12-28 00:15:02] INFO: Live TCP connections: 24 | Established: 18 | Listening: 6
[2025-12-28 00:15:02] INFO: Top processes: nginx(12), node(6), sshd(4)
[2025-12-28 00:15:02] INFO: Status: SECURE | Host: my-server
```

## Project Structure

```
monix/
├── core/              # Core logic modules
│   ├── collectors/    # Data collection (connections, system stats)
│   ├── analyzers/    # Analysis and threat detection
│   ├── scanners/     # Security scanning (system checks, web analysis)
│   └── monitoring/   # Monitoring engine and state management
├── utils/             # Utilities (logger, display, geo, network, processes)
├── cli/               # CLI commands and UI
│   ├── commands/     # CLI commands (monitor, status, watch, web, etc.)
│   └── ui.py         # Terminal-based watch dashboard UI
├── api/               # Flask REST API for web interface
├── web/               # Next.js frontend application
│   └── src/
│       ├── app/
│       │   ├── page.tsx      # URL Analyzer (home page)
│       │   └── web/
│       │       └── page.tsx  # Server Dashboard
│       └── components/       # React components
├── app.py             # Compatibility checker
├── pyproject.toml
└── README.md
```

## Security Checks

The `scan --deep` command and Web UI perform:

| Check | Description |
|-------|-------------|
| SSL Certificate | Full validation, expiry, and issuer details |
| DNS Records | A, AAAA, MX, NS, TXT record analysis |
| Security Headers | HSTS, CSP, X-Frame-Options scoring |
| Port Scanning | Common service discovery (HTTP, SSH, DB) |
| Technology Stack | Server, CMS, and Framework detection |
| Geographic Info | Precise server location and provider mapping |
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
