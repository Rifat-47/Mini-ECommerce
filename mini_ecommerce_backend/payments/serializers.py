from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    order_id = serializers.ReadOnlyField(source='order.id')
    customer_email = serializers.SerializerMethodField()

    def get_customer_email(self, obj):
        return obj.order.user.email if obj.order.user else '[deleted user]'

    class Meta:
        model = Payment
        fields = [
            'id', 'order_id', 'customer_email',
            'amount', 'currency', 'status',
            'payment_method', 'transaction_id',
            'sp_code', 'sp_message',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class AdminPaymentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['status', 'payment_method']
