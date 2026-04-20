from django.urls import path
from .views import (
    WishlistListCreateView, WishlistItemDetailView, WishlistMoveToCartView,
    CartListCreateView, CartItemDetailView,
)

urlpatterns = [
    # Wishlist
    path('wishlist/', WishlistListCreateView.as_view(), name='wishlist'),
    path('wishlist/<int:pk>/', WishlistItemDetailView.as_view(), name='wishlist-item-detail'),
    path('wishlist/<int:pk>/move-to-cart/', WishlistMoveToCartView.as_view(), name='wishlist-move-to-cart'),

    # Cart
    path('cart/', CartListCreateView.as_view(), name='cart'),
    path('cart/<int:pk>/', CartItemDetailView.as_view(), name='cart-item-detail'),
]
