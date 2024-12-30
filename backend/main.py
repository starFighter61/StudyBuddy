from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional
import uuid
import logging
from services.ai_service import generate_answer
from models.flashcard import Flashcard, FlashcardBase
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Models
class Deck(BaseModel):
    id: str
    name: str
    description: str
    is_public: bool = True

# Storage
decks: Dict[str, Deck] = {}
flashcards: Dict[str, Dict] = {}

# Add test data
test_deck = Deck(
    id="test-123",
    name="Test Deck",
    description="A test deck",
    is_public=True
)
decks["test-123"] = test_deck
logger.info(f"Initialized test deck: {test_deck}")
logger.debug(f"Available decks: {decks}")

# Create app
app = FastAPI(
    title="SmartStudy Flashcards API",
    description="API for creating and managing AI-powered flashcards",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to SmartStudy Flashcards API"}

@app.get("/decks", response_model=List[Deck])
@app.get("/decks/", response_model=List[Deck])
async def get_decks():
    """Get all decks"""
    logger.debug("Getting all decks")
    return list(decks.values())

@app.post("/decks", response_model=Deck)
@app.post("/decks/", response_model=Deck)
async def create_deck(deck: Deck):
    """Create a new deck"""
    logger.debug(f"Creating deck: {deck}")
    try:
        deck_id = str(uuid.uuid4())
        new_deck = Deck(
            id=deck_id,
            name=deck.name,
            description=deck.description,
            is_public=deck.is_public
        )
        decks[deck_id] = new_deck
        logger.info(f"Created deck with ID: {deck_id}")
        return new_deck
    except Exception as e:
        logger.error(f"Error creating deck: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/decks/{deck_id}", response_model=Deck)
@app.get("/decks/{deck_id}/", response_model=Deck)
async def get_deck(deck_id: str):
    """Get a specific deck"""
    logger.debug(f"Getting deck: {deck_id}")
    if deck_id not in decks:
        logger.error(f"Deck not found: {deck_id}")
        raise HTTPException(status_code=404, detail="Deck not found")
    return decks[deck_id]

@app.get("/decks/{deck_id}/flashcards", response_model=List[Dict])
@app.get("/decks/{deck_id}/flashcards/", response_model=List[Dict])
async def get_deck_flashcards(deck_id: str):
    """Get all flashcards in a deck"""
    logger.debug(f"Getting flashcards for deck: {deck_id}")
    if deck_id not in decks:
        logger.error(f"Deck not found: {deck_id}")
        raise HTTPException(status_code=404, detail="Deck not found")
    return [card for card in flashcards.values() if card.get("deck_id") == deck_id]

@app.post("/flashcards")
@app.post("/flashcards/")
async def create_flashcard(flashcard: FlashcardBase):
    """Create a new flashcard with AI-generated answer"""
    try:
        logger.debug(f"Creating flashcard: {flashcard.dict()}")
        
        # Validate deck exists
        logger.debug(f"Checking if deck {flashcard.deck_id} exists")
        if flashcard.deck_id not in decks:
            error_msg = f"Deck {flashcard.deck_id} not found"
            logger.error(error_msg)
            return JSONResponse(status_code=404, content={"detail": error_msg})
        
        # Generate answer
        logger.debug("Generating answer")
        try:
            answer = generate_answer(flashcard.question, flashcard.type)
            logger.debug(f"Generated answer: {answer}")
        except Exception as e:
            error_msg = f"Error generating answer: {str(e)}"
            logger.error(error_msg)
            return JSONResponse(status_code=500, content={"detail": error_msg})
        
        # Create flashcard
        logger.debug("Creating new flashcard")
        try:
            card_id = str(uuid.uuid4())
            new_card = {
                "id": card_id,
                "question": flashcard.question,
                "answer": answer,
                "type": flashcard.type,
                "deck_id": flashcard.deck_id
            }
            logger.debug(f"Created flashcard object: {new_card}")
            
            # Store flashcard
            logger.debug(f"Storing flashcard with ID: {card_id}")
            flashcards[card_id] = new_card
            logger.info(f"Successfully created flashcard with ID: {card_id}")
            
            # Return the created flashcard
            return JSONResponse(status_code=201, content=new_card)
            
        except Exception as e:
            error_msg = f"Error creating flashcard: {str(e)}"
            logger.error(error_msg)
            logger.error(f"Exception type: {type(e)}")
            logger.error(f"Exception details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
            return JSONResponse(status_code=500, content={"detail": error_msg})
        
    except Exception as e:
        error_msg = f"Error creating flashcard: {str(e)}"
        logger.error(error_msg)
        logger.error(f"Exception type: {type(e)}")
        logger.error(f"Exception details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
        return JSONResponse(status_code=500, content={"detail": error_msg})

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    error_msg = f"Error: {str(exc)}"
    logger.error(error_msg)
    return JSONResponse(
        status_code=500,
        content={"detail": error_msg}
    )
