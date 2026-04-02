"""
Django middleware — small request normalizations shared across the project.
"""


class AppendSlashApiMiddleware:
    """
    Normalize ``/api/...`` paths to end with ``/``.

    Proxies (and some clients) may call ``POST /api/targets`` without a trailing
    slash. With ``APPEND_SLASH=True``, CommonMiddleware raises RuntimeError on
    POST because it cannot redirect without dropping the body. Fixing the path
    early avoids that.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path_info
        if path.startswith("/api/") and not path.endswith("/"):
            request.path_info = path + "/"
        return self.get_response(request)
