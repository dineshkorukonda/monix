"""Admin registration for the reports app."""

from django.contrib import admin

from .models import Report, Scan


@admin.register(Scan)
class ScanAdmin(admin.ModelAdmin):
    list_display = ("report_id", "url", "score", "created_at")
    list_filter = ("created_at",)
    search_fields = ("url", "report_id")
    readonly_fields = ("report_id", "created_at")
    ordering = ("-created_at",)


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("scan", "is_expired", "expires_at")
    list_filter = ("is_expired",)
    ordering = ("-scan__created_at",)
