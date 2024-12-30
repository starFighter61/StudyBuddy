from fastapi import APIRouter, HTTPException
from typing import List
import uuid
from ..models.deck import Deck, Flashcard
from ..db.memory_store import decks, flashcards

router = APIRouter()

@router.get("/decks", response_model=List[Deck])
@router.get("/decks/", response_model=List[Deck])
async def list_decks():
    """Get all decks"""
    return list(decks.values())

@router.post("/decks", response_model=Deck)
@router.post("/decks/", response_model=Deck)
async def create_deck(deck: Deck):
    """Create a new deck"""
    try:
        deck_id = str(uuid.uuid4())
        new_deck = Deck(
            id=deck_id,
            name=deck.name,
            description=deck.description,
            is_public=deck.is_public
        )
        decks[deck_id] = new_deck
        return new_deck
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/decks/{deck_id}", response_model=Deck)
async def get_deck(deck_id: str):
    """Get a specific deck"""
    if deck_id not in decks:
        raise HTTPException(status_code=404, detail="Deck not found")
    return decks[deck_id]

@router.get("/decks/{deck_id}/flashcards", response_model=List[Flashcard])
async def get_deck_flashcards(deck_id: str):
    """Get all flashcards in a deck"""
    if deck_id not in decks:
        raise HTTPException(status_code=404, detail="Deck not found")
    return [card for card in flashcards.values() if card.deck_id == deck_id]
