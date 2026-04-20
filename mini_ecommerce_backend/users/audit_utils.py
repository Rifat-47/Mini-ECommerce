from .models import AuditLog


def audit(admin, action, target_type, target_id=None, detail=''):
    """Record an admin action in the audit log."""
    AuditLog.objects.create(
        admin=admin,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail,
    )
