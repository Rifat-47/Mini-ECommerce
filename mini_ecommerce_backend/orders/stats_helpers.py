from decimal import Decimal
from django.db.models import Sum, Count, F
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import Order, OrderItem

User = get_user_model()


def get_dashboard_stats(top_n=5):
    """
    Returns a dict of dashboard stats consumed by both the API view and
    the Django admin stats page. Add new metrics here — both surfaces pick
    them up automatically.
    """
    non_cancelled = Order.objects.exclude(status='Cancelled')
    today = timezone.localdate()

    overview = {
        'total_orders': non_cancelled.count(),
        'total_revenue': round(
            non_cancelled.aggregate(t=Sum('total_amount'))['t'] or Decimal('0'), 2
        ),
        'total_customers': User.objects.filter(role='customer').count(),
        'new_users_today': User.objects.filter(date_joined__date=today).count(),
    }

    status_map = {s: 0 for s, _ in Order.STATUS_CHOICES}
    for row in Order.objects.values('status').annotate(count=Count('id')):
        status_map[row['status']] = row['count']
    status_counts = [{'status': s, 'count': c} for s, c in status_map.items()]

    top_products = list(
        OrderItem.objects
        .values('product__id', 'product__name')
        .annotate(
            order_frequency=Count('order', distinct=True),
            units_sold=Sum('quantity'),
            revenue=Sum(F('price_at_purchase')),
        )
        .order_by('-revenue')[:top_n]
    )

    return {
        'overview': overview,
        'orders_by_status': status_counts,
        'top_products': top_products,
    }
