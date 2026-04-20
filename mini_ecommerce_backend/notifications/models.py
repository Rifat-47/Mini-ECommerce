from django.db import models
from django.conf import settings


class Notification(models.Model):
    TYPE_CHOICES = [
        ('order_placed',     'Order Placed'),
        ('order_status',     'Order Status Update'),
        ('order_cancelled',  'Order Cancelled'),
        ('return_received',  'Return Request Received'),
        ('return_approved',  'Return Approved'),
        ('return_rejected',  'Return Rejected'),
        ('refund_completed', 'Refund Completed'),
        ('payment_success',  'Payment Successful'),
        ('payment_failed',   'Payment Failed'),
        ('general',          'General'),
    ]

    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    type       = models.CharField(max_length=30, choices=TYPE_CHOICES)
    title      = models.CharField(max_length=255)
    message    = models.TextField()
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.type}] {self.title} → {self.user}"
