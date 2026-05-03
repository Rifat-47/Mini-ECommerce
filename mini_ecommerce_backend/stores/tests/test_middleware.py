from django.test import TestCase, RequestFactory, override_settings
from django.contrib.auth import get_user_model

from stores.middleware import TenantMiddleware
from stores.models import Store, StoreSettings

User = get_user_model()


def _make_get_response(store_attr_holder):
    """Dummy get_response that captures request.store for inspection."""
    def get_response(request):
        store_attr_holder['store'] = getattr(request, 'store', 'NOT_SET')
        from django.http import HttpResponse
        return HttpResponse('ok')
    return get_response


def _owner(email='owner@test.com'):
    return User.objects.create_user(email=email, password='pw', role='store_owner')


class TenantMiddlewareResolutionTests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.owner = _owner()
        self.store = Store.objects.create(
            name='Test Store', slug='test-store', owner=self.owner, status='active'
        )

    def _resolve(self, path='/', headers=None, server_name='testserver'):
        holder = {}
        middleware = TenantMiddleware(_make_get_response(holder))
        request = self.factory.get(path, SERVER_NAME=server_name)
        if headers:
            for key, value in headers.items():
                env_key = 'HTTP_' + key.upper().replace('-', '_')
                request.META[env_key] = value
        middleware(request)
        return holder.get('store')

    def test_resolves_by_x_store_slug_header(self):
        store = self._resolve(headers={'X-Store-Slug': 'test-store'})
        self.assertIsNotNone(store)
        self.assertEqual(store.slug, 'test-store')

    def test_missing_slug_header_returns_none(self):
        store = self._resolve()
        self.assertIsNone(store)

    def test_invalid_slug_returns_none(self):
        store = self._resolve(headers={'X-Store-Slug': 'does-not-exist'})
        self.assertIsNone(store)

    def test_suspended_store_returns_none(self):
        self.store.status = 'suspended'
        self.store.save()
        store = self._resolve(headers={'X-Store-Slug': 'test-store'})
        self.assertIsNone(store)

    def test_deleted_store_returns_none(self):
        self.store.status = 'deleted'
        self.store.save()
        store = self._resolve(headers={'X-Store-Slug': 'test-store'})
        self.assertIsNone(store)

    @override_settings(ALLOWED_HOSTS=['test-store.shoply.com'])
    def test_resolves_by_subdomain(self):
        store = self._resolve(server_name='test-store.shoply.com')
        self.assertIsNotNone(store)
        self.assertEqual(store.slug, 'test-store')

    @override_settings(ALLOWED_HOSTS=['ghost.shoply.com'])
    def test_subdomain_with_wrong_slug_returns_none(self):
        store = self._resolve(server_name='ghost.shoply.com')
        self.assertIsNone(store)

    @override_settings(ALLOWED_HOSTS=['test-store.shoply.com'])
    def test_subdomain_resolution_takes_priority_over_header(self):
        """
        Subdomain is checked before the header.
        When both are present the subdomain slug wins.
        """
        other_owner = User.objects.create_user(
            email='other@test.com', password='pw', role='store_owner'
        )
        Store.objects.create(
            name='Other Store', slug='other-store', owner=other_owner, status='active'
        )
        store = self._resolve(
            server_name='test-store.shoply.com',
            headers={'X-Store-Slug': 'other-store'},
        )
        self.assertEqual(store.slug, 'test-store')


class StoreSettingsSignalTests(TestCase):
    def test_store_settings_auto_created_on_store_creation(self):
        owner = _owner('signal@test.com')
        store = Store.objects.create(name='Signal Store', slug='signal-store', owner=owner)
        self.assertTrue(StoreSettings.objects.filter(store=store).exists())

    def test_store_name_matches(self):
        owner = _owner('signal2@test.com')
        store = Store.objects.create(name='My Shop', slug='my-shop', owner=owner)
        self.assertEqual(store.name, 'My Shop')
