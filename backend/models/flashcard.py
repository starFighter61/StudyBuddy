from pydantic import BaseModel
from typing import Optional, List

class FlashcardGeneration(BaseModel):
    question: str
    answer: str

class FlashcardBase(BaseModel):
    question: str
    answer: Optional[str] = None
    type: str = "basic"
    deck_id: str

class Flashcard(FlashcardBase):
    id: str
    question: str
    answer: str
    type: str
    deck_id: str

    def dict(self) -> dict:
        return {
            "id": self.id,
            "question": self.question,
            "answer": self.answer,
            "type": self.type,
            "deck_id": self.deck_id
        }

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "question": "What is Python?",
                "answer": "Python is a high-level programming language.",
                "type": "basic",
                "deck_id": "test-123"
            }
        }
