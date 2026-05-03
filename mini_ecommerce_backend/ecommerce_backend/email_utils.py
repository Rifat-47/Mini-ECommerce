import base64
import logging
import threading

import requests as _requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _send_via_mailjet(subject, message, recipient_list, from_email, pdf_bytes=None, pdf_filename=None):
    """Send via Mailjet HTTP API."""
    api_key = getattr(settings, 'MAILJET_API_KEY', '')
    secret_key = getattr(settings, 'MAILJET_SECRET_KEY', '')
    sender_email = from_email or getattr(settings, 'MAILJET_FROM_EMAIL', '')
    payload = {
        'Messages': [{
            'From': {'Email': sender_email},
            'To': [{'Email': r} for r in recipient_list],
            'Subject': subject,
            'TextPart': message,
        }],
    }
    if pdf_bytes and pdf_filename:
        payload['Messages'][0]['Attachments'] = [{
            'Filename': pdf_filename,
            'ContentType': 'application/pdf',
            'Base64Content': base64.b64encode(pdf_bytes).decode(),
        }]
    response = _requests.post(
        'https://api.mailjet.com/v3.1/send',
        auth=(api_key, secret_key),
        json=payload,
        timeout=30,
    )
    response.raise_for_status()


def _save_email_log(recipient_list, subject, status, error_message=''):
    """Persist an EmailLog row for each recipient. Never raises."""
    try:
        from notifications.models import EmailLog
        logs = [
            EmailLog(recipient=r, subject=subject, status=status, error_message=error_message)
            for r in recipient_list
        ]
        EmailLog.objects.bulk_create(logs)
    except Exception as exc:
        logger.error('EmailLog save failed: %s', exc)


def send_email(subject, message, recipient_list, *, from_email=None, pdf_bytes=None, pdf_filename=None):
    """Synchronous send. Priority: Mailjet HTTP API → Resend HTTP API → Django SMTP.

    Raises on failure so callers can decide whether to log or propagate.
    """
    mailjet_api_key = getattr(settings, 'MAILJET_API_KEY', '')
    resend_api_key = getattr(settings, 'RESEND_API_KEY', '')
    recipients = list(recipient_list)

    try:
        if mailjet_api_key:
            _send_via_mailjet(subject, message, recipients, from_email, pdf_bytes, pdf_filename)
        elif resend_api_key:
            import resend as _resend
            _resend.api_key = resend_api_key
            params = {
                'from': getattr(settings, 'RESEND_FROM_EMAIL', 'onboarding@resend.dev'),
                'to': recipients,
                'subject': subject,
                'text': message,
            }
            if pdf_bytes and pdf_filename:
                params['attachments'] = [{
                    'filename': pdf_filename,
                    'content': base64.b64encode(pdf_bytes).decode(),
                }]
            _resend.Emails.send(params)
        else:
            if pdf_bytes and pdf_filename:
                from django.core.mail import EmailMessage
                msg = EmailMessage(subject, message, from_email, recipients)
                msg.attach(pdf_filename, pdf_bytes, 'application/pdf')
                msg.send(fail_silently=False)
            else:
                from django.core.mail import send_mail as _send_mail
                _send_mail(subject, message, from_email, recipients, fail_silently=False)
    except Exception as exc:
        _save_email_log(recipients, subject, 'failed', str(exc))
        raise

    _save_email_log(recipients, subject, 'sent')


def send_mail_async(subject, message, from_email, recipient_list):
    """Fire-and-forget plain-text email. Logs failures; never raises."""
    def _send():
        try:
            send_email(subject, message, recipient_list, from_email=from_email)
        except Exception as exc:
            logger.error('send_mail_async failed — subject=%r to=%r: %s', subject, recipient_list, exc)

    threading.Thread(target=_send, daemon=True).start()


def send_mail_with_pdf_async(subject, message, from_email, recipient_list, pdf_buffer, pdf_filename):
    """Fire-and-forget email with a PDF attachment. Logs failures; never raises.

    pdf_buffer is read synchronously before the thread starts so the caller
    does not need to keep the BytesIO object alive.
    """
    pdf_bytes = pdf_buffer.read()

    def _send():
        try:
            send_email(subject, message, recipient_list, from_email=from_email,
                       pdf_bytes=pdf_bytes, pdf_filename=pdf_filename)
        except Exception as exc:
            logger.error('send_mail_with_pdf_async failed — subject=%r to=%r: %s', subject, recipient_list, exc)

    threading.Thread(target=_send, daemon=True).start()
