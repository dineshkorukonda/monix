# Monix Project Thesis & Architecture Plan

**Document Version:** 2.0.0  
**Status:** Active / Accepted  
**Associated GitHub Issues:** Resolves [#101](https://github.com/dineshkorukonda/monix/issues/101) (*rethink the project plan and reposition its main thesis*) & [#102](https://github.com/dineshkorukonda/monix/issues/102) (*check if its actually working or not, or faking the data*)

---

## 1. Executive Thesis: What is Monix?

> **Monix is an Open Website Reconnaissance & Health Intelligence Platform.**
> It delivers instant, zero-authentication external diagnostics (TLS cryptography, DNS records, HTTP security headers, Certificate Transparency subdomains, and SEO directives) alongside verifiable, continuous uptime monitoring with public status pages.

### The Problem Monix Solves
Traditional APM tools (Datadog, Dynatrace, New Relic) require internal host agents, kernel daemons, or application SDKs. They are expensive, walled-garden systems focused on internal host telemetry (CPU, RAM, kernel threads).

Conversely, external monitoring tools are either:
1. **Aggressive auth-walled paywalls** requiring sign-up just to inspect a single TLS certificate or security header.
2. **Fragmented point solutions** (e.g., one site for SecurityHeaders, another for SSL Labs, another for PageSpeed, another for crt.sh).
3. **Simulated/faked uptime tools** that paint synthetic sine waves and falsely claim 100% uptime when zero checks have run.

### The Monix Difference
* **Zero Auth Wall for Diagnostics**: Anyone can drop any domain into the landing page or Inspector and get a cryptographic and architectural breakdown in seconds.
* **100% Real, Honest Telemetry**: No synthetic sine waves, no fake jitter, and no fabricated uptime. Newly tracked sites or unprobed time slots honestly report `no_data` until verifiable checks accumulate.
* **Shareable Permalinks (`/r/[slug]`)**: Every scan generates an immutable report URL that security engineers, webmasters, and DevOps teams can share without logins.
* **Lightweight Continuous Monitoring**: Scheduled GitHub Actions workflows trigger lightweight edge probes, recording real historical response times, tracking outages, and dispatching webhook alerts on consecutive failures.

---

## 2. Product Architecture & Operational Tiers

Monix is organized into two primary pillars, with legacy container telemetry formally deprecated:

```mermaid
graph TD
    User([User / Webmaster / Engineer]) -->|Ad-hoc Scan Target| WebApp[Monix Web Client]
    WebApp -->|POST /api/scan| ScanEngine[Real Reconnaissance Engine]
    
    subgraph "Tier 1: Instant Ad-Hoc Reconnaissance (Zero-Auth)"
        ScanEngine --> TLSProbe[node:tls Socket Check<br/>X.509 Peer Cert Chain]
        ScanEngine --> DNSProbe[node:dns Promises<br/>A, AAAA, MX, NS, TXT]
        ScanEngine --> HTTPProbe[Redirect Tracer & Header Parser<br/>HSTS, CSP, XFO, XXP]
        ScanEngine --> SubdomainProbe[Passive crt.sh CT Discovery<br/>Wildcard DNS Filter + Probe]
        ScanEngine --> SEOProbe[HTML Parser<br/>Robots.txt, Sitemap, Canonical]
        ScanEngine --> DBReport[(Persisted Report /r/slug)]
    end

    subgraph "Tier 2: Registered Target Monitoring"
        GHA[GitHub Actions Cron<br/>Every 5 Minutes] -->|POST /api/cron/uptime| CronHandler[Uptime Checker Service]
        CronHandler --> TargetsDB[(monix_targets & uptime_checks)]
        CronHandler --> StateMachine{>=2 Consecutive Failures?}
        StateMachine -->|Yes| Incident[(public.incidents)]
        StateMachine -->|Yes| Webhooks[Webhook Dispatcher]
        TargetsDB --> PublicStatus[/status/slug Public Pages]
        TargetsDB --> FleetRadar[/radar Fleet Overview]
    end
```

### Pillar 1: Instant Ad-Hoc Reconnaissance (Zero-Auth)
* **TLS Certificate Chain**: Connects directly via Node's `tls.connect` to port 443, retrieving actual peer certificate details: subject CN/SANs, certificate issuer, cryptographic signature algorithm, valid dates, and days remaining.
* **DNS Infrastructure**: Direct Node DNS resolution (`dns.resolve4`, `dns.resolve6`, `dns.resolveMx`, `dns.resolveNs`, `dns.resolveTxt`) to audit routing and SPF records.
* **HTTP Security Headers**: Follows HTTP 3xx redirects up to 8 hops, scoring compliance against modern security baselines (`Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).
* **Passive & Active Subdomain Enumeration**: Queries Certificate Transparency logs via `crt.sh`, filters false-positives using active wildcard DNS detection, and probes live HTTP responsiveness for active hosts.
* **SEO & Crawl Directives**: Inspects `<title>`, `<meta name="description">`, canonical links, OpenGraph metadata, `robots.txt`, and XML sitemaps.

### Pillar 2: Registered Target Monitoring & Public Status Portals
* **Database Registry**: Monitored endpoints stored in `public.monix_targets`.
* **Zero-Infrastructure Execution**: Uses a scheduled GitHub Actions cron to execute checks every 5 minutes against `/api/cron/uptime`, storing check status, status code, and latency in `public.uptime_checks`.
* **Incident State Machine**:
  * An incident is **never** triggered on a single isolated transient blip.
  * Incidents open only after **2 consecutive failures** for the same target.
  * Active incidents automatically transition to `resolved` as soon as the target recovers.
* **Public Status Portals (`/status/[site]`)**:
  * Renders authentic 24-hour response time latency charts and 30-day incident histories.
  * Clearly denotes missing telemetry as *"Awaiting baseline telemetry"* rather than interpolating artificial curves.

### Formally Deprecated / Retired Residue
* **Host Daemon Endpoints** (`/api/system-stats`, `/api/processes`, `/api/overview-data`):
  * Previously returned `os.freemem()` and `os.totalmem()` of the Next.js serverless execution container or empty static arrays (`processes: []`).
  * These endpoints have been marked deprecated as host-container telemetry is irrelevant to external target monitoring.

---

## 3. Data Authenticity Audit (Issue #102 Resolution)

### Audit Findings
Prior to this update, a code audit revealed that while the core URL scan pipeline was 100% genuine, historical latency graphs in `/radar`, `/private-sites`, and `/status/[site]` synthesized artificial data:

| Component | Previous Behavior (Faked) | New Behavior (100% Real) |
|---|---|---|
| **24h Latency Curves** | If `< 12` check records existed, synthesized 24 points using `1 + Math.sin(i * 1.5) * 0.08` jitter. | Returns only genuine recorded points. If no checks exist, UI renders *"Awaiting baseline telemetry"*. |
| **Hourly Slots (24h Matrix)** | When 0 checks existed for an hour, synthesized `totalChecks: 1`, `uptimePercent: 100%`, and sine-wave latency. | Correctly outputs `status: "no_data"`, `totalChecks: 0`, and `uptimePercent: 0`. |
| **30-Day Availability Tiles** | Defaulted to 100% green uptime tiles when 0 checks were recorded for a day. | Outputs `status: "no_data"` with neutral dark styling. |
| **Landing Page Hero** | Required navigating to `/inspector` despite claiming instant homepage scans. | Added `HeroScanForm` directly on the landing page for immediate zero-auth reconnaissance. |

All instances of `Math.sin` jitter curves have been eradicated from the codebase.

---

## 4. Product Roadmap

### Phase 1: Core Foundation (Completed)
- [x] Zero-auth public scan engine (`/api/scan`).
- [x] TLS socket certificate extraction and DNS resolver.
- [x] Subdomain discovery via Certificate Transparency (`crt.sh`).
- [x] Shareable public report permalinks (`/r/[slug]`).
- [x] Rate limiting and URL validation.

### Phase 2: Telemetry Integrity & Repositioning (Current Release)
- [x] Full audit of scan engine vs. historical telemetry (Issue #102).
- [x] Complete removal of synthetic sine-wave jitter and fake uptime blocks.
- [x] Honest empty states ("Awaiting baseline telemetry") in Radar and Status pages.
- [x] Hero scan box embedded directly on homepage (`/`).
- [x] Formal project thesis and architectural plan (Issue #101).

### Phase 3: Enhanced Alerting & Health Probing (Next Up)
- [ ] Multi-channel webhook integrations (Discord, Slack, Telegram).
- [ ] Proactive TLS expiration email notifications (30, 14, and 7-day thresholds).
- [ ] Automated broken link and mixed-content crawler in `/r/[slug]`.
- [ ] Historical DNS record change detection (alerting if `A` or `MX` records drift unexpectedly).
