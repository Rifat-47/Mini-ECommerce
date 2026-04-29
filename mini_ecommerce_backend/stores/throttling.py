from rest_framework.throttling import SimpleRateThrottle


class StoreAnonRateThrottle(SimpleRateThrottle):
    """
    Rate-limits anonymous requests per store rather than per IP.
    Uses store slug as the cache key so stores get independent buckets.
    Falls back to IP-based throttling when no store context is present.
    """
    scope = 'store_anon'

    def get_cache_key(self, request, view):
        store = getattr(request, 'store', None)
        if store:
            ident = f'store_{store.slug}'
        else:
            ident = self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': ident}


class StoreUserRateThrottle(SimpleRateThrottle):
    """
    Rate-limits authenticated staff requests per store.
    Authenticated users within the same store share one bucket.
    """
    scope = 'store_user'

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None  # not applicable — let StoreAnonRateThrottle handle it
        store = getattr(request, 'store', None)
        ident = f'store_{store.slug}' if store else str(request.user.pk)
        return self.cache_format % {'scope': self.scope, 'ident': ident}
