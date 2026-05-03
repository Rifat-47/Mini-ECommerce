from rest_framework import serializers
from .models import Notification, EmailLog


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type', 'title', 'message', 'is_read', 'created_at']
        read_only_fields = ['id', 'type', 'title', 'message', 'created_at']


class EmailLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailLog
        fields = ['id', 'recipient', 'subject', 'status', 'error_message', 'sent_at']
