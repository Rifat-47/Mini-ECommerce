from apscheduler.schedulers.background import BackgroundScheduler
from django.core.management import call_command
from django.conf import settings


def send_birthday_emails_job():
    call_command('send_birthday_emails')


def send_low_stock_alerts_job():
    call_command('send_low_stock_alerts')


def start():
    scheduler = BackgroundScheduler(timezone=settings.TIME_ZONE)
    # Birthday emails — 12:05 AM every day.
    # misfire_grace_time=86400s ensures a missed firing (e.g. after a Render restart)
    # is still executed as long as the app comes back up within the same 24-hour window.
    scheduler.add_job(send_birthday_emails_job, 'cron', hour=0, minute=5, misfire_grace_time=86400)
    # Low-stock alerts — 12:00 PM every day
    scheduler.add_job(send_low_stock_alerts_job, 'cron', hour=12, minute=0)
    scheduler.start()
