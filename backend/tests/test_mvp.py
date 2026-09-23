import json
import pytest
import httpx
from fastapi.testclient import TestClient
from app.main import app
from app.scoring import score, LEVELS
from app import ai

BUSINESS = {"X-Demo-Role": "Business"}
STUDENT = {"X-Demo-Role": "Student"}
FULL = {
 "context": "Менеджеры вручную читают 5000 отзывов каждый месяц.",
 "need": "Сократить ручной разбор и находить причины жалоб.",
 "data": "CSV: 5000 обезличенных отзывов, тестовая выборка отдельно.",
 "result": "Веб-панель с темами отзывов и выгрузкой отчета.",
 "success": "F1 не ниже 0.85 на 300 отложенных размеченных примерах.",
 "constraints": "Срок 4 недели, Python, без персональных данных.",
 "users": "Менеджеры клиентской поддержки.",
 "contact": "mentor@example.com",
 "interaction": "Видеовстреча каждую среду на 30 минут.",
 "feedback": "Руководитель отвечает за 2 рабочих дня.",
}

@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "test.db"))
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with TestClient(app) as c:
        yield c

def new(client):
    response = client.post("/api/challenges", headers=BUSINESS, json={
        "title": "AI-анализ отзывов", "raw": "Хотим AI для отзывов клиентов", "topic": "AI / NLP"})
    assert response.status_code == 201
    return response.json()

def edit(client, task, fields):
    return client.put(f"/api/challenges/{task['id']}", headers=BUSINESS, json={
        "title": task["title"], "topic": task["topic"], "fields": fields, "confirmed": True, "version": task["version"]})

def proposal(client, id, team=1, prototype="https://example.com/prototype"):
    return client.post(f"/api/challenges/{id}/applications", headers=STUDENT, json={
        "team_id": team, "idea": "Соберём сервис анализа отзывов клиентов.",
        "plan": "Данные, модель, тестирование, веб-панель.", "duration": "3 недели", "prototype": prototype})

def state(client):
    return client.get("/api/state", headers=BUSINESS).json()

def test_seed_counts_and_order(client):
    s = state(client)
    assert len(s["challenges"]) == len(s["teams"]) == len(s["applications"]) == 5
    assert [t["score"] for t in s["challenges"]] == [100, 70, 65, 40, 10]
    assert all(not a["milestones"] for a in s["applications"])

def test_rubric_weights_and_confirmation():
    r = score(FULL)
    assert r["score"] == 100
    assert [r["weight"] for r in r["breakdown"]] == [20,20,15,15,10,10,10]
    assert score(FULL, False)["score"] == 0
    assert score({**FULL, "success": "Сделать очень хороший результат"})["score"] == 85
    assert score({**FULL, "feedback": "", "interaction": ""})["score"] == 94
    assert score({**FULL, "data": "   "})["score"] == 80

@pytest.mark.parametrize("fields,expected", [({},0), ({"context":FULL["context"]},0),
    ({"context":FULL["context"],"need":FULL["need"],"data":FULL["data"]},1),
    ({"context":FULL["context"],"need":FULL["need"],"data":FULL["data"],"result":FULL["result"],"success":FULL["success"]},2),
    (FULL,3)])
def test_levels(fields,expected):
    assert score(fields)["level"] == LEVELS[expected]

def test_low_score_publish_and_unlimited_proposals(client):
    t = new(client)
    assert t["score"] == 0
    assert client.post(f"/api/challenges/{t['id']}/publish", headers=BUSINESS).status_code == 400
    assert client.get(f"/api/challenges/{t['id']}", headers=STUDENT).status_code == 404
    t = edit(client,t,{}).json()["task"]
    assert t["score"] == 0
    assert client.post(f"/api/challenges/{t['id']}/publish",headers=BUSINESS).status_code == 200
    assert any(x["id"] == t["id"] for x in client.get("/api/state").json()["challenges"])
    assert proposal(client,t["id"]).status_code == 201
    assert proposal(client,t["id"]).status_code == 201

def test_full_journey_and_no_reward_farming(client):
    t = new(client)
    analysis = client.post(f"/api/challenges/{t['id']}/analyze",headers=BUSINESS).json()
    assert analysis["mode"] == "mock"
    assert len(analysis["questions"]) >= 3
    t = analysis["task"]
    before = state(client)["wallet"]
    saved = edit(client,t,FULL).json()
    t = saved["task"]
    assert saved["level_up"] and t["score"] == 100 and t["boxes"] == 3
    assert state(client)["wallet"]["coins"] > before["coins"]
    wallet = state(client)["wallet"].copy()
    again = edit(client,t,FULL).json()
    assert again["rewards"] == []
    assert state(client)["wallet"] == wallet
    low = edit(client,again["task"],{}).json()["task"]
    assert low["score"] == 0
    t = edit(client,low,FULL).json()["task"]
    assert state(client)["wallet"] == wallet
    assert client.post(f"/api/challenges/{t['id']}/publish",headers=BUSINESS).status_code == 200
    a = proposal(client,t["id"]).json()
    b = proposal(client,t["id"],2).json()
    for application in [a,b]:
        assert client.post(f"/api/applications/{application['id']}/decision",headers=BUSINESS,json={"status":"selected"}).status_code == 200
    assert len([a for a in state(client)["applications"] if a["challenge_id"]==t["id"] and a["status"]=="selected"]) == 2
    path=f"/api/applications/{a['id']}/progress"
    body={"stage":"prototype","evidence":"Проверена работа прототипа на тестовом наборе.","confirmed":True}
    assert client.post(path,headers=BUSINESS,json=body).json()["xp"] == 100
    assert client.post(path,headers=BUSINESS,json=body).status_code == 409
    c=proposal(client,t["id"]).json()
    client.post(f"/api/applications/{c['id']}/decision",headers=BUSINESS,json={"status":"selected"})
    assert client.post(f"/api/applications/{c['id']}/progress",headers=BUSINESS,json=body).status_code == 409
    assert state(client)["teams"][0]["xp"] == 100

def test_shop_and_box_do_not_change_score(client):
    t=state(client)["challenges"][0]
    path=f"/api/challenges/{t['id']}"
    before=state(client)["wallet"]["coins"]
    r=client.post(path+"/purchase",headers=BUSINESS,json={"item":"highlight"})
    assert r.status_code==200 and r.json()["score"]==100
    assert state(client)["wallet"]["coins"]==before-50
    assert client.post(path+"/purchase",headers=BUSINESS,json={"item":"highlight"}).status_code==409
    r=client.post(path+"/box",headers=BUSINESS).json()
    assert r["task"]["score"]==100 and r["task"]["boxes"]==0
    assert client.post(path+"/box",headers=BUSINESS).status_code==400
    assert client.post(path+"/purchase",headers=BUSINESS,json={"item":"aurora"}).status_code in [400,409]
    assert client.post(path+"/purchase",headers=BUSINESS,json={"item":"score"}).status_code==422

def test_roles_validation_and_stale_edits(client):
    assert client.post("/api/challenges",headers=STUDENT,json={}).status_code==403
    assert client.post("/api/challenges",headers=BUSINESS,json={"title":" ", "raw":"x"}).status_code==422
    assert proposal(client,1,prototype="javascript:alert(1)").status_code==422
    assert proposal(client,1,team=999).status_code==404
    assert client.post("/api/applications/1/decision",headers=STUDENT,json={"status":"selected"}).status_code==403
    assert client.post("/api/applications/1/progress",headers=BUSINESS,json={"stage":"prototype","evidence":"Проверен прототип командой бизнеса.","confirmed":True}).status_code==400
    t=new(client)
    assert edit(client,t,FULL).status_code==200
    assert edit(client,t,FULL).status_code==409
    assert client.get("/api/challenges/999").status_code==404

@pytest.mark.parametrize("payload", [
    [], {"status":"completed","output":[None]},
    {"status":"completed","output":[{"content":[{"type":"output_text","text":"not-json"}]}]},
    {"status":"incomplete","output":[]},
    {"status":"completed","output":[{"content":[{"type":"output_text","text":json.dumps({"questions":[{"field":"data","question":"Какие данные доступны?"}]})}]}]},
    {"status":"completed","output":[{"content":[{"type":"refusal","refusal":"No"}]}]}
])
def test_invalid_openai_response_falls_back(client,monkeypatch,payload):
    task=new(client)
    monkeypatch.setenv("OPENAI_API_KEY","test-not-real")
    monkeypatch.setattr(httpx.Client,"post",lambda *a,**k:httpx.Response(200,json=payload,request=httpx.Request("POST","https://example.com")))
    result=ai.analyze(task)
    assert result["mode"]=="fallback" and len(result["questions"])>=3

def test_timeout_falls_back(client,monkeypatch):
    task=new(client)
    monkeypatch.setenv("OPENAI_API_KEY","test-not-real")
    def timeout(*a,**k):raise httpx.ReadTimeout("simulated")
    monkeypatch.setattr(httpx.Client,"post",timeout)
    result=ai.analyze(task)
    assert result["mode"]=="fallback"

def test_valid_openai_response(client,monkeypatch):
    task=new(client)
    payload={"questions":[{"field":k,"question":ai.QUESTIONS[k]} for k in ["data","success","constraints"]]}
    monkeypatch.setenv("OPENAI_API_KEY","test-not-real")
    monkeypatch.setattr(httpx.Client,"post",lambda *a,**k:httpx.Response(200,json={"status":"completed","output":[{"content":[{"type":"output_text","text":json.dumps(payload)}]}]},request=httpx.Request("POST","https://example.com")))
    assert ai.analyze(task)["mode"]=="openai"


