from datetime import timedelta

from django.db import transaction
from django.db.models import Count, Max, Q
from django.utils import timezone
from rest_framework import serializers as drf_serializers
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.defaults import provision_user
from accounts.models import UserPreference
from accounts.serializers import PreferenceSerializer, UserSerializer
from tasks.models import Category, Priority, Project, Status, Task
from tasks.serializers import (
    CategorySerializer,
    PrioritySerializer,
    ProjectSerializer,
    StatusSerializer,
    TaskSerializer,
)
from tasks.stats import build_stats, local_today


class ReorderSerializer(drf_serializers.Serializer):
    ids = drf_serializers.ListField(child=drf_serializers.IntegerField(min_value=1), max_length=5000)


class OwnedViewSet(viewsets.ModelViewSet):
    model = None

    def get_queryset(self):
        return self.model.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        last = self.get_queryset().aggregate(m=Max("position"))["m"]
        serializer.save(user=self.request.user, position=(last + 1) if last is not None else 0)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """Persist a drag-and-drop order. Body: {"ids": [3, 1, 2]}."""
        payload = ReorderSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        ids = payload.validated_data["ids"]
        rows = {obj.pk: obj for obj in self.get_queryset().filter(pk__in=ids)}
        if len(rows) != len(set(ids)):
            raise ValidationError({"ids": "Some items don't exist."})
        for index, pk in enumerate(ids):
            rows[pk].position = index
        with transaction.atomic():
            self.model.objects.bulk_update(rows.values(), ["position"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class CategoryViewSet(OwnedViewSet):
    model = Category
    serializer_class = CategorySerializer

    def get_queryset(self):
        return super().get_queryset().annotate(task_count=Count("tasks"))


class ProjectViewSet(OwnedViewSet):
    model = Project
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return super().get_queryset().annotate(
            task_count=Count("tasks"),
            done_count=Count("tasks", filter=Q(tasks__status__kind=Status.Kind.DONE)),
        )


class PriorityViewSet(OwnedViewSet):
    model = Priority
    serializer_class = PrioritySerializer


class StatusViewSet(OwnedViewSet):
    model = Status
    serializer_class = StatusSerializer

    def destroy(self, request, *args, **kwargs):
        target = self.get_object()
        siblings = self.get_queryset().exclude(pk=target.pk)
        if not siblings.exists():
            raise ValidationError({"detail": "You need at least one status."})
        if target.kind == Status.Kind.DONE and not siblings.filter(kind=Status.Kind.DONE).exists():
            raise ValidationError({"detail": "You need at least one “done” status."})
        if target.kind != Status.Kind.DONE and not siblings.exclude(kind=Status.Kind.DONE).exists():
            raise ValidationError({"detail": "You need at least one open status."})

        move_to_id = request.query_params.get("move_to")
        with transaction.atomic():
            if target.tasks.exists():
                fallback = (
                    siblings.filter(pk=move_to_id).first()
                    if move_to_id
                    else siblings.filter(kind=target.kind).first() or siblings.first()
                )
                if fallback is None:
                    raise ValidationError({"move_to": "Pick a status to move tasks into."})
                for task in target.tasks.select_related("status"):
                    task.status = fallback
                    task.sync_completion()
                    task.save(update_fields=["status", "completed_at", "updated_at"])
            target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskViewSet(OwnedViewSet):
    model = Task
    serializer_class = TaskSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        for field in ("status", "priority", "category", "project"):
            value = params.get(field)
            if value == "none":
                qs = qs.filter(**{f"{field}__isnull": True})
            elif value and value.isdigit():
                qs = qs.filter(**{f"{field}_id": int(value)})
        if params.get("search"):
            term = params["search"][:100]
            qs = qs.filter(Q(title__icontains=term) | Q(description__icontains=term))
        when = params.get("when")
        if when:
            today = local_today(self.request.user)
            open_q = ~Q(status__kind=Status.Kind.DONE)
            if when == "today":
                qs = qs.filter(due_date=today)
            elif when == "overdue":
                qs = qs.filter(open_q, due_date__lt=today)
            elif when == "upcoming":
                qs = qs.filter(due_date__gt=today, due_date__lte=today + timedelta(days=7))
            elif when == "completed":
                qs = qs.filter(status__kind=Status.Kind.DONE)
        return qs

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=["post"], url_path="clear-completed")
    def clear_completed(self, request):
        deleted, _ = self.get_queryset().filter(status__kind=Status.Kind.DONE).delete()
        return Response({"deleted": deleted})

    @action(detail=True, methods=["post"], url_path="reminder-sent")
    def reminder_sent(self, request, pk=None):
        task = self.get_object()
        task.reminder_sent = True
        task.save(update_fields=["reminder_sent", "updated_at"])
        return Response(TaskSerializer(task, context={"request": request}).data)


class BootstrapView(APIView):
    """Everything the app shell needs in one round trip."""

    def get(self, request):
        user = request.user
        provision_user(user)
        ctx = {"request": request}
        pref = UserPreference.objects.get(user=user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "preferences": PreferenceSerializer(pref).data,
                "statuses": StatusSerializer(Status.objects.filter(user=user), many=True, context=ctx).data,
                "priorities": PrioritySerializer(Priority.objects.filter(user=user), many=True, context=ctx).data,
                "categories": CategorySerializer(
                    CategoryViewSet(request=request).get_queryset(), many=True, context=ctx
                ).data,
                "projects": ProjectSerializer(
                    ProjectViewSet(request=request).get_queryset(), many=True, context=ctx
                ).data,
                "tasks": TaskSerializer(Task.objects.filter(user=user), many=True, context=ctx).data,
                "server_time": timezone.now(),
            }
        )


class StatsView(APIView):
    def get(self, request):
        period = request.query_params.get("period", "week")
        if period not in {"week", "month", "30d"}:
            period = "week"
        return Response(build_stats(request.user, period))
