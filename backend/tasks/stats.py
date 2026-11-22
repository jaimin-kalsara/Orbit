"""Productivity statistics, computed in the user's own time zone."""
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db.models import Count, Q
from django.db.models.functions import TruncDate

from accounts.models import UserPreference
from tasks.models import Status, Task


def user_zone(user) -> ZoneInfo:
    name = UserPreference.objects.filter(user=user).values_list("timezone", flat=True).first() or "UTC"
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def local_today(user) -> date:
    return datetime.now(user_zone(user)).date()


def _period_range(period: str, today: date, week_start: int) -> tuple[date, date]:
    if period == "month":
        start = today.replace(day=1)
        next_month = (start + timedelta(days=32)).replace(day=1)
        return start, next_month - timedelta(days=1)
    if period == "30d":
        return today - timedelta(days=29), today
    # Python: Monday=0; preference: Sunday=0.
    python_start = (week_start - 1) % 7
    start = today - timedelta(days=(today.weekday() - python_start) % 7)
    return start, start + timedelta(days=6)


def _streak(completion_days: set[date], today: date) -> tuple[int, int]:
    """Current streak (today or yesterday counts as alive) and best streak."""
    current = 0
    cursor = today if today in completion_days else today - timedelta(days=1)
    while cursor in completion_days:
        current += 1
        cursor -= timedelta(days=1)
    best = run = 0
    prev = None
    for day in sorted(completion_days):
        run = run + 1 if prev and day - prev == timedelta(days=1) else 1
        best = max(best, run)
        prev = day
    return current, best


def build_stats(user, period: str = "week") -> dict:
    zone = user_zone(user)
    now = datetime.now(zone)
    today = now.date()
    pref = UserPreference.objects.filter(user=user).first()
    week_start = pref.week_start if pref else 1
    goal = pref.daily_goal if pref else 5

    tasks = Task.objects.filter(user=user)
    done_q = Q(status__kind=Status.Kind.DONE)
    open_q = ~done_q
    overdue_q = open_q & (
        Q(due_date__lt=today) | Q(due_date=today, due_time__isnull=False, due_time__lt=now.time())
    )

    totals = tasks.aggregate(
        total=Count("id"),
        completed=Count("id", filter=done_q),
        in_progress=Count("id", filter=Q(status__kind=Status.Kind.IN_PROGRESS)),
        todo=Count("id", filter=Q(status__kind=Status.Kind.TODO)),
        overdue=Count("id", filter=overdue_q),
        due_today=Count("id", filter=Q(due_date=today)),
        due_today_done=Count("id", filter=Q(due_date=today) & done_q),
    )
    totals["pending"] = totals["total"] - totals["completed"]

    start, end = _period_range(period, today, week_start)
    start_dt = datetime.combine(start, time.min, tzinfo=zone)
    end_dt = datetime.combine(end + timedelta(days=1), time.min, tzinfo=zone)

    completed_by_day = dict(
        tasks.filter(completed_at__gte=start_dt, completed_at__lt=end_dt)
        .annotate(day=TruncDate("completed_at", tzinfo=zone))
        .values_list("day")
        .annotate(n=Count("id"))
        .values_list("day", "n")
    )
    created_by_day = dict(
        tasks.filter(created_at__gte=start_dt, created_at__lt=end_dt)
        .annotate(day=TruncDate("created_at", tzinfo=zone))
        .values_list("day")
        .annotate(n=Count("id"))
        .values_list("day", "n")
    )
    series = []
    cursor = start
    while cursor <= end:
        series.append(
            {
                "date": cursor.isoformat(),
                "completed": completed_by_day.get(cursor, 0),
                "created": created_by_day.get(cursor, 0),
                "is_today": cursor == today,
                "is_future": cursor > today,
            }
        )
        cursor += timedelta(days=1)

    year_ago = datetime.combine(today - timedelta(days=366), time.min, tzinfo=zone)
    completion_days = set(
        tasks.filter(completed_at__gte=year_ago)
        .annotate(day=TruncDate("completed_at", tzinfo=zone))
        .values_list("day", flat=True)
        .distinct()
    )
    current_streak, best_streak = _streak(completion_days, today)
    completed_today = completed_by_day.get(today, 0) if start <= today <= end else (
        tasks.filter(completed_at__gte=datetime.combine(today, time.min, tzinfo=zone)).count()
    )

    by_category = list(
        tasks.values("category_id")
        .annotate(total=Count("id"), done=Count("id", filter=done_q))
        .order_by("-total")
    )
    by_priority = list(
        tasks.values("priority_id")
        .annotate(total=Count("id"), done=Count("id", filter=done_q), open=Count("id", filter=open_q))
        .order_by("-total")
    )

    period_completed = sum(d["completed"] for d in series)
    period_created = sum(d["created"] for d in series)
    elapsed_days = max(1, sum(1 for d in series if not d["is_future"]))

    return {
        "period": period,
        "range": {"start": start.isoformat(), "end": end.isoformat()},
        "today": today.isoformat(),
        "totals": totals,
        "completion_rate": round(totals["completed"] / totals["total"] * 100) if totals["total"] else 0,
        "goal": {"target": goal, "completed_today": completed_today},
        "streak": {"current": current_streak, "best": best_streak},
        "series": series,
        "period_summary": {
            "completed": period_completed,
            "created": period_created,
            "daily_average": round(period_completed / elapsed_days, 1),
            "goal_days_hit": sum(1 for d in series if d["completed"] >= goal),
        },
        "by_category": by_category,
        "by_priority": by_priority,
    }
