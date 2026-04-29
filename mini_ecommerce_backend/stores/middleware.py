from .models import Store


class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.store = self._resolve_store(request)
        return self.get_response(request)

    def _resolve_store(self, request):
        # 1. Subdomain: store-slug.yourdomain.com
        host = request.get_host().split(':')[0]
        parts = host.split('.')
        if len(parts) >= 3:
            slug = parts[0]
            try:
                return Store.objects.select_related('settings').get(slug=slug, status='active')
            except Store.DoesNotExist:
                pass

        # 2. Header — used in development and Postman
        slug = request.headers.get('X-Store-Slug')
        if slug:
            try:
                return Store.objects.select_related('settings').get(slug=slug, status='active')
            except Store.DoesNotExist:
                pass

        return None
