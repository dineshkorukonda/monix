# Generated manually for Google Search Console integration

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("reports", "0004_target_environment_default_blank"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserSearchConsoleCredentials",
            fields=[
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        primary_key=True,
                        related_name="search_console_credentials",
                        serialize=False,
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                ("refresh_token_encrypted", models.TextField()),
                ("access_token", models.TextField(blank=True, default="")),
                ("access_token_expires_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name_plural": "User Search Console credentials",
            },
        ),
        migrations.AddField(
            model_name="target",
            name="gsc_analytics",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="target",
            name="gsc_property_url",
            field=models.CharField(blank=True, default="", max_length=2048),
        ),
        migrations.AddField(
            model_name="target",
            name="gsc_sync_error",
            field=models.CharField(blank=True, default="", max_length=512),
        ),
        migrations.AddField(
            model_name="target",
            name="gsc_synced_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
