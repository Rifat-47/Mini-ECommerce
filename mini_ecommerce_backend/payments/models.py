from django.db import models
from orders.models import Order


class Payment(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    )

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    shurjopay_order_id = models.CharField(max_length=100, blank=True, default='')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='BDT')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=50, blank=True, default='')
    transaction_id = models.CharField(max_length=100, blank=True, default='')
    sp_code = models.CharField(max_length=20, blank=True, default='')
    sp_message = models.CharField(max_length=255, blank=True, default='')
    checkout_url = models.URLField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment #{self.id} — Order #{self.order_id} — {self.status}"
