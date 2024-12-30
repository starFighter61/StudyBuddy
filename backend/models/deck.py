from pydantic import BaseModel
from typing import Optional

class Deck(BaseModel):
    id: Optional[str] = None
    name: str
    description: str
    is_public: bool = True

class Flashcard(BaseModel):
    id: Optional[str] = None
    question: str
    answer: Optional[str] = None
    type: str = "basic"
    deck_id: str
