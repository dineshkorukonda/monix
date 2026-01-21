# Monix Web

**Comprehensive Web Security Analysis & Threat Intelligence Platform**

Monix Web is a modern, high-performance web application for real-time URL security scanning, SSL certificate validation, DNS analysis, and threat detection. Built with Next.js and powered by **monix-core's security engine**.

## Features

### Core Security Analysis
- **URL Security Scanning** - Comprehensive domain and URL threat assessment
- **SSL/TLS Certificate Validation** - Full certificate chain analysis, expiry tracking, and issuer verification
- **DNS Record Analysis** - A, AAAA, MX, NS, TXT, and CNAME record inspection
- **Security Headers Assessment** - HSTS, CSP, X-Frame-Options, and modern security header scoring
- **Port Scanning** - Common service discovery (HTTP, HTTPS, SSH, FTP, databases)
- **Technology Stack Detection** - Server, CMS, framework, and library identification
- **Geographic Intelligence** - Precise server location and provider mapping
- **Real-time Threat Scoring** - Multi-factor security risk assessment

### Powered by monix-core
Monix Web leverages the battle-tested **monix-core** security engine, which includes:
- Advanced threat detection algorithms
- Connection intelligence and pattern analysis
- GeoIP resolution and network mapping
- Process and port analysis
- Real-time security scoring

All security logic resides in monix-core (`../core`), ensuring consistency, reliability, and reusability across the Monix ecosystem.
