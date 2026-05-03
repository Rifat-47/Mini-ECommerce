from django.conf import settings as django_settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.exceptions import ValidationError as DjangoValidationError
from ecommerce_backend.email_utils import send_mail_async as _send_mail_async
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from rest_framework import generics, status, views
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from .authentication import CustomerJWTAuthentication
from .models import Customer, CustomerAddress
from .permissions import IsAuthenticatedCustomer
from .serializers import (
    CustomerAddressSerializer, CustomerChangePasswordSerializer,
    CustomerLoginSerializer, CustomerProfileSerializer, CustomerRegisterSerializer,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _require_store(request):
    """Return (store, None) or (None, error_response)."""
    if not request.store:
        return None, Response(
            {'detail': 'Store context is required. Set the X-Store-Slug header.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return request.store, None


def _get_tokens(customer):
    refresh = RefreshToken()
    refresh['customer_id'] = customer.id
    refresh['store_id']    = customer.store_id
    refresh['email']       = customer.email
    return {'refresh': str(refresh), 'access': str(refresh.access_token)}


# ── Throttles ─────────────────────────────────────────────────────────────────

class CustomerLoginThrottle(AnonRateThrottle):
    scope = 'login'

class CustomerRegisterThrottle(AnonRateThrottle):
    scope = 'register'

class CustomerForgotPasswordThrottle(AnonRateThrottle):
    scope = 'forgot_password'


# ── Auth ──────────────────────────────────────────────────────────────────────

class CustomerRegisterView(views.APIView):
    authentication_classes = []
    throttle_classes = [CustomerRegisterThrottle]

    def post(self, request):
        store, err = _require_store(request)
        if err:
            return err

        if not store.settings.registration_enabled:
            return Response(
                {'detail': 'Registrations are currently disabled for this store.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CustomerRegisterSerializer(
            data=request.data, context={'store': store}
        )
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        return Response(
            {'detail': 'Account created successfully.', **_get_tokens(customer)},
            status=status.HTTP_201_CREATED,
        )


class CustomerLoginView(views.APIView):
    authentication_classes = []
    throttle_classes = [CustomerLoginThrottle]

    def post(self, request):
        store, err = _require_store(request)
        if err:
            return err

        serializer = CustomerLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email    = serializer.validated_data['email']
        password = serializer.validated_data['password']

        try:
            customer = Customer.objects.get(store=store, email=email)
        except Customer.DoesNotExist:
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        if customer.is_locked_out():
            from django.utils import timezone
            remaining = int((customer.lockout_until - timezone.now()).total_seconds() // 60) + 1
            return Response(
                {'detail': f'Account locked. Try again in {remaining} minute(s).'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not customer.check_password(password):
            cfg = store.settings
            customer.record_failed_login(
                max_attempts=cfg.max_login_attempts,
                lockout_mins=cfg.lockout_minutes,
            )
            attempts_left = max(0, cfg.max_login_attempts - customer.failed_login_attempts)
            msg = 'Invalid credentials.'
            if attempts_left == 0:
                msg = f'Invalid credentials. Account locked for {cfg.lockout_minutes} minutes.'
            elif attempts_left <= 2:
                msg = f'Invalid credentials. {attempts_left} attempt(s) remaining before lockout.'
            return Response({'detail': msg}, status=status.HTTP_401_UNAUTHORIZED)

        if not customer.is_active:
            return Response({'detail': 'Account is inactive.'}, status=status.HTTP_403_FORBIDDEN)

        customer.reset_failed_login()
        return Response({
            'email': customer.email,
            **_get_tokens(customer),
        })


class CustomerLogoutView(views.APIView):
    authentication_classes = [CustomerJWTAuthentication]
    permission_classes     = [IsAuthenticatedCustomer]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detail': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
            jti   = token.payload.get('jti')
            exp   = token.payload.get('exp')
            if jti and exp:
                from django.utils import timezone
                ttl = int(exp - timezone.now().timestamp())
                if ttl > 0:
                    cache.set(f'customer_bl:{jti}', True, ttl)
        except Exception:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'detail': 'Logged out successfully.'})


class CustomerTokenRefreshView(views.APIView):
    authentication_classes = []
    """Exchange a customer refresh token for a new access token."""

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response({'detail': 'Refresh token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_token)
        except Exception:
            return Response({'detail': 'Invalid or expired token.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not token.payload.get('customer_id'):
            return Response({'detail': 'Not a customer token.'}, status=status.HTTP_400_BAD_REQUEST)

        if cache.get(f'customer_bl:{token.payload["jti"]}'):
            return Response({'detail': 'Token has been revoked.'}, status=status.HTTP_401_UNAUTHORIZED)

        return Response({'access': str(token.access_token)})


class CustomerForgotPasswordView(views.APIView):
    authentication_classes = []
    throttle_classes = [CustomerForgotPasswordThrottle]

    def post(self, request):
        store, err = _require_store(request)
        if err:
            return err

        email = request.data.get('email', '').strip()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            customer = Customer.objects.get(store=store, email=email)
            uid   = urlsafe_base64_encode(force_bytes(customer.pk))
            token = default_token_generator.make_token(customer)
            frontend_url = getattr(django_settings, 'FRONTEND_URL', '')
            reset_link = f"{frontend_url}/{store.slug}/auth/reset-password/{uid}/{token}/"

            if store.settings.email_notifications_enabled:
                _send_mail_async(
                    'Password Reset Request',
                    (
                        f'Click the link below to reset your password:\n\n'
                        f'{reset_link}\n\nThis link expires in 24 hours.'
                    ),
                    django_settings.DEFAULT_FROM_EMAIL,
                    [customer.email],
                )
        except Customer.DoesNotExist:
            pass  # Don't reveal whether the email exists

        return Response({'detail': 'If an account with that email exists, a reset link has been sent.'})


class CustomerResetPasswordConfirmView(views.APIView):
    authentication_classes = []

    def post(self, request, uid, token):
        new_password = request.data.get('new_password', '').strip()
        if not new_password:
            return Response({'detail': 'New password is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            customer_id = force_str(urlsafe_base64_decode(uid))
            customer    = Customer.objects.get(pk=customer_id)
        except (Customer.DoesNotExist, ValueError, TypeError):
            return Response({'detail': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(customer, token):
            return Response({'detail': 'Reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password)
        except DjangoValidationError as e:
            return Response({'detail': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        customer.set_password(new_password)
        customer.save()
        return Response({'detail': 'Password has been reset successfully.'})


# ── Profile ───────────────────────────────────────────────────────────────────

class CustomerProfileView(views.APIView):
    authentication_classes = [CustomerJWTAuthentication]
    permission_classes     = [IsAuthenticatedCustomer]

    def get(self, request):
        return Response(CustomerProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = CustomerProfileSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class CustomerChangePasswordView(views.APIView):
    authentication_classes = [CustomerJWTAuthentication]
    permission_classes     = [IsAuthenticatedCustomer]

    def post(self, request):
        serializer = CustomerChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        customer = request.user
        if not customer.check_password(serializer.validated_data['old_password']):
            return Response({'detail': 'Wrong current password.'}, status=status.HTTP_400_BAD_REQUEST)

        customer.set_password(serializer.validated_data['new_password'])
        customer.save()
        return Response({'detail': 'Password changed successfully.'})


# ── Addresses ─────────────────────────────────────────────────────────────────

class CustomerAddressListCreateView(generics.ListCreateAPIView):
    authentication_classes = [CustomerJWTAuthentication]
    permission_classes     = [IsAuthenticatedCustomer]
    serializer_class       = CustomerAddressSerializer

    def get_queryset(self):
        return CustomerAddress.objects.filter(customer=self.request.user)

    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)


class CustomerAddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [CustomerJWTAuthentication]
    permission_classes     = [IsAuthenticatedCustomer]
    serializer_class       = CustomerAddressSerializer

    def get_queryset(self):
        return CustomerAddress.objects.filter(customer=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance             = self.get_object()
        was_default_shipping = instance.is_default_shipping
        was_default_billing  = instance.is_default_billing
        self.perform_destroy(instance)

        if was_default_shipping:
            next_addr = CustomerAddress.objects.filter(customer=request.user).first()
            if next_addr:
                next_addr.is_default_shipping = True
                next_addr.save(update_fields=['is_default_shipping'])

        if was_default_billing:
            next_addr = CustomerAddress.objects.filter(customer=request.user).first()
            if next_addr:
                next_addr.is_default_billing = True
                next_addr.save(update_fields=['is_default_billing'])

        return Response({'detail': 'Address deleted.'}, status=status.HTTP_200_OK)


class CustomerAddressSetDefaultView(views.APIView):
    authentication_classes = [CustomerJWTAuthentication]
    permission_classes     = [IsAuthenticatedCustomer]

    def patch(self, request, pk):
        try:
            address = CustomerAddress.objects.get(pk=pk, customer=request.user)
        except CustomerAddress.DoesNotExist:
            raise NotFound('Address not found.')

        default_type = request.data.get('type')
        if default_type == 'shipping':
            address.set_as_default_shipping()
        elif default_type == 'billing':
            address.set_as_default_billing()
        else:
            return Response(
                {'detail': "Provide 'type' as 'shipping' or 'billing'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(CustomerAddressSerializer(address).data)
