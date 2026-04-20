from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from users.permissions import IsAdminOrSuperAdmin
from .models import SiteSettings
from .serializers import SiteSettingsSerializer

PUBLIC_FIELDS = ('store_name', 'currency', 'support_email', 'contact_phone',
                 'cod_enabled', 'online_payment_enabled', 'registration_enabled',
                 'free_shipping_threshold')


class PublicSiteSettingsView(APIView):
    """Returns a safe subset of settings for public/unauthenticated use."""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        cfg = SiteSettings.get()
        return Response({f: getattr(cfg, f) for f in PUBLIC_FIELDS})


class SiteSettingsView(APIView):
    def get_permissions(self):
        return [permissions.IsAuthenticated(), IsAdminOrSuperAdmin()]

    def get(self, request):
        return Response(SiteSettingsSerializer(SiteSettings.get()).data)

    def patch(self, request):
        if request.user.role != 'superadmin':
            return Response(
                {'detail': 'Only superadmins can modify site settings.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = SiteSettingsSerializer(
            SiteSettings.get(), data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
