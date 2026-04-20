# Generated manually on 2026-04-16

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0002_rename_discount_product_discount_percentage'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Review',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rating', models.PositiveSmallIntegerField(validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(5),
                ])),
                ('comment', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reviews',
                    to='catalog.product',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reviews',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'unique_together': {('product', 'user')},
            },
        ),
    ]
