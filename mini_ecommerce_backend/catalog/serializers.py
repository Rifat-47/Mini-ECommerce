from rest_framework import serializers
from django.db.models import Avg
from orders.models import Order
from .models import Category, Product, ProductImage, Review, StockMovement, MAX_IMAGES_PER_PRODUCT


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'is_primary', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

    def validate(self, attrs):
        product = self.context['product']
        # Only check limit on new uploads, not on PATCH (set primary)
        if self.instance is None:
            existing_count = ProductImage.objects.filter(product=product).count()
            if existing_count >= MAX_IMAGES_PER_PRODUCT:
                raise serializers.ValidationError(
                    f"A product can have at most {MAX_IMAGES_PER_PRODUCT} images."
                )
        return attrs

    def create(self, validated_data):
        product = self.context['product']
        # If no images exist yet, make the first upload primary automatically
        if not ProductImage.objects.filter(product=product).exists():
            validated_data['is_primary'] = True
        return ProductImage.objects.create(product=product, **validated_data)


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_average_rating(self, obj):
        avg = obj.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg is not None else None

    def get_review_count(self, obj):
        return obj.reviews.count()

    def get_images(self, obj):
        # Primary image first, then the rest ordered by upload time
        images = obj.images.order_by('-is_primary', 'uploaded_at')
        request = self.context.get('request')
        return [
            {
                'id': img.id,
                'image': request.build_absolute_uri(img.image.url) if request else img.image.url,
                'is_primary': img.is_primary,
                'uploaded_at': img.uploaded_at,
            }
            for img in images
        ]

class StockMovementSerializer(serializers.ModelSerializer):
    created_by_email = serializers.ReadOnlyField(source='created_by.email')

    class Meta:
        model = StockMovement
        fields = ['id', 'product', 'change_type', 'quantity_change', 'stock_after', 'reason', 'created_by_email', 'created_at']
        read_only_fields = fields


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    reviewer_email = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'product', 'reviewer_name', 'reviewer_email', 'rating', 'comment', 'created_at', 'updated_at']
        read_only_fields = ['id', 'product', 'reviewer_name', 'reviewer_email', 'created_at', 'updated_at']

    def get_reviewer_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email

    def get_reviewer_email(self, obj):
        return obj.user.email

    def validate(self, attrs):
        request = self.context['request']
        product = self.context['product']

        # On create, enforce verified buyer check
        if self.instance is None:
            has_delivered_order = Order.objects.filter(
                user=request.user,
                status='Delivered',
                items__product=product
            ).exists()
            if not has_delivered_order:
                raise serializers.ValidationError(
                    "You can only review products from your delivered orders."
                )

        return attrs

    def create(self, validated_data):
        return Review.objects.create(
            user=self.context['request'].user,
            product=self.context['product'],
            **validated_data
        )
