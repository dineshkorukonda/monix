"""Tests for Supabase Bearer JWT auth on Django APIs."""

import json
import os
import sys
import time
import uuid
from unittest.mock import patch

import django
import jwt

_CORE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "core")
if _CORE_DIR not in sys.path:
    sys.path.insert(0, _CORE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.test import Client, TestCase  # noqa: E402
from django.urls import reverse  # noqa: E402
from django.contrib.auth.models import User  # noqa: E402

from reports.models import Target  # noqa: E402


def _token(sub: str, email: str) -> str:
    secret = os.environ.get("SUPABASE_JWT_SECRET", "test-supabase-jwt-secret")
    now = int(time.time())
    return jwt.encode(
        {
            "sub": sub,
            "email": email,
            "aud": "authenticated",
            "iat": now,
            "exp": now + 3600,
            "user_metadata": {"full_name": "Test User"},
        },
        secret,
        algorithm="HS256",
    )


class BearerAuthMeTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.h = {
            "HTTP_AUTHORIZATION": f"Bearer {_token('sb-' + uuid.uuid4().hex, 'me@example.com')}"
        }

    def test_me_requires_token(self):
        r = self.client.get(reverse("api_me"))
        self.assertEqual(r.status_code, 401)

    def test_me_returns_profile_fields(self):
        r = self.client.get(reverse("api_me"), **self.h)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["email"], "me@example.com")
        self.assertIn("initials", data)


class TargetsBearerAuthTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.h = {
            "HTTP_AUTHORIZATION": f"Bearer {_token('sb-' + uuid.uuid4().hex, 't@example.com')}"
        }

    def test_targets_list_requires_auth(self):
        r = self.client.get(reverse("api_targets"))
        self.assertEqual(r.status_code, 401)

    def test_targets_list_empty(self):
        r = self.client.get(reverse("api_targets"), **self.h)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), [])

    def test_targets_create_prepends_https_and_returns_201(self):
        r = self.client.post(
            reverse("api_targets"),
            data=json.dumps({"url": "example.com"}),
            content_type="application/json",
            **self.h,
        )
        self.assertEqual(r.status_code, 201)
        data = r.json()
        self.assertTrue(data["url"].startswith("https://"))


class TargetDetailBearerAuthTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.h1 = {
            "HTTP_AUTHORIZATION": f"Bearer {_token('sb-' + uuid.uuid4().hex, 'a@example.com')}"
        }
        self.h2 = {
            "HTTP_AUTHORIZATION": f"Bearer {_token('sb-' + uuid.uuid4().hex, 'b@example.com')}"
        }
        r = self.client.post(
            reverse("api_targets"),
            data=json.dumps({"url": "https://mine.example.com"}),
            content_type="application/json",
            **self.h1,
        )
        self.target_id = r.json()["id"]

    def test_detail_404_for_other_user(self):
        r = self.client.get(
            reverse("api_target_detail", kwargs={"target_id": self.target_id}),
            **self.h2,
        )
        self.assertEqual(r.status_code, 404)

    def test_detail_get_returns_target_json(self):
        r = self.client.get(
            reverse("api_target_detail", kwargs={"target_id": self.target_id}),
            **self.h1,
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["id"], str(self.target_id))

    def test_detail_delete_removes_target(self):
        r = self.client.delete(
            reverse("api_target_detail", kwargs={"target_id": self.target_id}),
            **self.h1,
        )
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Target.objects.filter(id=self.target_id).exists())


class AuthSignupApiTest(TestCase):
    def setUp(self):
        self.client = Client()

    def test_signup_creates_user_and_returns_201(self):
        email = f"new-{uuid.uuid4().hex[:8]}@example.com"
        r = self.client.post(
            reverse("api_signup"),
            data=json.dumps(
                {
                    "email": email,
                    "password": "longenough1",
                    "full_name": "Pat Example",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["email"], email)
        u = User.objects.get(email=email)
        self.assertEqual(u.first_name, "Pat")
        self.assertEqual(u.last_name, "Example")

    def test_signup_duplicate_email_returns_400(self):
        User.objects.create_user(
            username="dup@example.com",
            email="dup@example.com",
            password="longenough1",
        )
        r = self.client.post(
            reverse("api_signup"),
            data=json.dumps(
                {
                    "email": "dup@example.com",
                    "password": "longenough1",
                    "full_name": "Someone Else",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("already", r.json()["error"].lower())

    def test_signup_short_password_returns_400(self):
        r = self.client.post(
            reverse("api_signup"),
            data=json.dumps(
                {
                    "email": f"short-{uuid.uuid4().hex[:6]}@example.com",
                    "password": "short",
                    "full_name": "Short Pass",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)

    def test_signup_invalid_json_returns_400(self):
        r = self.client.post(
            reverse("api_signup"),
            data="{",
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)

    def test_signup_missing_full_name_returns_400(self):
        r = self.client.post(
            reverse("api_signup"),
            data=json.dumps(
                {
                    "email": f"noname-{uuid.uuid4().hex[:6]}@example.com",
                    "password": "longenough1",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("name", r.json()["error"].lower())

    def test_signup_split_first_last_name_legacy(self):
        email = f"legacy-{uuid.uuid4().hex[:8]}@example.com"
        r = self.client.post(
            reverse("api_signup"),
            data=json.dumps(
                {
                    "email": email,
                    "password": "longenough1",
                    "first_name": "Alex",
                    "last_name": "Rivera",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 201)
        u = User.objects.get(email=email)
        self.assertEqual(u.first_name, "Alex")
        self.assertEqual(u.last_name, "Rivera")


class AuthSessionApiTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="me@example.com",
            email="me@example.com",
            password="session-pass-1",
        )
        self.user.first_name = "Morgan"
        self.user.last_name = "Lee"
        self.user.save()

    def test_me_requires_login(self):
        r = self.client.get(reverse("api_me"))
        self.assertEqual(r.status_code, 401)

    def test_me_returns_profile_fields(self):
        self.client.force_login(self.user)
        r = self.client.get(reverse("api_me"))
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["email"], "me@example.com")
        self.assertEqual(data["name"], "Morgan Lee")
        self.assertEqual(data["initials"], "ML")

    def test_logout_returns_ok(self):
        self.client.force_login(self.user)
        r = self.client.post(reverse("api_logout"))
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["ok"])
        r2 = self.client.get(reverse("api_me"))
        self.assertEqual(r2.status_code, 401)


class ProfileApiTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="prof@example.com",
            email="prof@example.com",
            password="profile-pass-1",
        )

    def test_profile_requires_auth(self):
        r = self.client.patch(
            reverse("api_profile"),
            data=json.dumps({"first_name": "X"}),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 401)

    def test_profile_updates_names_and_initials(self):
        self.client.force_login(self.user)
        r = self.client.patch(
            reverse("api_profile"),
            data=json.dumps({"first_name": "Sam", "last_name": "River"}),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["name"], "Sam River")
        self.assertEqual(data["initials"], "SR")
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Sam")


class PasswordChangeApiTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="pwd@example.com",
            email="pwd@example.com",
            password="original-pass-1",
        )

    def test_wrong_old_password_returns_400(self):
        self.client.force_login(self.user)
        r = self.client.post(
            reverse("api_change_password"),
            data=json.dumps(
                {"old_password": "nope", "new_password": "new-password-2"}
            ),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 400)

    def test_success_changes_password_and_keeps_session(self):
        self.client.force_login(self.user)
        r = self.client.post(
            reverse("api_change_password"),
            data=json.dumps(
                {"old_password": "original-pass-1", "new_password": "new-password-2"}
            ),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("new-password-2"))
        r_me = self.client.get(reverse("api_me"))
        self.assertEqual(r_me.status_code, 200)


class TargetsApiTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="tgt@example.com",
            email="tgt@example.com",
            password="targets-pass-1",
        )

    def test_targets_list_requires_auth(self):
        r = self.client.get(reverse("api_targets"))
        self.assertEqual(r.status_code, 401)

    def test_targets_list_empty(self):
        self.client.force_login(self.user)
        r = self.client.get(reverse("api_targets"))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json(), [])

    @patch("reports.views.gsc_tokens.sync_target_search_console")
    def test_targets_create_prepends_https_and_returns_201(self, _sync):
        self.client.force_login(self.user)
        r = self.client.post(
            reverse("api_targets"),
            data=json.dumps({"url": "example.com", "environment": "prod"}),
            content_type="application/json",
        )
        self.assertEqual(r.status_code, 201)
        data = r.json()
        self.assertEqual(data["url"], "https://example.com")
        self.assertEqual(data["environment"], "prod")
        t = Target.objects.get(id=data["id"])
        self.assertEqual(t.owner_id, self.user.id)


class TargetDetailApiTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username="td@example.com",
            email="td@example.com",
            password="detail-pass-1",
        )
        self.other = User.objects.create_user(
            username="other@example.com",
            email="other@example.com",
            password="other-pass-11",
        )
        self.target = Target.objects.create(
            owner=self.user, url="https://mine.example.com/path"
        )

    def test_detail_404_for_other_user(self):
        self.client.force_login(self.other)
        r = self.client.get(
            reverse("api_target_detail", kwargs={"target_id": self.target.id})
        )
        self.assertEqual(r.status_code, 404)

    def test_detail_get_returns_target_json(self):
        self.client.force_login(self.user)
        r = self.client.get(
            reverse("api_target_detail", kwargs={"target_id": self.target.id})
        )
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data["id"], str(self.target.id))
        self.assertEqual(data["url"], "https://mine.example.com/path")

    def test_detail_delete_removes_target(self):
        self.client.force_login(self.user)
        tid = self.target.id
        r = self.client.delete(
            reverse("api_target_detail", kwargs={"target_id": tid})
        )
        self.assertEqual(r.status_code, 200)
        self.assertFalse(Target.objects.filter(id=tid).exists())
