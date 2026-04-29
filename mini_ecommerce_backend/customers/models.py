from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.utils import timezone


class CustomerManager(BaseUserManager):
    def create_customer(self, store, email, password, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        if not store:
            raise ValueError('Store is required')
        email = self.normalize_email(email)
        customer = self.model(store=store, email=email, **extra_fields)
        customer.set_password(password)
        customer.save(using=self._db)
        return customer

    def use_in_migrations(self):
        return False


class Customer(AbstractBaseUser):
    store         = models.ForeignKey('stores.Store', on_delete=models.CASCADE, related_name='customers')
    email         = models.EmailField()
    first_name    = models.CharField(max_length=150, blank=True, default='')
    last_name     = models.CharField(max_length=150, blank=True, default='')
    date_of_birth = models.DateField(null=True, blank=True)
    is_active     = models.BooleanField(default=True)

    failed_login_attempts = models.PositiveSmallIntegerField(default=0)
    lockout_until         = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = []

    objects = CustomerManager()

    class Meta:
        unique_together = ('store', 'email')

    def __str__(self):
        return f"{self.email} @ {self.store.name}"

    def is_locked_out(self):
        if self.lockout_until and self.lockout_until > timezone.now():
            return True
        if self.lockout_until:
            self.failed_login_attempts = 0
            self.lockout_until = None
            self.save(update_fields=['failed_login_attempts', 'lockout_until'])
        return False

    def record_failed_login(self, max_attempts=5, lockout_mins=15):
        from datetime import timedelta
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= max_attempts:
            self.lockout_until = timezone.now() + timedelta(minutes=lockout_mins)
        self.save(update_fields=['failed_login_attempts', 'lockout_until'])

    def reset_failed_login(self):
        if self.failed_login_attempts or self.lockout_until:
            self.failed_login_attempts = 0
            self.lockout_until = None
            self.save(update_fields=['failed_login_attempts', 'lockout_until'])


class CustomerAddress(models.Model):
    customer            = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='addresses')
    label               = models.CharField(max_length=50, blank=True, default='')
    full_name           = models.CharField(max_length=255)
    phone               = models.CharField(max_length=20)
    address_line_1      = models.CharField(max_length=255)
    address_line_2      = models.CharField(max_length=255, blank=True, default='')
    city                = models.CharField(max_length=100)
    state               = models.CharField(max_length=100)
    postal_code         = models.CharField(max_length=20)
    country             = models.CharField(max_length=100)
    is_default_shipping = models.BooleanField(default=False)
    is_default_billing  = models.BooleanField(default=False)
    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} — {self.address_line_1}, {self.city}"

    def set_as_default_shipping(self):
        CustomerAddress.objects.filter(customer=self.customer, is_default_shipping=True).update(is_default_shipping=False)
        self.is_default_shipping = True
        self.save()

    def set_as_default_billing(self):
        CustomerAddress.objects.filter(customer=self.customer, is_default_billing=True).update(is_default_billing=False)
        self.is_default_billing = True
        self.save()
