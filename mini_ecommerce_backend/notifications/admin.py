from django.contrib import admin
from .models import Notification, EmailLog


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('type', 'title', 'user', 'is_read', 'created_at')
    list_filter  = ('type', 'is_read')
    search_fields = ('title', 'message', 'user__email')


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display  = ('sent_at', 'status', 'recipient', 'subject', 'error_message')
    list_filter   = ('status', 'sent_at')
    search_fields = ('recipient', 'subject')
    readonly_fields = ('sent_at', 'recipient', 'subject', 'status', 'error_message')
    ordering      = ('-sent_at',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
