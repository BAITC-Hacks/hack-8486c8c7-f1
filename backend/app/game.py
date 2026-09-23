from datetime import datetime, timezone, timedelta

from .db import read, save
from .scoring import score


def now():
    return datetime.now(timezone.utc).isoformat()


def spotlight_until():
    return (
        datetime.now(timezone.utc)
        + timedelta(hours=24)
    ).isoformat()


def reward(db, task):
    """
    Начисляет Coins и XP только за достижение
    новых уровней Challenge Evolution.

    Mystery Box и квестовые награды удалены.
    """

    wallet = read(db, "wallet", 1)
    events = []

    rating = score(
        task["fields"],
        task["confirmed"]
    )

    levels = [
        (40, "Builder", 25, 40),
        (70, "Launch Ready", 50, 40),
        (90, "Gold Challenge", 100, 40),
    ]

    for threshold, title, coins, xp in levels:
        key = f"level_{threshold}"

        if (
            rating["score"] >= threshold
            and key not in task["earned"]
        ):
            task["earned"].append(key)

            task["xp"] += xp

            wallet["coins"] += coins
            wallet["xp"] += xp

            event = {
                "title": title,
                "coins": coins,
                "xp": xp,
                "at": now(),
                "challenge_id": task["id"],
            }

            events.append(event)
            wallet["history"].append(event)

    save(
        db,
        "wallet",
        wallet
    )

    return events