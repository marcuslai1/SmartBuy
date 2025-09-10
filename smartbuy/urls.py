from django.contrib import admin
from django.urls import path
from phones.views import RecommendationView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/recommendations/", RecommendationView.as_view(), name="recommendation"),

]
