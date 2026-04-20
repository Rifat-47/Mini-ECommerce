from django.contrib import admin
from .models import Product, Category, ProductImage, Review


class CategoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'description']

class ProductAdmin(admin.ModelAdmin):
    list_display = ['id', 'category', 'name', 'price', 'discount_percentage', 'stock']

class ProductImageAdmin(admin.ModelAdmin):
    list_display = ['id', 'product', 'is_primary', 'uploaded_at']
    list_filter = ['is_primary']
    search_fields = ['product__name']

class ReviewAdmin(admin.ModelAdmin):
    list_display = ['id', 'product', 'user', 'rating', 'created_at']
    list_filter = ['rating']
    search_fields = ['user__email', 'product__name']

admin.site.register(Product, ProductAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(ProductImage, ProductImageAdmin)
admin.site.register(Review, ReviewAdmin)


