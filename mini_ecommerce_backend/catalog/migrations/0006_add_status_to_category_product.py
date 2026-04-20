from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0005_add_stock_movement_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='category',
            name='status',
            field=models.CharField(
                choices=[('active', 'Active'), ('inactive', 'Inactive')],
                default='active',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='product',
            name='status',
            field=models.CharField(
                choices=[('active', 'Active'), ('inactive', 'Inactive')],
                default='active',
                max_length=10,
            ),
        ),
    ]
