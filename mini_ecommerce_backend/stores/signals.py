from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Store, StoreSettings


@receiver(post_save, sender=Store)
def auto_create_store_settings(sender, instance, created, **kwargs):
    """Ensure every Store always has a StoreSettings row."""
    if created:
        StoreSettings.objects.get_or_create(store=instance)
