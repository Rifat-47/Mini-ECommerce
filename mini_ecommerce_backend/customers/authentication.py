from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from django.core.cache import cache

from .models import Customer


class CustomerJWTAuthentication(BaseAuthentication):
    """
    Authenticates requests using a JWT that carries a `customer_id` claim.
    Customer tokens are issued by the customer login endpoint and have no
    `user_id` claim, so they cannot be mistaken for staff tokens.
    """

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None

        raw_token = auth_header.split(' ', 1)[1]

        try:
            token = AccessToken(raw_token)
        except TokenError:
            return None

        customer_id = token.payload.get('customer_id')
        if not customer_id:
            return None  # Not a customer token — let JWTAuthentication handle it

        # Check cache-based blacklist (used by customer logout)
        if cache.get(f'customer_bl:{token.payload["jti"]}'):
            raise AuthenticationFailed('Token has been revoked.')

        try:
            customer = Customer.objects.select_related('store').get(
                pk=customer_id, is_active=True
            )
        except Customer.DoesNotExist:
            raise AuthenticationFailed('Customer not found or inactive.')

        # Ensure token belongs to the same store as the current request
        if request.store and customer.store_id != request.store.id:
            raise AuthenticationFailed('Token is not valid for this store.')

        return (customer, token)

    def authenticate_header(self, request):
        return 'Bearer'
