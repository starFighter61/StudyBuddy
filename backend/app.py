import os
import uuid
import logging
import json
from datetime import datetime
import openai
from dotenv import load_dotenv
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# File paths for persistent storage
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
DECKS_FILE = os.path.join(DATA_DIR, 'decks.json')
FLASHCARDS_FILE = os.path.join(DATA_DIR, 'flashcards.json')

# Create data directory if it doesn't exist
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# Load data from files or initialize empty
def load_data():
    global decks, flashcards
    try:
        if os.path.exists(DECKS_FILE):
            with open(DECKS_FILE, 'r') as f:
                decks = json.load(f)
        else:
            decks = {}
            
        if os.path.exists(FLASHCARDS_FILE):
            with open(FLASHCARDS_FILE, 'r') as f:
                flashcards = json.load(f)
        else:
            flashcards = {}
            
    except Exception as e:
        logger.error(f"Error loading data: {str(e)}")
        decks = {}
        flashcards = {}

# Save data to files
def save_data():
    try:
        with open(DECKS_FILE, 'w') as f:
            json.dump(decks, f, indent=2)
        with open(FLASHCARDS_FILE, 'w') as f:
            json.dump(flashcards, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving data: {str(e)}")

# Initialize data
load_data()

app = Flask(__name__)

# Configure CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Accept"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": True,
        "max_age": 3600
    }
})

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Accept')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Configure OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize Google Custom Search API

def search_web(query: str, num_results: int = 3) -> dict:
    """Search the web using Google Custom Search API and return formatted results and sources"""
    try:
        service = build("customsearch", "v1", developerKey=os.getenv("GOOGLE_API_KEY"))
        result = service.cse().list(
            q=query,
            cx=os.getenv("GOOGLE_CSE_ID"),
            num=num_results
        ).execute()

        if "items" not in result:
            return {"snippets": "No search results found.", "sources": []}

        # Format the search results with sources
        formatted_results = []
        sources = []
        
        for i, item in enumerate(result["items"], 1):
            snippet = item.get("snippet", "").replace("\n", " ")
            title = item.get("title", "Source")
            link = item.get("link", "")
            formatted_results.append(f"[{i}] {snippet}")
            sources.append({"number": i, "title": title, "url": link})

        return {
            "snippets": "\n".join(formatted_results),
            "sources": sources
        }
    except HttpError as e:
        logger.error(f"Google Search API error: {str(e)}")
        return {"snippets": "Error performing web search.", "sources": []}
    except Exception as e:
        logger.error(f"Unexpected error in web search: {str(e)}")
        return {"snippets": "Error performing web search.", "sources": []}

def parse_multiple_choice(answer: str) -> dict:
    """Parse multiple choice answer into structured format"""
    try:
        # Split into lines
        lines = answer.strip().split('\n')
        
        # Extract options (first 4 lines)
        options = []
        for line in lines[:4]:
            # Remove the letter and period from the start (e.g., "A. ")
            option = line[3:].strip()
            options.append(option)
        
        # Find the correct answer line
        correct_line = next(line for line in lines if line.startswith('Correct:'))
        correct_letter = correct_line.split(':')[1].strip()
        
        # Get explanation (everything after "Explanation:")
        explanation_start = next(i for i, line in enumerate(lines) if line.startswith('Explanation:'))
        explanation = ' '.join(line for line in lines[explanation_start:] 
                             if not line.startswith('Sources:'))
        explanation = explanation.replace('Explanation:', '').strip()
        
        # Format the response
        response = {
            "options": options,
            "correct_answer": options[ord(correct_letter) - ord('A')],
            "explanation": explanation
        }
        
        logger.debug(f"Parsed multiple choice answer: {response}")
        return response
        
    except Exception as e:
        logger.error(f"Error parsing multiple choice answer: {str(e)}")
        logger.error(f"Answer text was: {answer}")
        return None

def generate_answer(question: str, card_type: str = "basic") -> dict:
    """Generate an answer using OpenAI API with web search enhancement"""
    try:
        logger.info(f"Starting generate_answer for question: {question}, type: {card_type}")
        
        # Perform web search for current information
        search_results = search_web(question)
        web_results = search_results["snippets"]
        sources = search_results["sources"]
        
        logger.info(f"Web search results: {web_results}")
        
        current_date = datetime.now().strftime("%B %Y")
        
        current_context = f"""You are answering this question in {current_date}. 
        Here is current information from web search:
        {web_results}
        
        Use both the web search results and your knowledge to provide the most accurate and up-to-date answer.
        If the web search provides more current information than your knowledge, prioritize the web results.
        
        Important: When using information from the search results, cite your sources using numbers in brackets [1], [2], etc."""
        
        # Create a system prompt based on card type
        if card_type == "basic":
            system_prompt = f"""You are a knowledgeable tutor. {current_context}
            Provide a clear, concise, and accurate answer to the question, with citations.
            Format your response as a JSON object with this structure:
            {{"answer": "Your answer text here", "explanation": "Optional explanation"}}
            
            Example response:
            {{"answer": "The speed of light is approximately 299,792,458 meters per second [1]", "explanation": "This is a fundamental constant in physics that defines the upper limit for how fast anything can travel in the universe."}}"""
            
        elif card_type == "definition":
            system_prompt = f"""You are a dictionary. {current_context}
            Provide a clear, concise, and accurate definition, with citations if from web sources.
            Format your response as a JSON object with this structure:
            {{"answer": "Your definition here", "explanation": "Optional etymology or additional context"}}"""
            
        elif card_type == "multiple_choice":
            system_prompt = f"""You are a test creator. {current_context}
            Create a multiple choice question with exactly 4 options.
            Format your response as a JSON object with this structure:
            {{
                "options": ["option1", "option2", "option3", "option4"],
                "correct_answer": "The correct option text",
                "explanation": "Why this answer is correct"
            }}"""
        else:
            system_prompt = f"""You are a helpful tutor. {current_context}
            Provide a clear, concise, and accurate answer, with citations.
            Format your response as a JSON object with this structure:
            {{"answer": "Your answer text here", "explanation": "Optional explanation"}}"""
            
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question}
        ]
        
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        answer_text = response.choices[0].message.content.strip()
        logger.info(f"Raw answer: {answer_text}")
        
        try:
            # Try to parse the response as JSON
            answer_data = json.loads(answer_text)
            logger.info(f"Parsed answer data: {answer_data}")
            return {"answer": answer_data, "sources": sources}
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse answer as JSON: {str(e)}")
            # Fallback: wrap the raw text in a basic structure
            fallback_answer = {
                "answer": answer_text,
                "explanation": "No structured explanation available"
            }
            return {"answer": fallback_answer, "sources": sources}
        
    except Exception as e:
        logger.error(f"Error in generate_answer: {str(e)}")
        return {
            "answer": {
                "answer": f"Error generating answer: {str(e)}",
                "explanation": "An error occurred"
            }, 
            "sources": []
        }

# In-memory storage
decks = {}
flashcards = {}

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Welcome to SmartStudy Flashcards API!"})

@app.route("/decks", methods=["GET", "POST", "OPTIONS"])
@app.route("/decks/", methods=["GET", "POST", "OPTIONS"])
def get_or_create_deck():
    """Get all decks or create a new deck"""
    if request.method == "OPTIONS":
        # Handle preflight request
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response

    if request.method == "GET":
        return jsonify(list(decks.values()))
    
    try:
        data = request.get_json()
        logger.debug(f"Creating deck with data: {data}")
        
        # Validate required fields
        required_fields = ["name"]
        for field in required_fields:
            if field not in data:
                error_msg = f"Missing required field: {field}"
                logger.error(error_msg)
                return jsonify({"error": error_msg}), 400
        
        # Create deck
        deck_id = str(uuid.uuid4())
        new_deck = {
            "id": deck_id,
            "name": data["name"],
            "description": data.get("description", ""),
            "is_public": data.get("is_public", True),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Store deck
        decks[deck_id] = new_deck
        save_data()
        logger.info(f"Created deck: {new_deck}")
        
        return jsonify(new_deck), 201
        
    except Exception as e:
        error_msg = f"Error creating deck: {str(e)}"
        logger.error(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route("/decks/<deck_id>", methods=["GET", "DELETE", "OPTIONS"])
def handle_deck(deck_id):
    """Handle deck operations"""
    logger.info(f"Handling {request.method} request for deck {deck_id}")
    
    if request.method == "GET":
        if deck_id not in decks:
            return jsonify({"error": "Deck not found"}), 404
        return jsonify(decks[deck_id])
        
    elif request.method == "DELETE":
        try:
            logger.info(f"Processing DELETE request for deck {deck_id}")
            
            if deck_id not in decks:
                logger.warning(f"Deck {deck_id} not found")
                return jsonify({"error": "Deck not found"}), 404
                
            # Delete all cards in the deck
            cards_to_delete = [card_id for card_id, card in flashcards.items() if card["deck_id"] == deck_id]
            for card_id in cards_to_delete:
                logger.info(f"Deleting card {card_id}")
                del flashcards[card_id]
                
            # Delete the deck
            deck = decks.pop(deck_id)
            logger.info(f"Deleted deck: {deck}")
            
            # Save changes to files
            save_data()
            
            response = {
                "message": "Deck deleted successfully",
                "deck_id": deck_id,
                "cards_deleted": len(cards_to_delete)
            }
            logger.info(f"Delete response: {response}")
            return jsonify(response), 200
            
        except Exception as e:
            error_msg = f"Error deleting deck: {str(e)}"
            logger.error(error_msg)
            return jsonify({"error": error_msg}), 500
            
    # Handle OPTIONS request
    elif request.method == "OPTIONS":
        logger.info(f"Handling OPTIONS request for deck {deck_id}")
        response = make_response()
        response.headers.add("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type, Accept")
        return response

@app.route("/decks/<deck_id>/flashcards", methods=["GET"])
def get_deck_flashcards(deck_id):
    """Get all flashcards in a deck"""
    try:
        if deck_id not in decks:
            return jsonify({"error": "Deck not found"}), 404
            
        # Get all cards for this deck
        deck_cards = []
        for card in flashcards.values():
            if card["deck_id"] == deck_id:
                try:
                    # Parse the answer if it's a string and looks like JSON
                    if isinstance(card["answer"], str):
                        if card["answer"].strip().startswith("{"):
                            card["answer"] = json.loads(card["answer"])
                except json.JSONDecodeError:
                    # If the answer is not valid JSON, keep it as is
                    logger.debug(f"Non-JSON answer for card {card['id']}: {card['answer']}")
                deck_cards.append(card)
                
        logger.debug(f"Returning {len(deck_cards)} cards for deck {deck_id}")
        return jsonify(deck_cards)
        
    except Exception as e:
        logger.error(f"Error getting flashcards for deck {deck_id}: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/flashcards", methods=["POST", "OPTIONS"])
@app.route("/flashcards/", methods=["POST", "OPTIONS"])
def create_flashcard():
    """Create a new flashcard with AI-generated answer"""
    if request.method == "OPTIONS":
        # Handle preflight request
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response

    try:
        data = request.get_json()
        logger.debug(f"Creating flashcard: {data}")
        
        # Validate required fields
        required_fields = ["question", "deck_id", "type"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Validate deck exists
        if data["deck_id"] not in decks:
            return jsonify({"error": "Deck not found"}), 404
        
        # Generate answer
        answer = generate_answer(data["question"], data["type"])
        if not answer or not answer.get("answer"):
            return jsonify({"error": "Failed to generate answer"}), 500
            
        logger.debug(f"Generated answer: {answer}")
        
        # Create flashcard
        card_id = str(uuid.uuid4())
        
        # Handle the answer format
        answer_data = answer["answer"]
        if isinstance(answer_data, dict):
            # For multiple choice or structured answers
            answer_json = json.dumps(answer_data)
        else:
            # For basic text answers, wrap in a structured format
            answer_json = json.dumps({
                "answer": answer_data,
                "explanation": answer.get("explanation", "")
            })
        
        new_card = {
            "id": card_id,
            "question": data["question"],
            "answer": answer_json,
            "type": data["type"],
            "deck_id": data["deck_id"],
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "total_reviews": 0,
            "correct_reviews": 0,
            "accuracy": 0
        }
        
        # Store flashcard
        flashcards[card_id] = new_card
        save_data()
        logger.info(f"Created flashcard: {new_card}")
        
        # Return the card with parsed answer
        return_card = dict(new_card)
        if isinstance(answer_data, dict):
            return_card["answer"] = answer_data
        else:
            return_card["answer"] = json.loads(answer_json)
        
        return jsonify(return_card), 201
        
    except Exception as e:
        error_msg = f"Error creating flashcard: {str(e)}"
        logger.error(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route("/flashcards/<card_id>", methods=["DELETE", "PUT", "OPTIONS"])
def handle_flashcard(card_id):
    """Handle flashcard operations"""
    if request.method == "OPTIONS":
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Methods', 'DELETE, PUT')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
        
    if request.method == "DELETE":
        try:
            if card_id not in flashcards:
                return jsonify({"error": "Flashcard not found"}), 404
                
            # Delete the card
            deleted_card = flashcards.pop(card_id)
            save_data()
            
            return jsonify({
                "message": "Flashcard deleted successfully",
                "card_id": card_id
            }), 200
            
        except Exception as e:
            error_msg = f"Error deleting flashcard: {str(e)}"
            logger.error(error_msg)
            return jsonify({"error": error_msg}), 500

    try:
        if card_id not in flashcards:
            return jsonify({"error": "Flashcard not found"}), 404

        data = request.get_json()
        logger.debug(f"Updating flashcard {card_id} with data: {data}")
        
        # Validate required fields
        required_fields = ["question", "type", "deck_id"]
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Generate new answer if question or type changed
        current_card = flashcards[card_id]
        if data["question"] != current_card["question"] or data["type"] != current_card["type"]:
            answer = generate_answer(data["question"], data["type"])
        else:
            answer = {"answer": current_card["answer"], "sources": []}
        
        # Update flashcard
        updated_card = {
            "id": card_id,
            "question": data["question"],
            "answer": json.dumps(answer["answer"]) if isinstance(answer["answer"], dict) else json.dumps({
                "answer": answer["answer"],
                "explanation": answer.get("explanation", "")
            }),
            "type": data["type"],
            "deck_id": data["deck_id"],
            "created_at": current_card.get("created_at", datetime.now().isoformat()),
            "updated_at": datetime.now().isoformat(),
            "total_reviews": current_card.get("total_reviews", 0),
            "correct_reviews": current_card.get("correct_reviews", 0),
            "accuracy": current_card.get("accuracy", 0)
        }
        
        flashcards[card_id] = updated_card
        save_data()
        logger.info(f"Successfully updated flashcard with ID: {card_id}")
        
        # Return the card with parsed answer
        return_card = dict(updated_card)
        if isinstance(answer["answer"], dict):
            return_card["answer"] = answer["answer"]
        else:
            return_card["answer"] = json.loads(updated_card["answer"])
        
        return jsonify(return_card), 200
        
    except Exception as e:
        error_msg = f"Error updating flashcard: {str(e)}"
        logger.error(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route("/flashcards/<card_id>/reviewed", methods=["POST"])
def update_review_status(card_id):
    """Update the review status of a flashcard"""
    try:
        if card_id not in flashcards:
            return jsonify({"error": "Flashcard not found"}), 404
            
        data = request.get_json()
        if not isinstance(data, dict):
            return jsonify({"error": "Invalid request data"}), 400
            
        # Update review stats
        card = flashcards[card_id]
        card["total_reviews"] = card.get("total_reviews", 0) + 1
        if data.get("correct", False):
            card["correct_reviews"] = card.get("correct_reviews", 0) + 1
        
        # Calculate accuracy
        card["accuracy"] = (card["correct_reviews"] / card["total_reviews"]) * 100
        
        # Update last reviewed timestamp
        card["last_reviewed"] = datetime.now().isoformat()
        
        # Save changes
        flashcards[card_id] = card
        save_data()
        
        return jsonify(card), 200
        
    except Exception as e:
        error_msg = f"Error updating review status: {str(e)}"
        logger.error(error_msg)
        return jsonify({"error": error_msg}), 500

@app.route("/flashcards/<card_id>/score", methods=["POST"])
def update_difficulty(card_id):
    """Update the difficulty score of a flashcard"""
    try:
        if card_id not in flashcards:
            return jsonify({"error": "Flashcard not found"}), 404
            
        data = request.get_json()
        if not isinstance(data, dict) or "score" not in data:
            return jsonify({"error": "Invalid request data"}), 400
            
        # Update difficulty score
        card = flashcards[card_id]
        card["difficulty_score"] = data["score"]
        
        # Save changes
        flashcards[card_id] = card
        save_data()
        
        return jsonify(card), 200
        
    except Exception as e:
        error_msg = f"Error updating difficulty score: {str(e)}"
        logger.error(error_msg)
        return jsonify({"error": error_msg}), 500

if __name__ == "__main__":
    app.run(debug=True, port=8000)
