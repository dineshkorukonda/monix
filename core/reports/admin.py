"""Admin registration for the reports app."""

from datetime import timedelta

from django.contrib import admin
from django.utils import timezone
from django.utils.translation import ngettext

from .models import Report, Scan


class ScoreRangeFilter(admin.SimpleListFilter):
    """Filter scans by threat-score band."""

    title = "score range"
    parameter_name = "score_range"

    def lookups(self, request, model_admin):
        return [
            ("safe", "Safe (0–25)"),
            ("low", "Low (26–50)"),
            ("medium", "Medium (51–75)"),
            ("high", "High (76–100)"),
        ]

    def queryset(self, request, queryset):
        bands = {
            "safe": (0, 25),
            "low": (26, 50),
            "medium": (51, 75),
            "high": (76, 100),
        }
        if self.value() in bands:
            low, high = bands[self.value()]
            return queryset.filter(score__gte=low, score__lte=high)
        return queryset


def delete_old_scans(modeladmin, request, queryset):
    """Delete scans created more than 30 days ago."""
    cutoff = timezone.now() - timedelta(days=30)
    old_scans = queryset.filter(created_at__lt=cutoff)
    count = old_scans.count()
    old_scans.delete()
    modeladmin.message_user(
        request,
        ngettext(
            "%d scan older than 30 days was deleted.",
            "%d scans older than 30 days were deleted.",
            count,
        )
        % count,
    )


delete_old_scans.short_description = "Delete scans older than 30 days"


@admin.register(Scan)
class ScanAdmin(admin.ModelAdmin):
    list_display = ("url", "score", "created_at", "report_id")
    list_filter = (ScoreRangeFilter, "created_at")
    search_fields = ("url", "report_id")
    readonly_fields = ("report_id", "created_at")
    ordering = ("-created_at",)
    actions = [delete_old_scans]


def mark_reports_as_expired(modeladmin, request, queryset):
    """Mark selected reports as expired."""
    count = queryset.update(is_expired=True)
    modeladmin.message_user(
        request,
        ngettext(
            "%d report was marked as expired.",
            "%d reports were marked as expired.",
            count,
        )
        % count,
    )


mark_reports_as_expired.short_description = "Mark selected reports as expired"


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("url", "is_expired", "expires_at")
    list_filter = ("is_expired", "expires_at")
    search_fields = ("scan__url",)
    ordering = ("-scan__created_at",)
    actions = [mark_reports_as_expired]

    @admin.display(description="URL")
    def url(self, obj):
        return obj.scan.url
