"""
Tests for Google Search Console helpers and API views (mocked HTTP).
"""

import json
import os
import sys
from unittest.mock import MagicMock, patch

import django

_CORE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "core")
if _CORE_DIR not in sys.path:
    sys.path.insert(0, _CORE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User  # noqa: E402
from django.test import Client, TestCase  # noqa: E402

from reports import gsc_client  # noqa: E402
from reports.models import (  # noqa: E402
    Target,
    UserSearchConsoleCredentials,
)


class GscClientMatchTest(TestCase):
    def test_sc_domain_matches_subdomain(self):
        assert gsc_client.gsc_property_matches_target(
            "sc-domain:example.com",
            "https://blog.example.com/page",
        )

    def test_sc_domain_matches_apex(self):
        assert gsc_client.gsc_property_matches_target(
            "sc-domain:example.com",
            "https://example.com/",
        )

    def test_url_prefix_matches_www(self):
        assert gsc_client.gsc_property_matches_target(
            "https://www.example.com/",
            "https://example.com/foo",
        )

    def test_non_match(self):
        assert not gsc_client.gsc_property_matches_target(
            "https://other.com/",
            "https://example.com/",
        )

    def test_pick_matching_site_url(self):
        sites = [
            {"siteUrl": "https://wrong.com/"},
            {"siteUrl": "sc-domain:example.com"},
        ]
        assert (
            gsc_client.pick_matching_site_url(sites, "https://www.example.com/x")
            == "sc-domain:example.com"
        )


class GscOAuthConnectTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="u1@example.com",
            email="u1@example.com",
            password="testpass12",
        )

    @patch.dict(
        os.environ,
        {
            "GOOGLE_CLIENT_ID": "cid",
            "GOOGLE_CLIENT_SECRET": "sec",
            "GOOGLE_REDIRECT_URI": "http://localhost:8000/api/gsc/callback/",
        },
        clear=False,
    )
    def test_connect_returns_authorization_url(self):
        c = Client()
        c.force_login(self.user)
        r = c.get("/api/gsc/connect/")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertIn("authorization_url", data)
        self.assertIn("accounts.google.com", data["authorization_url"])
        self.assertIn("webmasters.readonly", data["authorization_url"])


class GscSitesApiTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="u2@example.com",
            email="u2@example.com",
            password="testpass12",
        )
        UserSearchConsoleCredentials.objects.create(
            user=self.user,
            refresh_token_encrypted=gsc_client.encrypt_refresh_token("fake_refresh"),
            access_token="access",
            access_token_expires_at=None,
        )

    @patch("reports.gsc_client.requests.get")
    @patch("reports.gsc_client.requests.post")
    def test_sites_returns_list(self, mock_post, mock_get):
        mock_post.return_value = MagicMock(
            ok=True,
            json=lambda: {"access_token": "new", "expires_in": 3600},
        )
        mock_get.return_value = MagicMock(
            ok=True,
            json=lambda: {"siteEntry": [{"siteUrl": "https://ex.com/", "permissionLevel": "siteOwner"}]},
        )
        c = Client()
        c.force_login(self.user)
        r = c.get("/api/gsc/sites/")
        self.assertEqual(r.status_code, 200)
        sites = r.json()["sites"]
        self.assertEqual(len(sites), 1)
        self.assertEqual(sites[0]["siteUrl"], "https://ex.com/")


class TargetCreateSyncGscTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="u3@example.com",
            email="u3@example.com",
            password="testpass12",
        )

    @patch("reports.gsc_tokens.gsc_client.list_sites")
    @patch("reports.gsc_tokens.get_valid_access_token")
    def test_no_gsc_connection_skips_analytics(self, mock_token, mock_list_sites):
        mock_token.return_value = None
        c = Client()
        c.force_login(self.user)
        r = c.post(
            "/api/targets/",
            data=json.dumps({"url": "https://example.com"}),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 201)
        t = Target.objects.get(owner=self.user)
        self.assertIsNone(t.gsc_analytics)
        mock_list_sites.assert_not_called()

    @patch("reports.gsc_tokens.gsc_client.fetch_gsc_bundle_for_site")
    @patch("reports.gsc_tokens.gsc_client.list_sites")
    @patch("reports.gsc_tokens.get_valid_access_token")
    def test_sync_stores_analytics_when_property_matches(
        self, mock_token, mock_list, mock_fetch
    ):
        mock_token.return_value = "tok"
        mock_list.return_value = [{"siteUrl": "sc-domain:example.com"}]
        mock_fetch.return_value = {
            "summary": {"clicks": 1.0, "impressions": 10.0, "ctr": 0.1, "position": 2.0},
            "top_queries": [],
            "start_date": "2026-01-01",
            "end_date": "2026-01-28",
        }
        c = Client()
        c.force_login(self.user)
        r = c.post(
            "/api/targets/",
            data=json.dumps({"url": "https://www.example.com"}),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 201)
        body = r.json()
        self.assertEqual(body["gsc_property_url"], "sc-domain:example.com")
        self.assertIsNotNone(body["gsc_analytics"])


class GscSyncTargetsApiTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="u4@example.com",
            email="u4@example.com",
            password="testpass12",
        )

    def test_sync_requires_connection(self):
        c = Client()
        c.force_login(self.user)
        r = c.post("/api/gsc/sync-targets/")
        self.assertEqual(r.status_code, 400)

    @patch("reports.gsc_tokens.sync_target_search_console")
    def test_sync_runs_for_each_target(self, mock_sync):
        UserSearchConsoleCredentials.objects.create(
            user=self.user,
            refresh_token_encrypted=gsc_client.encrypt_refresh_token("rt"),
            access_token="at",
            access_token_expires_at=None,
        )
        Target.objects.create(owner=self.user, url="https://a.example.com")
        Target.objects.create(owner=self.user, url="https://b.example.com")
        c = Client()
        c.force_login(self.user)
        r = c.post("/api/gsc/sync-targets/")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["targets"], 2)
        self.assertEqual(mock_sync.call_count, 2)
