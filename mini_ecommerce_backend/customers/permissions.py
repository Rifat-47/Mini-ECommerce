from rest_framework.permissions import BasePermission
from .models import Customer


class IsAuthenticatedCustomer(BasePermission):
    """Request must be authenticated as a Customer (not a staff User)."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            isinstance(request.user, Customer) and
            request.user.is_active
        )
