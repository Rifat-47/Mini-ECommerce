from django.contrib import admin
from .models import Customer, CustomerAddress


class CustomerAddressInline(admin.TabularInline):
    model = CustomerAddress
    extra = 0


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display  = ('email', 'store', 'first_name', 'last_name', 'is_active', 'created_at')
    list_filter   = ('store', 'is_active')
    search_fields = ('email', 'first_name', 'last_name', 'store__name')
    inlines       = [CustomerAddressInline]
