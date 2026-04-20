from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, ProductViewSet,
    ProductImageListCreateView, ProductImageDetailView,
    ReviewListCreateView, ReviewDetailView,
    AdminProductBulkUpdateView, AdminProductExportView,
    ProductSuggestionsView,
    StockHistoryView, StockAdjustView,
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'products', ProductViewSet, basename='product')

urlpatterns = [
    path('', include(router.urls)),
    path('products/<int:product_pk>/images/', ProductImageListCreateView.as_view(), name='product-images'),
    path('products/<int:product_pk>/images/<int:pk>/', ProductImageDetailView.as_view(), name='product-image-detail'),
    path('products/<int:product_pk>/reviews/', ReviewListCreateView.as_view(), name='product-reviews'),
    path('products/<int:product_pk>/reviews/<int:pk>/', ReviewDetailView.as_view(), name='product-review-detail'),

    # Search suggestions
    path('products/search/suggestions/', ProductSuggestionsView.as_view(), name='product-suggestions'),

    # Bulk operations (admin)
    path('admin/products/bulk-update/', AdminProductBulkUpdateView.as_view(), name='admin-product-bulk-update'),
    path('admin/products/export/', AdminProductExportView.as_view(), name='admin-product-export'),

    # Inventory tracking (admin)
    path('admin/products/<int:product_pk>/stock-history/', StockHistoryView.as_view(), name='product-stock-history'),
    path('admin/products/<int:product_pk>/adjust-stock/', StockAdjustView.as_view(), name='product-adjust-stock'),
]
