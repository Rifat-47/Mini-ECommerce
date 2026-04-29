import threading
from django.core.mail import send_mail as _send_mail


def send_mail_async(subject, message, from_email, recipient_list):
    """Fire-and-forget send_mail in a daemon thread.

    Use this for all transactional emails that are not the primary purpose of
    the request (order confirmation, status updates, etc.).  The request
    returns immediately; SMTP runs in the background and failures are silenced
    so they never affect the HTTP response.

    Do NOT use this for emails where delivery confirmation matters to the
    caller (e.g. password-reset links with fail_silently=False).
    """
    def _send():
        try:
            _send_mail(subject, message, from_email, recipient_list, fail_silently=True)
        except Exception:
            pass

    threading.Thread(target=_send, daemon=True).start()
