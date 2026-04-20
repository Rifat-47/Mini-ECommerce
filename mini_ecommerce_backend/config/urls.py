from django.urls import path
from .views import SiteSettingsView, PublicSiteSettingsView

urlpatterns = [
    path('settings/', PublicSiteSettingsView.as_view(), name='public_settings'),
    path('admin/settings/', SiteSettingsView.as_view(), name='site_settings'),
]
