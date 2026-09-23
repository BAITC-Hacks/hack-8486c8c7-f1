"""Deterministic, public completeness rubric. Never called by an LLM."""
import re

FIELDS = {
    "context": ("Контекст", 12), "need": ("Потребность", 12),
    "data": ("Данные и материалы", 12), "result": ("Ожидаемый результат", 12),
    "success": ("Критерии успеха", 12), "constraints": ("Ограничения", 12),
    "users": ("Пользователи", 5), "contact": ("Контакт", 3),
    "interaction": ("Формат консультаций", 8), "feedback": ("Порядок обратной связи", 8),
}
RULES = [
    ("context_need", "Контекст и потребность", 20, [("context", 10), ("need", 10)]),
    ("data", "Данные и материалы", 20, [("data", 20)]),
    ("result", "Ожидаемый результат", 15, [("result", 15)]),
    ("success", "Критерии успеха", 15, [("success", 15)]),
    ("constraints", "Ограничения", 10, [("constraints", 10)]),
    ("users", "Пользователи", 10, [("users", 10)]),
    ("business", "Связь с бизнесом", 10, [("contact", 4), ("interaction", 3), ("feedback", 3)]),
]
QUESTS = {"context_need": ("Story Builder", 20), "data": ("Data Hunter", 30),
          "result": ("Outcome Maker", 20), "success": ("Make It Measurable", 30),
          "constraints": ("Set the Rules", 15), "users": ("People First", 15),
          "business": ("Stay Connected", 20)}
LEVELS = ["Idea", "Builder", "Launch Ready", "Gold Challenge"]


def complete(key, value):
    value = value.strip()
    if value.lower() in {"не знаю", "уточним позже", "нет информации", "не определено"}:
        return False
    if len(value) < FIELDS[key][1]:
        return False
    return key != "success" or bool(re.search(r"\d", value))


def score(fields, confirmed=True):
    breakdown = []
    for key, label, weight, parts in RULES:
        missing = [k for k, _ in parts if not confirmed or not complete(k, fields.get(k, ""))]
        points = sum(w for k, w in parts if k not in missing)
        breakdown.append(dict(key=key, label=label, weight=weight, points=points, missing=missing))
    total = sum(r["points"] for r in breakdown)
    index = 0 if total < 40 else 1 if total < 70 else 2 if total < 90 else 3
    return dict(score=total, level=LEVELS[index], level_index=index, breakdown=breakdown)


def enrich(task):
    return {**task, **score(task["fields"], task["confirmed"]), "quests": [
        dict(key=k, title=v[0], coins=v[1], xp=20, done=k in task["earned"])
        for k, v in QUESTS.items()
    ]}
