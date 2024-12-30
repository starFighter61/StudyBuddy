from typing import Dict
from ..models.deck import Deck, Flashcard

# In-memory storage
decks: Dict[str, Deck] = {}
flashcards: Dict[str, Flashcard] = {}

# Add a test deck on startup
test_deck_id = "test-deck-123"
test_deck = Deck(
    id=test_deck_id,
    name="Test Deck",
    description="A test deck for our flashcards",
    is_public=True
)
decks[test_deck_id] = test_deck

# Add a test flashcard
test_card_id = "test-card-123"
test_card = Flashcard(
    id=test_card_id,
    question="What is the capital of France?",
    answer="Paris is the capital of France.",
    type="basic",
    deck_id=test_deck_id
)
flashcards[test_card_id] = test_card
