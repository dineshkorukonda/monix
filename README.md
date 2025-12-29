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
- Live dashboard UI

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

Or run the dashboard directly:

```bash
python app.py
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

## Project Structure

```
monix/
├── core/              # Core functionality (collector, analyzer, scanner, monitor, state)
├── shared/            # Shared utilities (network, geo, processes)
├── utils/             # CLI utilities (logger, display)
├── cli/               # CLI commands
├── dashboard/         # Dashboard UI
├── app.py             # Dashboard launcher
├── pyproject.toml
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

## Docker

### Services

**Sandbox (Development Environment)**
Interactive development and testing environment with network tools.

```bash
# Start sandbox (interactive shell)
docker-compose up sandbox

# Or run in background and exec into it
docker-compose up -d sandbox
docker exec -it monix_sandbox zsh
```

**Test Environment**
Environment with pytest and testing dependencies.

```bash
# Start test environment
docker-compose up test

# Run tests
docker-compose run test pytest

# Interactive shell
docker-compose run test /bin/bash
```

**Monix Service (Production)**
Run Monix commands on-demand (doesn't run continuously).

```bash
# Run Monix watch dashboard
docker-compose run monix bash -c "pip install -e . && monix --watch"

# Run other commands
docker-compose run monix bash -c "pip install -e . && monix --status"
docker-compose run monix bash -c "pip install -e . && monix --scan"
```

### Quick Commands

```bash
# Start sandbox for testing
docker-compose up sandbox

# Stop all containers
docker-compose down

# Rebuild sandbox image
docker-compose build sandbox
```

## License

MIT License
