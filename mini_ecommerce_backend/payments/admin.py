from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'amount', 'currency', 'status', 'payment_method', 'transaction_id', 'created_at']
    list_filter = ['status', 'payment_method', 'currency']
    search_fields = ['order__id', 'transaction_id', 'shurjopay_order_id']
    readonly_fields = ['order', 'shurjopay_order_id', 'amount', 'currency',
                       'transaction_id', 'sp_code', 'sp_message', 'checkout_url', 'created_at', 'updated_at']
    fields = ['order', 'amount', 'currency', 'status', 'payment_method',
              'transaction_id', 'shurjopay_order_id', 'sp_code', 'sp_message',
              'checkout_url', 'created_at', 'updated_at']
