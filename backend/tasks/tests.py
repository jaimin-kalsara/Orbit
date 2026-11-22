from rest_framework.test import APIClient, APITestCase


class ApiFlowTests(APITestCase):
    def register(self, email="alex@example.com"):
        client = APIClient(enforce_csrf_checks=False)
        res = client.post(
            "/api/auth/register/",
            {"name": "Alex", "email": email, "password": "Sup3r-secret-pw", "timezone": "Asia/Kolkata"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.data)
        return client

    def test_full_task_lifecycle(self):
        c = self.register()
        boot = c.get("/api/bootstrap/").data
        self.assertEqual(len(boot["statuses"]), 3)
        self.assertEqual(boot["preferences"]["timezone"], "Asia/Kolkata")
        done = next(s for s in boot["statuses"] if s["kind"] == "done")

        res = c.post("/api/tasks/", {"title": "  Ship v1  ", "due_date": "2026-01-01"}, format="json")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["title"], "Ship v1")
        tid = res.data["id"]

        res = c.patch(f"/api/tasks/{tid}/", {"status": done["id"]}, format="json")
        self.assertIsNotNone(res.data["completed_at"])

        stats = c.get("/api/stats/?period=week").data
        self.assertEqual(stats["totals"]["completed"], 1)
        self.assertEqual(stats["goal"]["completed_today"], 1)
        self.assertEqual(stats["streak"]["current"], 1)

        res = c.patch("/api/auth/preferences/", {"theme": "light", "daily_goal": 8}, format="json")
        self.assertEqual(res.data["theme"], "light")
        self.assertEqual(c.get("/api/auth/preferences/").data["daily_goal"], 8)

        self.assertEqual(c.delete(f"/api/tasks/{tid}/").status_code, 204)

    def test_users_are_isolated(self):
        a = self.register("a@example.com")
        b = self.register("b@example.com")
        tid = a.post("/api/tasks/", {"title": "secret"}, format="json").data["id"]
        self.assertEqual(b.get(f"/api/tasks/{tid}/").status_code, 404)
        b_status = b.get("/api/statuses/").data[0]["id"]
        res = a.patch(f"/api/tasks/{tid}/", {"status": b_status}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_status_rules_and_reorder(self):
        c = self.register()
        statuses = c.get("/api/statuses/").data
        done = next(s for s in statuses if s["kind"] == "done")
        self.assertEqual(c.delete(f"/api/statuses/{done['id']}/").status_code, 400)
        new = c.post("/api/statuses/", {"name": "Blocked", "color": "#FF0000", "kind": "todo"}, format="json")
        self.assertEqual(new.status_code, 201, new.data)
        dup = c.post("/api/statuses/", {"name": "blocked", "kind": "todo"}, format="json")
        self.assertEqual(dup.status_code, 400)
        ids = [s["id"] for s in c.get("/api/statuses/").data][::-1]
        self.assertEqual(c.post("/api/statuses/reorder/", {"ids": ids}, format="json").status_code, 204)
        self.assertEqual([s["id"] for s in c.get("/api/statuses/").data], ids)

    def test_requires_auth(self):
        self.assertEqual(APIClient().get("/api/tasks/").status_code, 403)
