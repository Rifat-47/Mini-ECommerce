from django.contrib import admin
from django.template.response import TemplateResponse
from .models import Order, OrderItem, Coupon, ReturnRequest, DashboardStats
from .stats_helpers import get_dashboard_stats


class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'shipping_address', 'coupon', 'discount_amount', 'total_amount', 'status', 'created_at']

    def save_model(self, request, obj, form, change):
        if not change:
            super().save_model(request, obj, form, change)
            return

        old_status = Order.objects.filter(pk=obj.pk).values_list('status', flat=True).first()
        super().save_model(request, obj, form, change)

        new_status = obj.status
        if old_status == new_status:
            return

        # Sync ReturnRequest when Order.status is changed via Django admin
        try:
            rr = obj.return_request
        except ReturnRequest.DoesNotExist:
            return

        if new_status == 'Return-Approved' and rr.status != 'approved':
            # Approval path: sync return request to approved
            rr.status = 'approved'
            rr.save(update_fields=['status'])

        elif new_status == 'Returned':
            # Physical return complete — keep return request as approved, no change
            pass

        elif new_status == 'Delivered' and rr.status in ('pending', 'approved'):
            # Rejection path: order reverted to Delivered means return was rejected
            rr.status = 'rejected'
            rr.save(update_fields=['status'])

        elif new_status not in ('Return-Approved', 'Returned', 'Return-Requested', 'Delivered') and rr.status == 'approved':
            # Admin moved to unrelated status (e.g. Cancelled) — revert return to pending
            rr.status = 'pending'
            rr.save(update_fields=['status'])

class OrderItemAdmin(admin.ModelAdmin):
    list_display = ['order', 'product', 'quantity', 'price_at_purchase']

class CouponAdmin(admin.ModelAdmin):
    list_display = ['id', 'code', 'discount_type', 'discount_value', 'expiry_date', 'usage_limit', 'per_user_limit', 'times_used', 'is_active', 'user']
    search_fields = ['code', 'user__email']
    list_filter = ['discount_type', 'is_active']
    raw_id_fields = ['user']

class ReturnRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'order', 'status', 'refund_status', 'created_at']
    list_filter = ['status', 'refund_status']
    search_fields = ['order__id']
    readonly_fields = ['order', 'reason', 'refund_status', 'created_at', 'updated_at']

    def save_model(self, request, obj, form, change):
        if not change:
            super().save_model(request, obj, form, change)
            return

        old_status = ReturnRequest.objects.filter(pk=obj.pk).values_list('status', flat=True).first()
        super().save_model(request, obj, form, change)

        new_status = obj.status
        if old_status == new_status:
            return

        # Sync Order.status when ReturnRequest.status is changed via Django admin
        order = obj.order
        if new_status == 'approved' and order.status != 'Return-Approved':
            order.status = 'Return-Approved'
            order.save(update_fields=['status'])
        elif new_status == 'rejected' and order.status not in ('Delivered', 'Returned'):
            order.status = 'Delivered'
            order.save(update_fields=['status'])
        elif new_status == 'pending' and order.status == 'Return-Approved':
            order.status = 'Return-Requested'
            order.save(update_fields=['status'])

admin.site.register(Order, OrderAdmin)
admin.site.register(OrderItem, OrderItemAdmin)
admin.site.register(Coupon, CouponAdmin)
admin.site.register(ReturnRequest, ReturnRequestAdmin)


@admin.register(DashboardStats)
class DashboardStatsAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        stats = get_dashboard_stats(top_n=10)
        context = {
            **self.admin_site.each_context(request),
            'title': 'Dashboard Stats',
            'overview': stats['overview'],
            'orders_by_status': stats['orders_by_status'].items(),
            'top_products': stats['top_products'],
            'opts': self.model._meta,
        }
        return TemplateResponse(request, 'admin/orders/dashboard_stats.html', context)
