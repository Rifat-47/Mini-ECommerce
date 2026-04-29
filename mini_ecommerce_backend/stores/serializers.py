from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Store, StoreSettings, StoreMembership

User = get_user_model()


class StoreSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StoreSettings
        exclude = ('id', 'store')


class StoreCreateSerializer(serializers.Serializer):
    # Basic store info
    name             = serializers.CharField(max_length=100)
    slug             = serializers.SlugField(max_length=50)
    owner_email      = serializers.EmailField()
    owner_first_name = serializers.CharField(max_length=150, required=False, default='')
    owner_last_name  = serializers.CharField(max_length=150, required=False, default='')

    # Optional initial settings (all optional — defaults match StoreSettings model)
    support_email          = serializers.EmailField(required=False, default='')
    currency               = serializers.CharField(max_length=10, required=False, default='BDT')
    tax_rate               = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    cod_enabled            = serializers.BooleanField(required=False, default=True)
    online_payment_enabled = serializers.BooleanField(required=False, default=True)

    def validate_slug(self, value):
        if Store.objects.filter(slug=value).exists():
            raise serializers.ValidationError('A store with this slug already exists.')
        return value

    def validate_owner_email(self, value):
        user = User.objects.filter(email=value).first()
        if user and user.role == 'platform_admin':
            raise serializers.ValidationError('This email belongs to the platform admin and cannot be a store owner.')
        return value


class StoreMembershipSerializer(serializers.ModelSerializer):
    email      = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name  = serializers.CharField(source='user.last_name', read_only=True)

    class Meta:
        model  = StoreMembership
        fields = ('id', 'email', 'first_name', 'last_name', 'role', 'created_at')


class StoreListSerializer(serializers.ModelSerializer):
    owner_email    = serializers.EmailField(source='owner.email', read_only=True)
    customer_count = serializers.SerializerMethodField()
    order_count    = serializers.SerializerMethodField()
    revenue        = serializers.SerializerMethodField()

    class Meta:
        model  = Store
        fields = ('id', 'name', 'slug', 'status', 'owner_email',
                  'customer_count', 'order_count', 'revenue', 'created_at')

    def get_customer_count(self, obj):
        return obj.customers.count()

    def get_order_count(self, obj):
        return obj.orders.count()

    def get_revenue(self, obj):
        from django.db.models import Sum
        from decimal import Decimal
        result = obj.orders.exclude(status='Cancelled').aggregate(t=Sum('total_amount'))
        return round(result['t'] or Decimal('0'), 2)


class StoreDetailSerializer(serializers.ModelSerializer):
    settings    = StoreSettingsSerializer(read_only=True)
    memberships = StoreMembershipSerializer(many=True, read_only=True)
    owner_email = serializers.EmailField(source='owner.email', read_only=True)

    class Meta:
        model  = Store
        fields = ('id', 'name', 'slug', 'status', 'custom_domain', 'logo',
                  'owner_email', 'settings', 'memberships', 'created_at')


class StoreUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Store
        fields = ('name', 'custom_domain', 'logo')
