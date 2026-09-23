import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DEFAULT_DB = Path(__file__).resolve().parents[1] / "data" / "taskquest.db"


@contextmanager
def connect():
    path = Path(os.getenv("DATABASE_PATH", str(DEFAULT_DB)))
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=20)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    try:
        # Serializes reward, purchase and milestone mutations, including read-modify-write.
        db.execute("BEGIN IMMEDIATE")
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    with connect() as db:
        db.execute("CREATE TABLE IF NOT EXISTS challenges (id INTEGER PRIMARY KEY, document TEXT NOT NULL)")
        db.execute("CREATE TABLE IF NOT EXISTS teams (id INTEGER PRIMARY KEY, document TEXT NOT NULL)")
        db.execute("""CREATE TABLE IF NOT EXISTS applications (
            id INTEGER PRIMARY KEY, challenge_id INTEGER NOT NULL REFERENCES challenges(id),
            team_id INTEGER NOT NULL REFERENCES teams(id), document TEXT NOT NULL)""")
        db.execute("CREATE TABLE IF NOT EXISTS wallet (id INTEGER PRIMARY KEY CHECK(id=1), document TEXT NOT NULL)")


def dump(value):
    return json.dumps(value, ensure_ascii=False)


def read(db, table, id):
    row = db.execute(f"SELECT document FROM {table} WHERE id=?", (id,)).fetchone()
    return json.loads(row[0]) if row else None


def save(db, table, value):
    db.execute(f"UPDATE {table} SET document=? WHERE id=?", (dump(value), value["id"]))


def all_rows(db, table):
    return [json.loads(row[0]) for row in db.execute(f"SELECT document FROM {table}")]
