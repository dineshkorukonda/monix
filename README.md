# Monix

Intrusion Monitoring & Defense for Linux Servers

Monix is an open-source host-level security tool that provides real-time threat monitoring, connection intelligence, and behavior-based attack detection for modern Linux servers.

## Products

Monix consists of **2 separate products**:

### 1. monix-linux 

A CLI tool for Linux server security monitoring and intrusion detection.

**Features:**
- Real-time connection monitoring
- Threat detection (SYN floods, port scans, high connection counts)
- GeoIP intelligence
- Process tracking
- Security scanning
- Terminal-based dashboard (`--watch`)
- Clean CLI interface

### 2. monix-web

A separate, independently deployed Next.js web application for web security analysis.

**Features:**
- URL security scanning
- SSL certificate validation
- DNS record analysis
- Security headers assessment
- Port scanning
- Technology stack detection
- Geographic intelligence

**Note:** monix-web uses monix-core (shared from this repository) but is deployed as a separate product. It is NOT part of this CLI tool.

## Features

This repository (monix-linux) provides:
- Real-time connection monitoring
- Threat detection (SYN floods, port scans, high connection counts)
- GeoIP intelligence
- Process tracking
- Security scanning
- Clean CLI interface
- Live terminal dashboard (`--watch`)

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
monix --monitor --json

# Filter connections by state
monix connections --state ESTABLISHED
monix connections --state LISTEN --limit 50

# Custom refresh interval
monix watch --refresh 5

# Deep security scan
monix scan --deep
```

## Example Output

```
[2025-12-28 00:15:01] INFO: Initializing connection collector...
[2025-12-28 00:15:02] INFO: Threat detection engine active.
[2025-12-28 00:15:02] INFO: Live TCP connections: 24 | Established: 18 | Listening: 6
[2025-12-28 00:15:02] INFO: Top processes: nginx(12), node(6), sshd(4)
[2025-12-28 00:15:02] INFO: Status: SECURE | Host: my-server
```

## Security Checks

The `scan --deep` command performs:

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

- Developed by dineshkorukonda.in
