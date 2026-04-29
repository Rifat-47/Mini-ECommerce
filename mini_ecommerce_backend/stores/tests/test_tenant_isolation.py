"""
Tenant isolation tests — assert that Store A data is invisible when Store B context is active.

Uses APIRequestFactory + force_authenticate (bypasses DRF authentication pipeline) and
manually sets request.store (simulates TenantMiddleware).
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate

from stores.models import Store, StoreSettings, StoreMembership
from catalog.models import Category, Product
from orders.models import Order, Coupon
from cart.models import CartItem, WishlistItem
from catalog.views import CategoryViewSet, ProductViewSet
from orders.views import OrderViewSet, AdminCouponViewSet
from cart.views import CartListCreateView, WishlistListCreateView

User = get_user_model()


def _make_store(name, slug, owner):
    store = Store.objects.create(name=name, slug=slug, owner=owner, status='active')
    StoreMembership.objects.create(store=store, user=owner, role='store_owner')
    return store


class TenantIsolationTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        self.owner_a = User.objects.create_user(email='a@test.com', password='pw', role='store_owner')
        self.owner_b = User.objects.create_user(email='b@test.com', password='pw', role='store_owner')

        self.store_a = _make_store('Store A', 'store-a', self.owner_a)
        self.store_b = _make_store('Store B', 'store-b', self.owner_b)

        self.cat_a = Category.objects.create(store=self.store_a, name='Cat A', status='active')
        self.product_a = Product.objects.create(
            store=self.store_a, category=self.cat_a,
            name='Product A', price='10.00', stock=5, status='active',
        )
        self.coupon_a = Coupon.objects.create(
            store=self.store_a, code='DEAL-A', discount_type='percentage', discount_value=10
        )

        self.cat_b = Category.objects.create(store=self.store_b, name='Cat B', status='active')
        self.product_b = Product.objects.create(
            store=self.store_b, category=self.cat_b,
            name='Product B', price='20.00', stock=3, status='active',
        )
        self.coupon_b = Coupon.objects.create(
            store=self.store_b, code='DEAL-B', discount_type='percentage', discount_value=15
        )

    def _get(self, store, user):
        """Authenticated GET request with store context set."""
        request = self.factory.get('/')
        force_authenticate(request, user=user)
        request.store = store
        return request

    def _unwrap(self, data):
        """Return the list of items from a possibly-paginated DRF response."""
        if isinstance(data, dict):
            return data.get('results', data.get('items', []))
        return data

    # ── Categories ───────────────────────────────────────────────────────────

    def test_category_list_only_shows_current_store(self):
        request = self._get(self.store_a, self.owner_a)
        view = CategoryViewSet.as_view({'get': 'list'})
        response = view(request)
        names = [c['name'] for c in self._unwrap(response.data)]
        self.assertIn('Cat A', names)
        self.assertNotIn('Cat B', names)

    def test_category_list_store_b_does_not_see_store_a(self):
        request = self._get(self.store_b, self.owner_b)
        view = CategoryViewSet.as_view({'get': 'list'})
        response = view(request)
        names = [c['name'] for c in self._unwrap(response.data)]
        self.assertNotIn('Cat A', names)
        self.assertIn('Cat B', names)

    # ── Products ─────────────────────────────────────────────────────────────

    def test_product_list_only_shows_current_store(self):
        request = self._get(self.store_a, self.owner_a)
        view = ProductViewSet.as_view({'get': 'list'})
        response = view(request)
        names = [p['name'] for p in self._unwrap(response.data)]
        self.assertIn('Product A', names)
        self.assertNotIn('Product B', names)

    def test_product_list_store_b_isolation(self):
        request = self._get(self.store_b, self.owner_b)
        view = ProductViewSet.as_view({'get': 'list'})
        response = view(request)
        names = [p['name'] for p in self._unwrap(response.data)]
        self.assertNotIn('Product A', names)
        self.assertIn('Product B', names)

    # ── Orders ───────────────────────────────────────────────────────────────

    def test_orders_scoped_to_store(self):
        order_a = Order.objects.create(
            store=self.store_a, user=self.owner_a,
            status='Pending', total_amount='10.00',
        )
        Order.objects.create(
            store=self.store_b, user=self.owner_b,
            status='Pending', total_amount='20.00',
        )

        request = self._get(self.store_a, self.owner_a)
        view = OrderViewSet.as_view({'get': 'list'})
        response = view(request)
        order_ids = [o['id'] for o in self._unwrap(response.data)]
        self.assertIn(order_a.pk, order_ids)
        self.assertEqual(len(order_ids), 1)

    # ── Coupons ──────────────────────────────────────────────────────────────

    def test_coupons_scoped_to_store(self):
        request = self._get(self.store_a, self.owner_a)
        view = AdminCouponViewSet.as_view({'get': 'list'})
        response = view(request)
        codes = [c['code'] for c in self._unwrap(response.data)]
        self.assertIn('DEAL-A', codes)
        self.assertNotIn('DEAL-B', codes)

    # ── Cart ─────────────────────────────────────────────────────────────────

    def test_cart_scoped_to_store(self):
        item_a = CartItem.objects.create(
            store=self.store_a, user=self.owner_a, product=self.product_a, quantity=1
        )
        CartItem.objects.create(
            store=self.store_b, user=self.owner_a, product=self.product_b, quantity=1
        )

        request = self._get(self.store_a, self.owner_a)
        view = CartListCreateView.as_view()
        response = view(request)
        items = response.data.get('items', [])
        item_ids = [i['id'] for i in items]
        self.assertIn(item_a.pk, item_ids)
        self.assertEqual(len(item_ids), 1)

    # ── Wishlist ─────────────────────────────────────────────────────────────

    def test_wishlist_scoped_to_store(self):
        item_a = WishlistItem.objects.create(
            store=self.store_a, user=self.owner_a, product=self.product_a
        )
        WishlistItem.objects.create(
            store=self.store_b, user=self.owner_a, product=self.product_b
        )

        request = self._get(self.store_a, self.owner_a)
        view = WishlistListCreateView.as_view()
        response = view(request)
        item_ids = [i['id'] for i in self._unwrap(response.data)]
        self.assertIn(item_a.pk, item_ids)
        self.assertEqual(len(item_ids), 1)
