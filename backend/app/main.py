import os
from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .db import connect, init_db, read, save, all_rows
from .models import Draft, Edit, Proposal, Decision, Progress, Clarification
from .scoring import enrich, score, FIELDS
from .game import reward, now
from .seed import seed, new_task
from .ai import analyze


# =========================================================
# CONFIG
# =========================================================

ROOT = Path(__file__).resolve().parents[2]

load_dotenv(ROOT / ".env")


# =========================================================
# APP LIFESPAN
# =========================================================

@asynccontextmanager
async def lifespan(app):
    init_db()
    seed()
    yield


app = FastAPI(
    title="TaskQuest AI",
    version="1.0.0",
    lifespan=lifespan,
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=[
        "GET",
        "POST",
        "PUT",
    ],
    allow_headers=[
        "Content-Type",
        "X-Demo-Role",
    ],
)


# =========================================================
# ROLE CHECKS
# =========================================================

def business(
    x_demo_role: str = Header(default="")
):
    if x_demo_role != "Business":
        raise HTTPException(
            403,
            "Переключитесь в демо-роль Business",
        )


def student(
    x_demo_role: str = Header(default="")
):
    if x_demo_role != "Student":
        raise HTTPException(
            403,
            "Переключитесь в демо-роль Student",
        )


# =========================================================
# HELPERS
# =========================================================

def get(db, table, id):
    record = read(
        db,
        table,
        id,
    )

    if not record:
        raise HTTPException(
            404,
            "Запись не найдена",
        )

    return record


# =========================================================
# HEALTH
# =========================================================

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "ai_configured": bool(
            os.getenv("OPENAI_API_KEY")
        ),
        "demo": True,
    }


# =========================================================
# GLOBAL STATE
# =========================================================

@app.get("/api/state")
def state(
    x_demo_role: str = Header(
        default="Student"
    )
):
    with connect() as db:

        challenges = all_rows(
            db,
            "challenges",
        )

        tasks = [
            enrich(task)
            for task in challenges
            if (
                task["published"]
                or x_demo_role == "Business"
            )
        ]

        teams = all_rows(
            db,
            "teams",
        )

        applications = all_rows(
            db,
            "applications",
        )

        wallet = read(
            db,
            "wallet",
            1,
        )

        return {
            "challenges": sorted(
                tasks,
                key=lambda task: (
                    -task["score"],
                    -task["id"],
                ),
            ),

            "teams": teams,

            "applications": applications,

            "wallet": wallet,

            "fields": {
                key: {
                    "label": value[0],
                    "min_length": value[1],
                }
                for key, value
                in FIELDS.items()
            },
        }


# =========================================================
# CHALLENGE DETAIL
# =========================================================

@app.get("/api/challenges/{id}")
def detail(
    id: int,
    x_demo_role: str = Header(
        default="Student"
    ),
):
    with connect() as db:

        task = get(
            db,
            "challenges",
            id,
        )

        if (
            not task["published"]
            and x_demo_role != "Business"
        ):
            raise HTTPException(
                404,
                "Задача ещё не опубликована",
            )

        return enrich(task)


# =========================================================
# CREATE CHALLENGE
# =========================================================

@app.post(
    "/api/challenges",
    dependencies=[
        Depends(business)
    ],
    status_code=201,
)
def create(body: Draft):

    with connect() as db:

        cursor = db.execute(
            """
            INSERT INTO challenges(document)
            VALUES('{}')
            """
        )

        task = new_task(
            cursor.lastrowid,
            body.title,
            body.raw,
            body.topic,
        )

        save(
            db,
            "challenges",
            task,
        )

        return enrich(task)


# =========================================================
# SANA BOT ANALYSIS
# =========================================================

@app.post(
    "/api/challenges/{id}/analyze",
    dependencies=[
        Depends(business)
    ],
)
def questions(id: int, body: Clarification | None = None):

    # Сначала читаем задачу,
    # затем освобождаем БД на время AI-запроса.
    with connect() as db:

        task = get(
            db,
            "challenges",
            id,
        )

    analysis_task = task
    if body is not None:
        if body.version != task["version"]:
            raise HTTPException(409, "Карточка изменилась. Обновите страницу перед анализом.")
        analysis_task = {**task, "fields": body.fields.model_dump(), "topic": body.topic}
    result = analyze(analysis_task)

    with connect() as db:

        latest = get(
            db,
            "challenges",
            id,
        )

        if (
            latest["version"]
            != task["version"]
        ):
            raise HTTPException(
                409,
                "Карточка изменилась. "
                "Запустите анализ ещё раз.",
            )

        latest["questions"] = (
            result["questions"]
        )

        latest["ai_mode"] = (
            result["mode"]
        )

        latest["version"] += 1

        save(
            db,
            "challenges",
            latest,
        )

    return {
        **result,
        "task": enrich(latest),
    }


# =========================================================
# EDIT CHALLENGE
# =========================================================

@app.put(
    "/api/challenges/{id}",
    dependencies=[
        Depends(business)
    ],
)
def edit(
    id: int,
    body: Edit,
):

    with connect() as db:

        task = get(
            db,
            "challenges",
            id,
        )

        if (
            task["version"]
            != body.version
        ):
            raise HTTPException(
                409,
                "Карточка уже изменена. "
                "Обновите страницу перед сохранением.",
            )

        before = score(
            task["fields"],
            task["confirmed"],
        )

        task.update(
            title=body.title,
            topic=body.topic,
            fields=body.fields.model_dump(),
            confirmed=True,
            version=task["version"] + 1,
        )

        # Coins и XP за новые уровни
        # Challenge Evolution.
        events = reward(
            db,
            task,
        )

        rating = score(
            task["fields"]
        )

        if (
            not task["history"]
            or before["score"]
            != rating["score"]
        ):
            task["history"].append(
                {
                    "at": now(),
                    "score": rating["score"],
                    "level": rating["level"],
                    "title": (
                        "Бизнес подтвердил карточку"
                    ),
                }
            )

        save(
            db,
            "challenges",
            task,
        )

        return {
            "task": enrich(task),

            "rewards": events,

            "level_up": (
                rating["level_index"]
                > before["level_index"]
            ),
        }


# =========================================================
# PUBLISH CHALLENGE
# =========================================================

@app.post(
    "/api/challenges/{id}/publish",
    dependencies=[
        Depends(business)
    ],
)
def publish(id: int):

    with connect() as db:

        task = get(
            db,
            "challenges",
            id,
        )

        if not task["confirmed"]:
            raise HTTPException(
                400,
                "Сначала проверьте "
                "и подтвердите карточку",
            )

        task["published"] = True

        if (
            "First Challenge"
            not in task["achievements"]
        ):
            task["achievements"].append(
                "First Challenge"
            )

        save(
            db,
            "challenges",
            task,
        )

        return enrich(task)


# =========================================================
# STUDENT APPLICATION
# =========================================================

@app.post(
    "/api/challenges/{id}/applications",
    dependencies=[
        Depends(student)
    ],
    status_code=201,
)
def apply(
    id: int,
    body: Proposal,
):

    with connect() as db:

        task = get(
            db,
            "challenges",
            id,
        )

        get(
            db,
            "teams",
            body.team_id,
        )

        if not task["published"]:
            raise HTTPException(
                400,
                "Задача ещё не опубликована",
            )

        cursor = db.execute(
            """
            INSERT INTO applications(
                challenge_id,
                team_id,
                document
            )
            VALUES(?, ?, '{}')
            """,
            (
                id,
                body.team_id,
            ),
        )

        proposal = {
            "id": cursor.lastrowid,

            "challenge_id": id,

            **body.model_dump(
                mode="json"
            ),

            "status": "pending",

            "milestones": [],

            "created_at": now(),
        }

        save(
            db,
            "applications",
            proposal,
        )

        return proposal


# =========================================================
# APPLICATION DECISION
# =========================================================

@app.post(
    "/api/applications/{id}/decision",
    dependencies=[
        Depends(business)
    ],
)
def decide(
    id: int,
    body: Decision,
):

    with connect() as db:

        proposal = get(
            db,
            "applications",
            id,
        )

        proposal["status"] = (
            body.status
        )

        save(
            db,
            "applications",
            proposal,
        )

        if (
            body.status
            == "selected"
        ):
            task = get(
                db,
                "challenges",
                proposal[
                    "challenge_id"
                ],
            )

            if (
                "Team Found"
                not in task[
                    "achievements"
                ]
            ):
                task[
                    "achievements"
                ].append(
                    "Team Found"
                )

            save(
                db,
                "challenges",
                task,
            )

        return proposal


# =========================================================
# APPLICATION PROGRESS
# =========================================================

@app.post(
    "/api/applications/{id}/progress",
    dependencies=[
        Depends(business)
    ],
)
def progress(
    id: int,
    body: Progress,
):

    with connect() as db:

        proposal = get(
            db,
            "applications",
            id,
        )

        if (
            proposal["status"]
            != "selected"
        ):
            raise HTTPException(
                400,
                "Этапы подтверждаются "
                "только для выбранного отклика",
            )

        # Нельзя повторно подтвердить
        # тот же этап.
        if any(
            milestone["stage"]
            == body.stage
            for milestone
            in proposal["milestones"]
        ):
            raise HTTPException(
                409,
                "Этот этап уже подтверждён, "
                "XP уже начислен",
            )

        # Одна команда не может получить
        # XP несколько раз за один этап
        # одной и той же задачи.
        for other in all_rows(
            db,
            "applications",
        ):

            same_team = (
                other["team_id"]
                == proposal["team_id"]
            )

            same_challenge = (
                other["challenge_id"]
                == proposal["challenge_id"]
            )

            same_stage = any(
                milestone["stage"]
                == body.stage
                for milestone
                in other["milestones"]
            )

            if (
                same_team
                and same_challenge
                and same_stage
            ):
                raise HTTPException(
                    409,
                    "Команда уже получила XP "
                    "за этот этап этой задачи",
                )

        team = get(
            db,
            "teams",
            proposal["team_id"],
        )

        xp = {
            "discovery": 50,
            "prototype": 100,
            "delivery": 150,
        }[body.stage]

        team["xp"] += xp

        proposal[
            "milestones"
        ].append(
            {
                "stage": body.stage,

                "evidence": (
                    body.evidence
                ),

                "xp": xp,

                "confirmed_at": now(),
            }
        )

        save(
            db,
            "teams",
            team,
        )

        save(
            db,
            "applications",
            proposal,
        )

        return {
            "application": proposal,
            "team": team,
            "xp": xp,
        }


# =========================================================
# FRONTEND
# =========================================================

DIST = (
    ROOT
    / "frontend"
    / "dist"
)

if DIST.exists():
    app.mount(
        "/",
        StaticFiles(
            directory=DIST,
            html=True,
        ),
        name="frontend",
    )
