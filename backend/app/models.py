from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Brief(Input):
    context: str = Field(default="", max_length=3000)
    need: str = Field(default="", max_length=3000)
    data: str = Field(default="", max_length=3000)
    result: str = Field(default="", max_length=3000)
    success: str = Field(default="", max_length=3000)
    constraints: str = Field(default="", max_length=3000)
    users: str = Field(default="", max_length=3000)
    contact: str = Field(default="", max_length=3000)
    interaction: str = Field(default="", max_length=3000)
    feedback: str = Field(default="", max_length=3000)


class Draft(Input):
    title: str = Field(min_length=3, max_length=120)
    raw: str = Field(min_length=10, max_length=5000)
    topic: Literal["AI / NLP", "Data Science", "Web", "Education", "Sustainability"] = "AI / NLP"


class Edit(Input):
    title: str = Field(min_length=3, max_length=120)
    topic: Literal["AI / NLP", "Data Science", "Web", "Education", "Sustainability"]
    fields: Brief
    confirmed: Literal[True]
    version: int = Field(ge=1)


class Proposal(Input):
    team_id: int = Field(ge=1)
    idea: str = Field(min_length=15, max_length=3000)
    plan: str = Field(min_length=15, max_length=3000)
    duration: str = Field(min_length=3, max_length=100)
    prototype: HttpUrl | None = None


class Decision(Input):
    status: Literal["selected", "rejected"]


class Progress(Input):
    stage: Literal["discovery", "prototype", "delivery"]
    evidence: str = Field(min_length=15, max_length=2000)
    confirmed: Literal[True]


class Purchase(Input):
    item: Literal["highlight", "spotlight", "aurora"]


class Question(Input):
    field: Literal["context", "need", "data", "result", "success", "constraints", "users", "contact", "interaction", "feedback"]
    question: str = Field(min_length=10, max_length=500)


class Analysis(Input):
    questions: list[Question] = Field(min_length=3, max_length=10)

    @field_validator("questions")
    @classmethod
    def unique_fields(cls, value):
        if len({q.field for q in value}) != len(value):
            raise ValueError("Questions must cover different fields")
        return value
