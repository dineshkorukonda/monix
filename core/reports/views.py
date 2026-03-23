from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET

from .models import Report, Scan


@require_GET
def report_detail(request, report_id):
    """Return the full scan result for a shareable report URL.

    Returns 404 if the report does not exist, has been marked as expired,
    or its expiry timestamp has passed.
    """
    try:
        scan = Scan.objects.select_related("report").get(report_id=report_id)
    except Scan.DoesNotExist:
        return JsonResponse({"error": "Report not found."}, status=404)

    try:
        report = scan.report
    except Report.DoesNotExist:
        return JsonResponse({"error": "Report not found."}, status=404)

    if report.is_expired or report.expires_at <= timezone.now():
        return JsonResponse({"error": "Report not found."}, status=404)

    return JsonResponse(
        {
            "report_id": str(scan.report_id),
            "url": scan.url,
            "score": scan.score,
            "created_at": scan.created_at.isoformat(),
            "expires_at": report.expires_at.isoformat(),
            "results": scan.results,
        }
    )
