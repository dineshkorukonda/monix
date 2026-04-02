"""
Tests for Cloudflare integration (mocked Cloudflare HTTP).
"""

import json
import os
import sys

import django

_CORE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "core")
if _CORE_DIR not in sys.path:
    sys.path.insert(0, _CORE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User  # noqa: E402
from django.test import Client, TestCase  # noqa: E402
from unittest.mock import patch  # noqa: E402

from reports import gsc_client  # noqa: E402
from reports.cloudflare_client import ConnectSummary, fetch_zone_analytics_dashboard  # noqa: E402
from reports.models import UserCloudflareCredentials  # noqa: E402


class CloudflareConnectApiTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="cf@example.com",
            email="cf@example.com",
            password="testpass12",
        )

    @patch("reports.cloudflare_views.cloudflare_client.summarize_for_connect")
    def test_connect_stores_encrypted_token(self, mock_summary):
        mock_summary.return_value = ConnectSummary(
            account_id="acc1",
            account_name="My Account",
            zones_count=2,
        )
        c = Client()
        c.force_login(self.user)
        r = c.post(
            "/api/cloudflare/connect/",
            data=json.dumps({"api_token": "cf-token-secret"}),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["account_name"], "My Account")
        self.assertEqual(data["zones_count"], 2)
        row = UserCloudflareCredentials.objects.get(user=self.user)
        plain = gsc_client.decrypt_refresh_token(row.api_token_encrypted)
        self.assertEqual(plain, "cf-token-secret")

    def test_connect_requires_token(self):
        c = Client()
        c.force_login(self.user)
        r = c.post(
            "/api/cloudflare/connect/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)

    def test_status_disconnected(self):
        c = Client()
        c.force_login(self.user)
        r = c.get("/api/cloudflare/status/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["connected"], False)

    @patch("reports.cloudflare_views.cloudflare_client.summarize_for_connect")
    def test_status_connected_after_connect(self, mock_summary):
        mock_summary.return_value = ConnectSummary(
            account_id="a",
            account_name="Acc",
            zones_count=0,
        )
        c = Client()
        c.force_login(self.user)
        c.post(
            "/api/cloudflare/connect/",
            data=json.dumps({"api_token": "x"}),
            content_type="application/json",
        )
        r = c.get("/api/cloudflare/status/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["connected"], True)
        self.assertEqual(r.json()["account_name"], "Acc")

    @patch("reports.cloudflare_views.cloudflare_client.list_zones_all")
    def test_zones_returns_rows(self, mock_zones):
        mock_zones.return_value = [
            {
                "id": "z1",
                "name": "ex.com",
                "status": "active",
                "plan": {"name": "Free"},
            }
        ]
        UserCloudflareCredentials.objects.create(
            user=self.user,
            api_token_encrypted=gsc_client.encrypt_refresh_token("tok"),
        )
        c = Client()
        c.force_login(self.user)
        r = c.get("/api/cloudflare/zones/")
        self.assertEqual(r.status_code, 200)
        rows = r.json()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["name"], "ex.com")


class CloudflareGraphqlAnalyticsTest(TestCase):
    """GraphQL payload mapping (no real Cloudflare HTTP)."""

    def test_fetch_zone_analytics_dashboard_maps_graphql(self):
        sample = {
            "viewer": {
                "zones": [
                    {
                        "daily": [
                            {
                                "dimensions": {"date": "2026-04-01"},
                                "sum": {
                                    "requests": 10,
                                    "cachedRequests": 4,
                                    "bytes": 1000,
                                    "pageViews": 2,
                                    "threats": 1,
                                    "countryMap": [
                                        {
                                            "clientCountryName": "US",
                                            "requests": 7,
                                        }
                                    ],
                                    "responseStatusMap": [
                                        {"edgeResponseStatus": 200, "requests": 9}
                                    ],
                                },
                                "uniq": {"uniques": 3},
                            }
                        ]
                    }
                ]
            }
        }
        with patch(
            "reports.cloudflare_client._graphql",
            return_value=sample,
        ):
            out = fetch_zone_analytics_dashboard(
                "tok",
                zone_id="z1",
                zone_name="example.com",
                days=7,
            )
        self.assertEqual(out["zone_id"], "z1")
        self.assertEqual(out["totals"]["requests"], 10)
        self.assertEqual(out["totals"]["cached_requests"], 4)
        self.assertEqual(out["totals"]["bandwidth_bytes"], 1000)
        self.assertEqual(len(out["series"]), 1)
        self.assertEqual(out["series"][0]["date"], "2026-04-01")
        self.assertEqual(out["top_countries"][0]["country"], "US")
        self.assertEqual(out["status_codes"][0]["status"], "200")
