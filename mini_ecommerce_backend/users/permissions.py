from rest_framework.permissions import BasePermission


class IsAdminOrSuperAdmin(BasePermission):
    """
    Allows access only to users with the 'admin' or 'superadmin' role.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'superadmin']
        )


class IsSuperAdmin(BasePermission):
    """
    Allows access only to users with the 'superadmin' role.
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'superadmin'
        )
