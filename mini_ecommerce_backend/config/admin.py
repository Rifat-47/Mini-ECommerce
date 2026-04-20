from django.contrib import admin
from .models import SiteSettings


@admin.register(SiteSettings)
class SiteSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Store Identity', {'fields': ('store_name', 'support_email', 'from_email', 'contact_phone', 'currency', 'tax_rate')}),
        ('Orders', {'fields': ('return_window_days', 'free_shipping_threshold')}),
        ('Birthday Coupon', {'fields': ('birthday_coupon_enabled', 'birthday_coupon_discount', 'birthday_coupon_validity_days')}),
        ('Payments', {'fields': ('cod_enabled', 'online_payment_enabled', 'cod_min_order_value')}),
        ('Notifications', {'fields': ('email_notifications_enabled',)}),
        ('Security', {'fields': ('registration_enabled', 'max_login_attempts', 'lockout_minutes')}),
    )

    def has_add_permission(self, request):
        return not SiteSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
