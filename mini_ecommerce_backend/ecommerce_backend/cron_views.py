import io
import hmac
import hashlib

from django.conf import settings
from django.http import JsonResponse
from django.views import View
from django.core.management import call_command
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt


def _authorised(request):
    """Return True if the request carries the correct cron secret."""
    secret = getattr(settings, 'CRON_SECRET', '')
    if not secret:
        return False
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return False
    provided = auth_header[len('Bearer '):]
    # Constant-time comparison to prevent timing attacks.
    return hmac.compare_digest(
        hashlib.sha256(provided.encode()).digest(),
        hashlib.sha256(secret.encode()).digest(),
    )


@method_decorator(csrf_exempt, name='dispatch')
class RunBirthdayEmailsView(View):
    """
    POST /api/internal/cron/birthday-emails/
    Called daily by cron-job.org to send birthday coupon emails.
    """
    def post(self, request):
        if not _authorised(request):
            return JsonResponse({'detail': 'Forbidden.'}, status=403)

        out = io.StringIO()
        try:
            call_command('send_birthday_emails', stdout=out, stderr=out)
            return JsonResponse({'status': 'ok', 'output': out.getvalue()})
        except Exception as exc:
            return JsonResponse({'status': 'error', 'detail': str(exc)}, status=500)


@method_decorator(csrf_exempt, name='dispatch')
class RunLowStockAlertsView(View):
    """
    POST /api/internal/cron/low-stock-alerts/
    Called daily by cron-job.org to send low-stock alert emails to superadmins.
    """
    def post(self, request):
        if not _authorised(request):
            return JsonResponse({'detail': 'Forbidden.'}, status=403)

        out = io.StringIO()
        try:
            call_command('send_low_stock_alerts', stdout=out, stderr=out)
            return JsonResponse({'status': 'ok', 'output': out.getvalue()})
        except Exception as exc:
            return JsonResponse({'status': 'error', 'detail': str(exc)}, status=500)
