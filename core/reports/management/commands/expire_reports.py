"""Mark past-due reports as expired."""

from django.core.management.base import BaseCommand
from django.utils import timezone

from reports.models import Report


class Command(BaseCommand):
    help = "Mark all past-due reports as expired."

    def handle(self, *args, **options):
        expired_count = Report.objects.filter(
            is_expired=False, expires_at__lte=timezone.now()
        ).update(is_expired=True)
        self.stdout.write(self.style.SUCCESS(f"Marked {expired_count} report(s) as expired."))
