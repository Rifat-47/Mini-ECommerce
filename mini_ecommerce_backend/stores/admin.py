from django.contrib import admin
from .models import Store, StoreSettings, StoreMembership


class StoreSettingsInline(admin.StackedInline):
    model = StoreSettings
    extra = 0


class StoreMembershipInline(admin.TabularInline):
    model = StoreMembership
    extra = 0


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'owner', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('name', 'slug', 'owner__email')
    inlines = [StoreSettingsInline, StoreMembershipInline]


@admin.register(StoreMembership)
class StoreMembershipAdmin(admin.ModelAdmin):
    list_display = ('store', 'user', 'role', 'created_at')
    list_filter = ('role',)
    search_fields = ('store__name', 'user__email')
