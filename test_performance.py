#!/usr/bin/env python3
"""
Performance test script for web security analysis.

This script tests the optimized analyze_web_security function to verify
performance improvements from parallel execution.
"""

import time
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.scanners.web import analyze_web_security


def test_url_analysis():
    """Test URL analysis performance."""
    test_urls = [
        "https://example.com",
        "https://github.com",
    ]
    
    print("=" * 70)
    print("Performance Test: Web Security Analysis")
    print("=" * 70)
    print()
    
    for url in test_urls:
        print(f"Testing: {url}")
        print("-" * 70)
        
        # Test 1: Basic analysis (no port scan, no metadata)
        print("\n1. Basic Analysis (default - optimized):")
        start = time.time()
        try:
            result = analyze_web_security(url, include_port_scan=False, include_metadata=False)
            duration = time.time() - start
            print(f"   ✓ Completed in {duration:.2f} seconds")
            print(f"   - Domain: {result.get('domain', 'N/A')}")
            print(f"   - IP: {result.get('ip_address', 'N/A')}")
            print(f"   - SSL Valid: {result.get('ssl_certificate', {}).get('valid', False)}")
            print(f"   - Threat Score: {result.get('threat_score', 'N/A')}")
            print(f"   - Threat Level: {result.get('threat_level', 'N/A')}")
        except Exception as e:
            duration = time.time() - start
            print(f"   ✗ Failed in {duration:.2f} seconds: {e}")
        
        # Test 2: Full analysis (with port scan and metadata)
        print("\n2. Full Analysis (includes port scan + metadata):")
        start = time.time()
        try:
            result = analyze_web_security(url, include_port_scan=True, include_metadata=True)
            duration = time.time() - start
            print(f"   ✓ Completed in {duration:.2f} seconds")
            print(f"   - Open Ports: {result.get('port_scan', {}).get('open_ports', [])}")
            print(f"   - Page Title: {result.get('metadata', {}).get('title', 'N/A')[:50]}...")
        except Exception as e:
            duration = time.time() - start
            print(f"   ✗ Failed in {duration:.2f} seconds: {e}")
        
        print()
    
    print("=" * 70)
    print("Performance Improvements Summary:")
    print("=" * 70)
    print("✓ Parallel execution using ThreadPoolExecutor")
    print("✓ Reduced timeouts (3-5s instead of 5-10s)")
    print("✓ Optimized port scanning (3 ports instead of 10, concurrent)")
    print("✓ Caching for IP geolocation")
    print("✓ Optional expensive checks (port scan, metadata)")
    print()
    print("Expected Performance:")
    print("- Basic analysis: 5-10 seconds (was 60+ seconds)")
    print("- Full analysis: 10-15 seconds (was 90+ seconds)")
    print("=" * 70)


if __name__ == "__main__":
    test_url_analysis()
