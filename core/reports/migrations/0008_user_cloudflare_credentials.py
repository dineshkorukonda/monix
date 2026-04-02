# Generated manually for UserCloudflareCredentials

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("reports", "0007_alter_scan_results"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserCloudflareCredentials",
            fields=[
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        primary_key=True,
                        related_name="cloudflare_credentials",
                        serialize=False,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("api_token_encrypted", models.TextField()),
                ("account_id", models.CharField(blank=True, default="", max_length=64)),
                ("account_name", models.CharField(blank=True, default="", max_length=255)),
                ("zones_count", models.PositiveIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name_plural": "User Cloudflare credentials",
            },
        ),
    ]
