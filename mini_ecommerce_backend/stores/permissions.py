from rest_framework.permissions import BasePermission


class IsPlatformAdmin(BasePermission):
    """Platform-level root admin. No store context required."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'platform_admin'
        )


class IsStoreOwner(BasePermission):
    """User must have store_owner membership for the current store."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.store):
            return False
        return request.store.memberships.filter(
            user=request.user, role='store_owner'
        ).exists()


class IsStoreAdmin(BasePermission):
    """User must have store_owner or store_admin membership for the current store."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.store):
            return False
        return request.store.memberships.filter(
            user=request.user, role__in=['store_owner', 'store_admin']
        ).exists()


class IsStoreMember(BasePermission):
    """Any staff member of the current store (owner or admin)."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.store):
            return False
        return request.store.memberships.filter(user=request.user).exists()
