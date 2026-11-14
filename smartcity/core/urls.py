from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="home"),
    path("mon-espace/", views.dashboard, name="dashboard"),
]
