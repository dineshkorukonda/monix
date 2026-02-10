# Monix

Intrusion Monitoring & Defense for Linux Servers

Monix is an open-source security tool that provides real-time threat monitoring, connection intelligence, and behavior-based attack detection.

## About This Repository

This repository contains **monix-engine** - the core security logic and analysis engine that powers the Monix ecosystem. It includes CLI tools for server monitoring and a comprehensive web application for URL security analysis.

**Primary Product:** [monix-web](./web) - A modern web application for comprehensive URL security scanning, SSL validation, DNS analysis, and threat detection. Built with Next.js and powered by monix-engine's security engine.

**CLI Tools:** This repository also includes command-line tools for Linux server monitoring and intrusion detection. These tools leverage the same monix-engine logic that powers monix-web. The CLI entry point is `monix-cli`.

📖 **Read about Monix Core:** Learn about the architecture, design decisions, and the story behind Monix at [dineshkorukonda.in/blogs/monix](https://dineshkorukonda.in/blogs/monix)

For more technical articles and updates, visit: [dineshkorukonda.in/blogs](https://dineshkorukonda.in/blogs)

## Testing

Monix includes a comprehensive test suite with 103 tests covering all core functionality:
- Engine collectors (system stats, processes)
- Threat analyzers (SYN floods, port scans, connection analysis)
- Traffic analyzers (log parsing, suspicious URLs, malicious bots)
- Web security scanners (SSL, DNS, HTTP headers, port scanning)
- API server endpoints

Run tests with:
```bash
pytest tests/
```

See [tests/README.md](./tests/README.md) for detailed test documentation.

## License

MIT License - Developed by [dineshkorukonda.in](https://dineshkorukonda.in)
