from django.contrib import admin
from .models import User
class UserAdmin(admin.ModelAdmin):
    # Specify the fields to display as columns
    list_display = ('id', 'first_name', 'email', 'role')

admin.site.register(User, UserAdmin)