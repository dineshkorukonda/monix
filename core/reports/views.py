import json
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login

from .models import Report, Scan, Target


@require_GET
def report_detail(request, report_id):
    """Return the full scan result for a shareable report URL."""
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


@csrf_exempt
@require_POST
def api_login(request):
    """Authenticate and store session login."""
    try:
        data = json.loads(request.body)
        username = data.get("username")
        password = data.get("password")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({"username": user.username, "email": user.email})
        return JsonResponse({"error": "Invalid credentials"}, status=401)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=400)


@require_GET
def api_me(request):
    """Return the active logged-in user session logic."""
    if request.user.is_authenticated:
        # Dynamically compute initials from user object
        initials = (request.user.first_name[0] + request.user.last_name[0]).upper() if request.user.first_name and request.user.last_name else request.user.username[0:2].upper()
        return JsonResponse({
            "username": request.user.username,
            "name": f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
            "initials": initials
        })
    
    # Auto-login the superuser fallback for immediate local testing if no session
    from django.contrib.auth.models import User
    first_user = User.objects.first()
    if first_user:
        login(request, first_user)
        initials = (first_user.first_name[0] + first_user.last_name[0]).upper() if first_user.first_name and first_user.last_name else first_user.username[0:2].upper()
        return JsonResponse({
            "username": first_user.username,
            "name": f"{first_user.first_name} {first_user.last_name}".strip() or first_user.username,
            "initials": initials
        })
    return JsonResponse({"error": "Unauthorized. Please run createsuperuser."}, status=401)


@csrf_exempt
def api_targets(request):
    """List or Create Dashboard Workspace Targets natively stored in PostgreSQL."""
    if not request.user.is_authenticated:
        from django.contrib.auth.models import User
        first_user = User.objects.first()
        if first_user:
            login(request, first_user)
        else:
            return JsonResponse({"error": "Unauthorized"}, status=401)

    if request.method == "GET":
        targets = Target.objects.filter(owner=request.user)
        data = []
        for t in targets:
            latest_scan = t.scans.order_by("-created_at").first()
            data.append({
                "id": str(t.id),
                "name": t.url.replace("https://", "").replace("http://", "").split("/")[0],
                "url": t.url,
                "ip": "Analyzing Target", 
                "location": t.environment,
                "activity": latest_scan.results.get('threat', 'Awaiting initial scan telemetry') if latest_scan else "No scans active on this target yet",
                "status": "Healthy" if not latest_scan or latest_scan.score > 80 else "Warning",
                "lastScan": latest_scan.created_at.strftime("%B %d, %H:%M") if latest_scan else "Never",
                "score": latest_scan.score if latest_scan else 100,
            })
        return JsonResponse(data, safe=False)

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            target = Target.objects.create(owner=request.user, url=data.get("url"), environment=data.get("environment", "Production"))
            return JsonResponse({"id": str(target.id), "url": target.url})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"error": "Method Not Allowed"}, status=405)
