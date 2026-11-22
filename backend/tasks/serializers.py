
from django.utils import timezone
from rest_framework import serializers

from tasks.models import Category, Priority, Project, Status, Task


class OwnedSerializer(serializers.ModelSerializer):
    """Scopes every related-field queryset to the requesting user so nobody can
    point their rows at someone else's data."""

    owned_relations: tuple[str, ...] = ()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        for name in self.owned_relations:
            field = self.fields.get(name)
            if field is not None and user is not None:
                field.queryset = field.queryset.model.objects.filter(user=user)

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Name can't be empty.")
        model = self.Meta.model
        qs = model.objects.filter(user=self.context["request"].user, name__iexact=value)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"You already have one called “{value}”.")
        return value


class CategorySerializer(OwnedSerializer):
    task_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = ["id", "name", "color", "icon", "position", "task_count"]
        read_only_fields = ["position"]


class ProjectSerializer(OwnedSerializer):
    owned_relations = ("category",)
    task_count = serializers.IntegerField(read_only=True, default=0)
    done_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Project
        fields = [
            "id", "name", "color", "description", "category", "is_archived",
            "position", "task_count", "done_count",
        ]
        read_only_fields = ["position"]


class StatusSerializer(OwnedSerializer):
    class Meta:
        model = Status
        fields = ["id", "name", "color", "kind", "position"]
        read_only_fields = ["position"]

    def validate_kind(self, value):
        inst = self.instance
        if inst and inst.kind == Status.Kind.DONE and value != Status.Kind.DONE:
            others = Status.objects.filter(user=inst.user, kind=Status.Kind.DONE).exclude(pk=inst.pk)
            if not others.exists():
                raise serializers.ValidationError("You need at least one “done” status.")
        if inst and inst.kind != Status.Kind.DONE and value == Status.Kind.DONE:
            others = Status.objects.filter(user=inst.user).exclude(kind=Status.Kind.DONE).exclude(pk=inst.pk)
            if not others.exists():
                raise serializers.ValidationError("You need at least one open status.")
        return value


class PrioritySerializer(OwnedSerializer):
    class Meta:
        model = Priority
        fields = ["id", "name", "color", "level", "position"]
        read_only_fields = ["position"]


class TaskSerializer(OwnedSerializer):
    owned_relations = ("status", "priority", "category", "project")
    status = serializers.PrimaryKeyRelatedField(queryset=Status.objects.none(), required=False)
    priority = serializers.PrimaryKeyRelatedField(
        queryset=Priority.objects.none(), required=False, allow_null=True
    )
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.none(), required=False, allow_null=True
    )
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.none(), required=False, allow_null=True
    )

    class Meta:
        model = Task
        fields = [
            "id", "title", "description", "status", "priority", "category", "project",
            "due_date", "due_time", "reminder_at", "reminder_sent", "completed_at",
            "position", "created_at", "updated_at",
        ]
        read_only_fields = ["completed_at", "position", "created_at", "updated_at"]

    def validate_name(self, value):  # tasks have titles, not names
        return value

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Give the task a title.")
        return value

    def validate(self, attrs):
        due_time = attrs.get("due_time", getattr(self.instance, "due_time", None))
        due_date = attrs.get("due_date", getattr(self.instance, "due_date", None))
        if due_time and not due_date:
            raise serializers.ValidationError({"due_time": "Pick a date before setting a time."})
        reminder = attrs.get("reminder_at")
        if "reminder_at" in attrs:
            # A new or moved reminder should fire again.
            attrs["reminder_sent"] = False
            if reminder and self.instance is None and reminder < timezone.now():
                raise serializers.ValidationError({"reminder_at": "Reminder is in the past."})
        return attrs

    def _apply_status(self, task: Task):
        task.sync_completion()

    def create(self, validated_data):
        user = self.context["request"].user
        if "status" not in validated_data:
            status = Status.objects.filter(user=user).exclude(kind=Status.Kind.DONE).first()
            if status is None:
                raise serializers.ValidationError({"status": "Create a status first."})
            validated_data["status"] = status
        task = Task(user=user, **validated_data)
        task.position = 0
        self._apply_status(task)
        task.save()
        return task

    def update(self, instance, validated_data):
        for key, value in validated_data.items():
            setattr(instance, key, value)
        self._apply_status(instance)
        instance.save()
        return instance
