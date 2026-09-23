from .db import connect, dump
from .models import Brief
from .game import now
from .scoring import score


def new_task(
    id,
    title,
    raw,
    topic
):
    return {
        "id": id,
        "title": title,
        "raw": raw,
        "topic": topic,
        "company": "Sana Studio",

        "fields": Brief(
            context=raw
        ).model_dump(),

        "confirmed": False,
        "published": False,
        "version": 1,

        # Используется только для уже полученных
        # уровней Challenge Evolution.
        "earned": [],

        "xp": 0,

        "cosmetics": [],
        "spotlight_until": None,

        "achievements": [],
        "questions": [],
        "ai_mode": "mock",
        "history": [],

        "created_at": now(),
    }


def seed():
    with connect() as db:

        if db.execute(
            "SELECT COUNT(*) FROM challenges"
        ).fetchone()[0]:
            return

        # -----------------------------------------
        # WALLET
        # -----------------------------------------

        wallet = {
            "id": 1,
            "coins": 180,
            "xp": 120,
            "history": [
                {
                    "title": "Стартовый демо-баланс",
                    "coins": 180,
                    "xp": 120,
                    "at": now(),
                    "challenge_id": None,
                }
            ],
        }

        db.execute(
            "INSERT OR IGNORE INTO wallet VALUES(1, ?)",
            (
                dump(wallet),
            ),
        )


        # -----------------------------------------
        # DEMO CHALLENGES
        # -----------------------------------------

        records = [
            (
                "AI-анализ отзывов клиентов",
                "AI / NLP",
                "Qala Market",
                "Менеджеры вручную читают 5000 отзывов в месяц.",
                "Сократить ручной разбор и быстрее находить причины жалоб.",
                "CSV: 5000 обезличенных отзывов; доступ через тестовый набор.",
                "Веб-панель с темами отзывов, тональностью и экспортом CSV.",
                "F1 не ниже 0.85 на 300 отложенных размеченных отзывах.",
                "4 недели; Python; без персональных данных клиентов.",
                "Аналитики поддержки и руководитель клиентского сервиса.",
            ),
            (
                "Прогноз спроса для локальных магазинов",
                "Data Science",
                "Dala Retail",
                "Закупки планируют вручную, часто остаются излишки товаров.",
                "Помочь менеджеру планировать закупки на следующую неделю.",
                "CSV с недельными продажами за 2 года; предоставим после встречи.",
                "Прототип прогноза спроса по каждой товарной категории.",
                "MAPE менее 20% на последних 8 неделях истории.",
                "",
                "",
            ),
            (
                "Умный навигатор по курсам",
                "Education",
                "Campus Lab",
                "Студенты теряются в каталоге дополнительных учебных курсов.",
                "Помочь выбрать курс под интересы и текущие навыки.",
                "Открытый каталог: 200 курсов с темами и входными требованиями.",
                "Поисковая веб-страница с объяснением подходящих вариантов.",
                "",
                "Прототип за 3 недели; использовать только открытые данные.",
                "",
            ),
            (
                "Карта пунктов переработки",
                "Sustainability",
                "Green Step",
                "Жителям трудно найти ближайший пункт приёма вторсырья.",
                "Сделать информацию о переработке удобной и доступной.",
                "",
                "",
                "",
                "Демонстрация через 2 недели; открытые технологии.",
                "Жители города и волонтёры экологических инициатив.",
            ),
            (
                "Помощник для записи в мастерскую",
                "Web",
                "Craft House",
                "Хотим упростить запись клиентов в нашу мастерскую.",
                "",
                "",
                "",
                "",
                "",
                "",
            ),
        ]


        for i, row in enumerate(
            records,
            1
        ):
            (
                title,
                topic,
                company,
                *values
            ) = row

            task = new_task(
                i,
                title,
                values[0],
                topic,
            )

            task["company"] = company

            task["fields"].update(
                dict(
                    zip(
                        [
                            "context",
                            "need",
                            "data",
                            "result",
                            "success",
                            "constraints",
                            "users",
                        ],
                        values,
                    )
                )
            )


            if i == 1:
                task["fields"].update(
                    contact="mentor@example.com",
                    interaction=(
                        "Видеовстреча каждую среду "
                        "на 30 минут."
                    ),
                    feedback=(
                        "Руководитель поддержки "
                        "проверяет этап и отвечает "
                        "за 2 рабочих дня."
                    ),
                )


            task["confirmed"] = True
            task["published"] = True

            rating = score(
                task["fields"]
            )


            # Запоминаем только уже достигнутые
            # уровни, чтобы повторно не начислять Coins.
            task["earned"] = [
                f"level_{threshold}"
                for threshold in [
                    40,
                    70,
                    90
                ]
                if rating["score"] >= threshold
            ]


            task["achievements"] = [
                "First Challenge"
            ]

            if i == 1:
                task["achievements"] += [
                    "Data Ready",
                    "Crystal Clear",
                    "Perfect Brief",
                ]


            task["history"] = [
                {
                    "at": now(),
                    "score": rating["score"],
                    "level": rating["level"],
                    "title": (
                        "Демо-карточка подтверждена"
                    ),
                }
            ]


            db.execute(
                """
                INSERT INTO challenges
                VALUES(?, ?)
                """,
                (
                    i,
                    dump(task),
                ),
            )


        # -----------------------------------------
        # TEAMS + APPLICATIONS
        # -----------------------------------------

        teams = [
            (
                "CyberCats",
                [
                    "Python",
                    "FastAPI",
                    "NLP"
                ],
                [
                    "AI / NLP"
                ],
            ),
            (
                "Steppe Coders",
                [
                    "React",
                    "TypeScript",
                    "UX"
                ],
                [
                    "Web",
                    "Education"
                ],
            ),
            (
                "Data Nomads",
                [
                    "Python",
                    "Pandas",
                    "ML"
                ],
                [
                    "Data Science"
                ],
            ),
            (
                "Orbit Team",
                [
                    "React",
                    "Python",
                    "Analytics"
                ],
                [
                    "Education"
                ],
            ),
            (
                "Green Bytes",
                [
                    "Maps",
                    "React",
                    "SQL"
                ],
                [
                    "Sustainability"
                ],
            ),
        ]


        for i, (
            name,
            skills,
            interests
        ) in enumerate(
            teams,
            1
        ):

            team = {
                "id": i,
                "name": name,
                "skills": skills,
                "technologies": skills,
                "interests": interests,
                "xp": 0,
            }

            db.execute(
                """
                INSERT INTO teams
                VALUES(?, ?)
                """,
                (
                    i,
                    dump(team),
                ),
            )


            challenge_id = (
                1
                if i < 3
                else i - 1
            )


            application = {
                "id": i,
                "challenge_id": challenge_id,
                "team_id": i,

                "idea": (
                    f"{name}: подготовим "
                    "исследование и рабочий "
                    "прототип для проверки гипотезы."
                ),

                "plan": (
                    "Уточнить задачу → "
                    "изучить данные → "
                    "собрать прототип → "
                    "проверить с бизнесом."
                ),

                "duration": "3 недели",

                "prototype": (
                    "https://example.com/"
                    "demo-prototype"
                ),

                "status": "pending",
                "milestones": [],

                "created_at": now(),
            }


            db.execute(
                """
                INSERT INTO applications
                VALUES(?, ?, ?, ?)
                """,
                (
                    i,
                    challenge_id,
                    i,
                    dump(application),
                ),
            )