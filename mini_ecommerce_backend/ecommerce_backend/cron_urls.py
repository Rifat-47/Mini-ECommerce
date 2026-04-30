from django.urls import path
from .cron_views import RunBirthdayEmailsView, RunLowStockAlertsView

urlpatterns = [
    path('internal/cron/birthday-emails/', RunBirthdayEmailsView.as_view(), name='cron-birthday-emails'),
    path('internal/cron/low-stock-alerts/', RunLowStockAlertsView.as_view(), name='cron-low-stock-alerts'),
]
