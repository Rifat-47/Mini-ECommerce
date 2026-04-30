import base64
import logging
import threading

from django.conf import settings

logger = logging.getLogger(__name__)


def send_email(subject, message, recipient_list, *, from_email=None, pdf_bytes=None, pdf_filename=None):
    """Synchronous send. Uses Resend (HTTP API) if RESEND_API_KEY is set, else Django SMTP.

    Raises on failure so callers can decide whether to log or propagate.
    """
    api_key = getattr(settings, 'RESEND_API_KEY', '')
    if api_key:
        import resend as _resend
        _resend.api_key = api_key
        params = {
            'from': getattr(settings, 'RESEND_FROM_EMAIL', 'onboarding@resend.dev'),
            'to': list(recipient_list),
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
            msg = EmailMessage(subject, message, from_email, list(recipient_list))
            msg.attach(pdf_filename, pdf_bytes, 'application/pdf')
            msg.send(fail_silently=False)
        else:
            from django.core.mail import send_mail as _send_mail
            _send_mail(subject, message, from_email, list(recipient_list), fail_silently=False)


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
