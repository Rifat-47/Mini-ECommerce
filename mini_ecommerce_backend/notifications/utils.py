from .models import Notification


def notify(user, type, title, message):
    """Create an in-app notification for a user."""
    Notification.objects.create(user=user, type=type, title=title, message=message)
