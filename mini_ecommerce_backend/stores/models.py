from django.db import models
from django.conf import settings


class Store(models.Model):
    STATUS_CHOICES = (
        ('active',    'Active'),
        ('suspended', 'Suspended'),
        ('deleted',   'Deleted'),
    )
    name          = models.CharField(max_length=100)
    slug          = models.SlugField(unique=True)
    owner         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='owned_stores')
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    custom_domain = models.CharField(max_length=255, blank=True, default='')
    logo          = models.ImageField(upload_to='store_logos/', null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.slug})"


class StoreSettings(models.Model):
    store                         = models.OneToOneField(Store, on_delete=models.CASCADE, related_name='settings')
    support_email                 = models.EmailField(blank=True, default='')
    currency                      = models.CharField(max_length=10, default='BDT')
    tax_rate                      = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    return_window_days            = models.PositiveIntegerField(default=7)
    free_shipping_threshold       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    birthday_coupon_enabled       = models.BooleanField(default=True)
    birthday_coupon_discount      = models.PositiveIntegerField(default=20)
    birthday_coupon_validity_days = models.PositiveIntegerField(default=30)
    cod_enabled                   = models.BooleanField(default=True)
    online_payment_enabled        = models.BooleanField(default=True)
    cod_min_order_value           = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    email_notifications_enabled   = models.BooleanField(default=True)
    registration_enabled          = models.BooleanField(default=True)
    max_login_attempts            = models.PositiveIntegerField(default=5)
    lockout_minutes               = models.PositiveIntegerField(default=15)

    def __str__(self):
        return f"Settings — {self.store.name}"


class StoreMembership(models.Model):
    ROLE_CHOICES = (
        ('store_owner', 'Store Owner'),
        ('store_admin', 'Store Admin'),
    )
    store      = models.ForeignKey(Store, on_delete=models.CASCADE, related_name='memberships')
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='store_memberships')
    role       = models.CharField(max_length=20, choices=ROLE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('store', 'user')

    def __str__(self):
        return f"{self.user.email} — {self.role} at {self.store.name}"
