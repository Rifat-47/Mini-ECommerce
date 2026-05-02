from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from .models import Notification, EmailLog
from .serializers import NotificationSerializer, EmailLogSerializer
from users.permissions import IsSuperAdmin


class NotificationListView(generics.ListAPIView):
    """List all notifications for the authenticated user. Supports ?unread_only=true."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        if self.request.query_params.get('unread_only') == 'true':
            qs = qs.filter(is_read=False)
        return qs


class NotificationMarkReadView(generics.UpdateAPIView):
    """Mark a single notification as read."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['patch']

    def get_object(self):
        try:
            return Notification.objects.get(pk=self.kwargs['pk'], user=self.request.user)
        except Notification.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Notification not found.")

    def patch(self, request, *args, **kwargs):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response(NotificationSerializer(notification).data)


class NotificationMarkAllReadView(APIView):
    """Mark all of the authenticated user's notifications as read."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated = Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'marked_read': updated})


class NotificationUnreadCountView(APIView):
    """Return the count of unread notifications for the authenticated user."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'unread_count': count})


class EmailLogListView(generics.ListAPIView):
    """Superadmin-only. List all email logs with optional filters."""
    serializer_class = EmailLogSerializer
    permission_classes = [IsSuperAdmin]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status']
    ordering_fields = ['sent_at']
    ordering = ['-sent_at']

    def get_queryset(self):
        qs = EmailLog.objects.all()
        search = self.request.query_params.get('search', '').strip()
        date_from = self.request.query_params.get('date_from', '').strip()
        date_to = self.request.query_params.get('date_to', '').strip()
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(recipient__icontains=search) | Q(subject__icontains=search))
        if date_from:
            qs = qs.filter(sent_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(sent_at__date__lte=date_to)
        return qs
