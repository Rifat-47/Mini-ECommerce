from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Notification
from .serializers import NotificationSerializer


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
