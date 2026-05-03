from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('customer/register/',                                views.CustomerRegisterView.as_view()),
    path('customer/login/',                                   views.CustomerLoginView.as_view()),
    path('customer/logout/',                                  views.CustomerLogoutView.as_view()),
    path('customer/token/refresh/',                           views.CustomerTokenRefreshView.as_view()),
    path('customer/forgot-password/',                         views.CustomerForgotPasswordView.as_view()),
    path('customer/reset-password/<str:uid>/<str:token>/',    views.CustomerResetPasswordConfirmView.as_view()),

    # Profile
    path('customer/profile/',                                 views.CustomerProfileView.as_view()),
    path('customer/profile/change-password/',                 views.CustomerChangePasswordView.as_view()),

    # Addresses
    path('customer/addresses/',                               views.CustomerAddressListCreateView.as_view()),
    path('customer/addresses/<int:pk>/',                      views.CustomerAddressDetailView.as_view()),
    path('customer/addresses/<int:pk>/set-default/',          views.CustomerAddressSetDefaultView.as_view()),
]
