from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0001_initial'),
        ('orders', '0004_add_return_request_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='coupon',
            name='min_order_value',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Minimum cart total required to use this coupon.', max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='coupon',
            name='max_discount_amount',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Maximum discount that can be applied (caps percentage discounts).', max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='coupon',
            name='first_time_only',
            field=models.BooleanField(default=False, help_text='Restrict to customers who have never placed an order.'),
        ),
        migrations.AddField(
            model_name='coupon',
            name='applicable_categories',
            field=models.ManyToManyField(blank=True, help_text='Restrict to products in these categories. Leave empty to apply to all products.', related_name='coupons', to='catalog.category'),
        ),
        migrations.AlterField(
            model_name='coupon',
            name='discount_type',
            field=models.CharField(choices=[('percentage', 'Percentage'), ('fixed', 'Fixed Amount'), ('free_shipping', 'Free Shipping')], max_length=15),
        ),
        migrations.AlterField(
            model_name='coupon',
            name='discount_value',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
