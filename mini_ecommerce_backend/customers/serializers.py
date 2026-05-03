from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import Customer, CustomerAddress


class CustomerRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = Customer
        fields = ('email', 'password', 'first_name', 'last_name', 'date_of_birth')

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate_email(self, value):
        store = self.context.get('store')
        if store and Customer.objects.filter(store=store, email=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def create(self, validated_data):
        store    = self.context['store']
        password = validated_data.pop('password')
        return Customer.objects.create_customer(store=store, password=password, **validated_data)


class CustomerLoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField()


class CustomerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model        = Customer
        fields       = ('id', 'email', 'first_name', 'last_name', 'date_of_birth', 'created_at')
        read_only_fields = ('id', 'email', 'created_at')


class CustomerChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate_new_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value


class CustomerAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model   = CustomerAddress
        exclude = ('customer',)
        read_only_fields = ('id', 'created_at')
