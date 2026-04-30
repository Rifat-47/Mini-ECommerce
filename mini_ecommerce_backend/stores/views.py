from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from ecommerce_backend.email_utils import send_email as _send_email
from django.db.models import Sum, Count
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.conf import settings as django_settings

from rest_framework import status, views, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Store, StoreSettings, StoreMembership
from .serializers import (
    StoreCreateSerializer, StoreListSerializer,
    StoreDetailSerializer, StoreUpdateSerializer,
    StoreSettingsSerializer,
)
from .permissions import IsPlatformAdmin, IsStoreAdmin
from customers.models import Customer

User = get_user_model()


def _send_owner_invite(user, store):
    """Send a set-password invite email to a new store owner."""
    uid   = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    # Uses the platform frontend URL — store owner sets password before going to their store
    frontend_url = getattr(django_settings, 'PLATFORM_FRONTEND_URL', django_settings.FRONTEND_URL)
    reset_link = f"{frontend_url}/auth/reset-password/{uid}/{token}/?store={store.slug}"

    _send_email(
        subject=f"You've been invited to manage {store.name}",
        message=(
            f"Hello,\n\n"
            f"You have been added as the owner of '{store.name}'.\n\n"
            f"Set your password using the link below (expires in 24 hours):\n\n"
            f"{reset_link}\n\n"
            f"After setting your password, log in to access your store's admin panel.\n\n"
            f"— The Platform Team"
        ),
        recipient_list=[user.email],
        from_email=django_settings.DEFAULT_FROM_EMAIL,
    )


class PlatformStoreListCreateView(views.APIView):
    permission_classes = (IsPlatformAdmin,)

    def get(self, request):
        stores = Store.objects.select_related('owner').prefetch_related(
            'memberships__user'
        ).exclude(status='deleted').order_by('-created_at')
        return Response(StoreListSerializer(stores, many=True).data)

    def post(self, request):
        serializer = StoreCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Get or create the store owner User
        user, created = User.objects.get_or_create(
            email=data['owner_email'],
            defaults={
                'first_name': data['owner_first_name'],
                'last_name':  data['owner_last_name'],
                'role':       'store_owner',
            },
        )
        if not created and user.role not in ('store_owner', 'store_admin'):
            return Response(
                {'owner_email': 'This user exists with an incompatible role.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if created:
            user.set_unusable_password()
            user.save()

        # Create store
        store = Store.objects.create(
            name=data['name'],
            slug=data['slug'],
            owner=user,
        )

        # Create settings — signal will also fire but get_or_create is idempotent
        StoreSettings.objects.filter(store=store).update_or_create(
            store=store,
            defaults={
                'support_email':         data.get('support_email', ''),
                'currency':              data.get('currency', 'BDT'),
                'tax_rate':              data.get('tax_rate', 0),
                'cod_enabled':           data.get('cod_enabled', True),
                'online_payment_enabled': data.get('online_payment_enabled', True),
            },
        )

        # Create membership
        StoreMembership.objects.get_or_create(
            store=store, user=user,
            defaults={'role': 'store_owner'},
        )

        # Send invite email — only to newly created users
        if created:
            try:
                _send_owner_invite(user, store)
            except Exception:
                pass  # Don't fail store creation if email fails

        return Response(StoreDetailSerializer(store).data, status=status.HTTP_201_CREATED)


class PlatformStoreDetailView(views.APIView):
    permission_classes = (IsPlatformAdmin,)

    def _get_store(self, pk):
        try:
            return Store.objects.select_related('owner', 'settings').prefetch_related(
                'memberships__user'
            ).get(pk=pk)
        except Store.DoesNotExist:
            return None

    def get(self, request, pk):
        store = self._get_store(pk)
        if not store:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(StoreDetailSerializer(store).data)

    def patch(self, request, pk):
        store = self._get_store(pk)
        if not store:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = StoreUpdateSerializer(store, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(StoreDetailSerializer(store).data)

    def delete(self, request, pk):
        store = self._get_store(pk)
        if not store:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        store.status = 'deleted'
        store.save(update_fields=['status'])
        return Response({'detail': 'Store deleted.'}, status=status.HTTP_200_OK)


class PlatformStoreSuspendView(views.APIView):
    permission_classes = (IsPlatformAdmin,)

    def post(self, request, pk):
        try:
            store = Store.objects.get(pk=pk)
        except Store.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if store.status == 'deleted':
            return Response({'detail': 'Cannot suspend a deleted store.'}, status=status.HTTP_400_BAD_REQUEST)
        store.status = 'suspended'
        store.save(update_fields=['status'])
        return Response({'detail': 'Store suspended.'})


class PlatformStoreActivateView(views.APIView):
    permission_classes = (IsPlatformAdmin,)

    def post(self, request, pk):
        try:
            store = Store.objects.get(pk=pk)
        except Store.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if store.status == 'deleted':
            return Response({'detail': 'Cannot activate a deleted store.'}, status=status.HTTP_400_BAD_REQUEST)
        store.status = 'active'
        store.save(update_fields=['status'])
        return Response({'detail': 'Store activated.'})


class PlatformStatsView(views.APIView):
    permission_classes = (IsPlatformAdmin,)

    def get(self, request):
        from orders.models import Order

        stores = Store.objects.exclude(status='deleted')
        revenue = Order.objects.exclude(status='Cancelled').aggregate(
            t=Sum('total_amount')
        )['t'] or Decimal('0')

        data = {
            'total_stores':     Store.objects.count(),
            'active_stores':    stores.filter(status='active').count(),
            'suspended_stores': stores.filter(status='suspended').count(),
            'total_customers':  Customer.objects.count(),
            'total_orders':     Order.objects.count(),
            'total_revenue':    round(revenue, 2),
        }
        return Response(data)


class MyStoresView(views.APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        memberships = StoreMembership.objects.filter(
            user=request.user
        ).select_related('store').order_by('store__name')
        data = [
            {
                'id':   m.store.id,
                'name': m.store.name,
                'slug': m.store.slug,
                'role': m.role,
                'logo': request.build_absolute_uri(m.store.logo.url) if m.store.logo else None,
            }
            for m in memberships
            if m.store.status == 'active'
        ]
        return Response(data)


class ResendInviteView(views.APIView):
    permission_classes = (IsPlatformAdmin,)

    def post(self, request, pk):
        try:
            store = Store.objects.select_related('owner').get(pk=pk)
        except Store.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if store.status == 'deleted':
            return Response({'detail': 'Cannot invite owner of a deleted store.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            _send_owner_invite(store.owner, store)
        except Exception:
            return Response({'detail': 'Failed to send invitation email.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({'detail': 'Invitation email sent.'})


class AdminStoreSettingsView(views.APIView):
    permission_classes = (IsStoreAdmin,)

    def get(self, request):
        store = request.store
        settings_obj, _ = StoreSettings.objects.get_or_create(store=store)
        data = StoreSettingsSerializer(settings_obj).data
        data['name'] = store.name
        data['slug'] = store.slug
        return Response(data)

    def patch(self, request):
        store = request.store
        # Update store name if provided
        if 'name' in request.data:
            store.name = request.data['name']
            store.save(update_fields=['name'])
        settings_obj, _ = StoreSettings.objects.get_or_create(store=store)
        # Remove name/slug from settings patch data (not settings fields)
        patch_data = {k: v for k, v in request.data.items() if k not in ('name', 'slug')}
        serializer = StoreSettingsSerializer(settings_obj, data=patch_data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        data = serializer.data
        data['name'] = store.name
        data['slug'] = store.slug
        return Response(data)
