# Generated manually — merge reports_report into reports_scan

import datetime
from django.db import migrations, models


def copy_report_into_scan(apps, schema_editor):
    Scan = apps.get_model("reports", "Scan")
    Report = apps.get_model("reports", "Report")
    for report in Report.objects.select_related("scan").iterator():
        scan = report.scan
        scan.is_expired = report.is_expired
        scan.expires_at = report.expires_at
        scan.save(update_fields=["is_expired", "expires_at"])
    # Scans that never had a Report row: default expiry from created_at
    for scan in Scan.objects.filter(expires_at__isnull=True).iterator():
        scan.expires_at = scan.created_at + datetime.timedelta(days=30)
        scan.is_expired = False
        scan.save(update_fields=["expires_at", "is_expired"])


class Migration(migrations.Migration):

    dependencies = [
        ("reports", "0005_gsc_search_console"),
    ]

    operations = [
        migrations.AddField(
            model_name="scan",
            name="expires_at",
            field=models.DateTimeField(
                help_text="Timestamp after which this report is considered expired.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="scan",
            name="is_expired",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(copy_report_into_scan, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="scan",
            name="expires_at",
            field=models.DateTimeField(
                help_text="Timestamp after which this report is considered expired.",
            ),
        ),
        migrations.DeleteModel(
            name="Report",
        ),
    ]
