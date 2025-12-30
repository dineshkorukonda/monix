"""
CLI command module for suspicious traffic analysis and display.

This module provides the 'traffic' command that displays a summary of
suspicious inbound traffic based on Nginx access log analysis. It presents
key information including IP addresses, hit counts, and targeted endpoints
to support quick incident analysis and response.
"""

import os
import sys
from datetime import datetime
from typing import Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.traffic import (
    get_traffic_summary,
    classify_threat_level,
    DEFAULT_LOG_PATH,
)
from utils.logger import log_info, log_warn, log_error, log_success, Colors as C


def format_urls(urls: list, max_display: int = 3) -> str:
    """
    Format list of URLs for display with truncation.
    
    Args:
        urls: List of suspicious URLs
        max_display: Maximum number of URLs to show
        
    Returns:
        Formatted URL string
    """
    if not urls:
        return "-"
    
    displayed = urls[:max_display]
    formatted = ", ".join(displayed)
    
    if len(urls) > max_display:
        formatted += f" (+{len(urls) - max_display} more)"
    
    return formatted


def run(
    log_path: str = DEFAULT_LOG_PATH,
    window: int = 10,
    limit: int = 15,
    output_json: bool = False
) -> None:
    """
    Run the traffic analysis command.
    
    Args:
        log_path: Path to Nginx access log file
        window: Time window in minutes for analysis
        limit: Maximum number of suspicious IPs to display
        output_json: Output in JSON format
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print()
    log_info(f"Analyzing traffic from: {log_path}")
    log_info(f"Time window: Last {window} minutes")
    
    # Get traffic summary
    summary = get_traffic_summary(log_path, window)
    
    if not summary["log_exists"]:
        log_error(f"Log file not found: {log_path}")
        print()
        print(f"  {C.DIM}Nginx access log is not accessible.{C.RESET}")
        print(f"  {C.DIM}Ensure the file exists and you have read permissions.{C.RESET}")
        print()
        print(f"  {C.DIM}Common log locations:{C.RESET}")
        print(f"    • /var/log/nginx/access.log")
        print(f"    • /var/log/nginx/access.log.1")
        print(f"    • /usr/local/var/log/nginx/access.log (macOS)")
        print()
        return
    
    if output_json:
        import json
        # Convert NamedTuples to dicts for JSON serialization
        output = {
            "timestamp": timestamp,
            "window_minutes": summary["window_minutes"],
            "total_requests": summary["total_requests"],
            "unique_ips": summary["unique_ips"],
            "total_404s": summary["total_404s"],
            "high_risk_hits": summary["high_risk_hits"],
            "malicious_bot_requests": summary["malicious_bot_requests"],
            "suspicious_ips": [
                {
                    "ip": ip.ip,
                    "total_hits": ip.total_hits,
                    "suspicious_urls": ip.suspicious_urls,
                    "status_404_count": ip.status_404_count,
                    "malicious_bot": ip.malicious_bot,
                    "high_rate": ip.high_rate,
                    "threat_score": ip.threat_score
                }
                for ip in summary["suspicious_ips"][:limit]
            ]
        }
        print(json.dumps(output, indent=2))
        return
    
    # Display summary header
    print()
    print(f"{C.DIM}[{timestamp}]{C.RESET} {C.BOLD}Traffic Analysis Summary{C.RESET}")
    print(f"{C.DIM}{'─' * 60}{C.RESET}")
    print(f"  {C.DIM}Total Requests:{C.RESET}      {C.WHITE}{summary['total_requests']:,}{C.RESET}")
    print(f"  {C.DIM}Unique IPs:{C.RESET}          {C.WHITE}{summary['unique_ips']:,}{C.RESET}")
    print(f"  {C.DIM}404 Responses:{C.RESET}       {C.YELLOW if summary['total_404s'] > 10 else C.WHITE}{summary['total_404s']:,}{C.RESET}")
    print(f"  {C.DIM}High-Risk Hits:{C.RESET}      {C.RED if summary['high_risk_hits'] > 0 else C.GREEN}{summary['high_risk_hits']:,}{C.RESET}")
    print(f"  {C.DIM}Malicious Bot Reqs:{C.RESET}  {C.RED if summary['malicious_bot_requests'] > 0 else C.GREEN}{summary['malicious_bot_requests']:,}{C.RESET}")
    print(f"{C.DIM}{'─' * 60}{C.RESET}")
    
    suspicious_ips = summary["suspicious_ips"]
    
    if not suspicious_ips:
        print()
        log_success("No suspicious traffic detected in the analysis window")
        print()
        return
    
    # Display suspicious traffic table
    print()
    print(f"{C.BOLD}{C.RED}⚠ Suspicious Traffic (Last {window} mins){C.RESET} {C.DIM}({len(suspicious_ips)} IPs flagged){C.RESET}")
    print(f"{C.DIM}{'─' * 90}{C.RESET}")
    
    # Table header
    print(f"  {C.DIM}{'IP ADDRESS':<18} {'HITS':>6} {'THREAT':>8} {'404s':>5} {'BOT':>4}  {'SUSPICIOUS URLS'}{C.RESET}")
    print(f"{C.DIM}{'─' * 90}{C.RESET}")
    
    # Display rows
    for ip_data in suspicious_ips[:limit]:
        level_name, level_color = classify_threat_level(ip_data.threat_score)
        
        # Color-code based on threat level
        if level_color == "red":
            ip_color = C.RED
            threat_display = f"{C.RED}{C.BOLD}{level_name}{C.RESET}"
        elif level_color == "yellow":
            ip_color = C.YELLOW
            threat_display = f"{C.YELLOW}{level_name}{C.RESET}"
        elif level_color == "cyan":
            ip_color = C.CYAN
            threat_display = f"{C.CYAN}{level_name}{C.RESET}"
        else:
            ip_color = C.WHITE
            threat_display = f"{C.WHITE}{level_name}{C.RESET}"
        
        # Bot indicator
        bot_indicator = f"{C.RED}YES{C.RESET}" if ip_data.malicious_bot else f"{C.DIM}no{C.RESET}"
        
        # 404 count coloring
        if ip_data.status_404_count >= 10:
            count_404 = f"{C.RED}{ip_data.status_404_count:>5}{C.RESET}"
        elif ip_data.status_404_count >= 5:
            count_404 = f"{C.YELLOW}{ip_data.status_404_count:>5}{C.RESET}"
        else:
            count_404 = f"{C.DIM}{ip_data.status_404_count:>5}{C.RESET}"
        
        # Format URLs
        urls_display = format_urls(ip_data.suspicious_urls, max_display=3)
        if ip_data.suspicious_urls:
            urls_display = f"{C.MAGENTA}{urls_display}{C.RESET}"
        else:
            urls_display = f"{C.DIM}{urls_display}{C.RESET}"
        
        print(
            f"  {ip_color}{ip_data.ip:<18}{C.RESET} "
            f"{C.WHITE}{ip_data.total_hits:>6}{C.RESET} "
            f"{threat_display:>17} "
            f"{count_404} "
            f"{bot_indicator:>13}  "
            f"{urls_display}"
        )
    
    print(f"{C.DIM}{'─' * 90}{C.RESET}")
    
    # Summary footer
    critical_count = sum(1 for ip in suspicious_ips if ip.threat_score >= 50)
    high_count = sum(1 for ip in suspicious_ips if 30 <= ip.threat_score < 50)
    
    if critical_count > 0:
        print()
        log_warn(f"CRITICAL threats detected: {critical_count} IPs require immediate attention")
    
    if high_count > 0:
        log_warn(f"HIGH-risk IPs detected: {high_count}")
    
    # Actionable recommendations
    if suspicious_ips:
        print()
        print(f"{C.DIM}Recommended actions:{C.RESET}")
        if critical_count > 0:
            print(f"  {C.RED}•{C.RESET} Consider blocking critical threat IPs immediately")
        print(f"  {C.YELLOW}•{C.RESET} Review access patterns for flagged IPs")
        print(f"  {C.CYAN}•{C.RESET} Check fail2ban or firewall rules")
    
    print()

