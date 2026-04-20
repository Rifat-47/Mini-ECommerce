from django.contrib import admin
from .models import WishlistItem, CartItem


class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'product', 'added_at']
    search_fields = ['user__email', 'product__name']


class CartItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'product', 'quantity', 'added_at']
    search_fields = ['user__email', 'product__name']


admin.site.register(WishlistItem, WishlistItemAdmin)
admin.site.register(CartItem, CartItemAdmin)
