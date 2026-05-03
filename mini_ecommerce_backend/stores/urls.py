from django.urls import path
from . import views

urlpatterns = [
    path('platform/stores/',               views.PlatformStoreListCreateView.as_view()),
    path('platform/stores/<int:pk>/',      views.PlatformStoreDetailView.as_view()),
    path('platform/stores/<int:pk>/suspend/',  views.PlatformStoreSuspendView.as_view()),
    path('platform/stores/<int:pk>/activate/', views.PlatformStoreActivateView.as_view()),
    path('platform/stores/<int:pk>/resend-invite/', views.ResendInviteView.as_view()),
    path('platform/stats/',                views.PlatformStatsView.as_view()),
    path('auth/my-stores/',                views.MyStoresView.as_view()),
    path('admin/settings/',                views.AdminStoreSettingsView.as_view()),
]
