from .models import StockMovement


def record_stock_movement(product, change_type, quantity_change, reason='', created_by=None):
    """
    Record a stock movement and update product.stock atomically.
    quantity_change: positive = stock added, negative = stock removed.
    """
    product.stock += quantity_change
    product.save(update_fields=['stock'])
    StockMovement.objects.create(
        product=product,
        change_type=change_type,
        quantity_change=quantity_change,
        stock_after=product.stock,
        reason=reason,
        created_by=created_by,
    )
