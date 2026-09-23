from datetime import datetime, timezone, timedelta
from .db import read, save
from .scoring import score, QUESTS, complete


def now():
    return datetime.now(timezone.utc).isoformat()


def spotlight_until():
    return (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()


def reward(db, task):
    wallet = read(db, "wallet", 1)
    events = []

    def grant(key, title, coins, xp, boxes=0):
        if key in task["earned"]:
            return
        task["earned"].append(key)
        task["xp"] += xp
        wallet["coins"] += coins
        wallet["xp"] += xp
        task["boxes"] += boxes
        event = dict(title=title, coins=coins, xp=xp, boxes=boxes, at=now(), challenge_id=task["id"])
        events.append(event)
        wallet["history"].append(event)

    rating = score(task["fields"], task["confirmed"])
    for row in rating["breakdown"]:
        if row["points"] == row["weight"]:
            title, coins = QUESTS[row["key"]]
            grant(row["key"], title, coins, 20)
    if task["questions"] and all(complete(q["field"], task["fields"].get(q["field"], "")) for q in task["questions"]):
        grant("student_friendly", "Student Friendly", 25, 30)
    for threshold, title, coins in [(40, "Builder", 25), (70, "Launch Ready", 50), (90, "Perfect Brief", 100)]:
        if rating["score"] >= threshold:
            grant(f"level_{threshold}", title, coins, 40, 1)
    achievements = [("data", "Data Ready"), ("success", "Crystal Clear"), ("level_90", "Perfect Brief")]
    for key, title in achievements:
        if key in task["earned"] and title not in task["achievements"]:
            task["achievements"].append(title)
    save(db, "wallet", wallet)
    return events

