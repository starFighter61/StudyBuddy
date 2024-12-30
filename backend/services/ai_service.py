import json
import logging
from typing import List, Dict, Any, Optional
from openai import OpenAI
import os
from models.flashcard import FlashcardGeneration
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables from the correct path
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
logger.debug(f"Loading .env file from: {env_path}")
load_dotenv(env_path)

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Initialize OpenAI client with better error handling
client = None
api_key = os.getenv('OPENAI_API_KEY')

if api_key:
    try:
        client = OpenAI(api_key=api_key)
        logger.info("OpenAI client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI client: {str(e)}")
else:
    logger.error("OPENAI_API_KEY not found in environment variables")

def test_api_key():
    """Test if the OpenAI API key is valid"""
    try:
        if not api_key:
            return False, "OpenAI API key not found in environment variables"
            
        if not client:
            return False, "OpenAI client not initialized"
            
        # Make a simple test request
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=5
        )
        return True, "API key is valid"
    except Exception as e:
        return False, f"API key error: {str(e)}"

# Test the API key on startup
valid, message = test_api_key()
if not valid:
    logger.error(message)
else:
    logger.info(message)

def generate_mock_answer(question: str, card_type: str = "basic") -> str:
    """Generate a mock answer for testing purposes."""
    logger.info(f"Generating mock answer for question: {question}")
    
    if card_type == "basic":
        return "This is a mock answer for testing purposes."
    elif card_type == "definition":
        return "This is a mock definition for testing purposes."
    else:
        return "This is a mock answer for an unknown card type."

def generate_answer(question: str, card_type: str = "basic") -> str:
    """
    Generate an answer for a flashcard question using OpenAI.
    Falls back to mock data if OpenAI is unavailable.
    """
    try:
        logger.info(f"Starting generate_answer for question: {question}, type: {card_type}")
        
        # For now, let's use mock data to isolate the issue
        logger.info("Using mock data for testing")
        return "Python is a high-level programming language known for its simple syntax and readability."
        
    except Exception as e:
        logger.error(f"Error in generate_answer: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        logger.error(f"Exception details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
        return "Error generating answer"

def generate_questions_from_text(text: str, num_questions: int = 5) -> List[FlashcardGeneration]:
    """Generate flashcard questions from a given text."""
    try:
        return [
            FlashcardGeneration(
                question=f"Mock question {i} about the text",
                answer=f"Mock answer {i} about the text"
            )
            for i in range(num_questions)
        ]
    except Exception as e:
        logger.error(f"Error generating questions: {e}")
        return []

def enhance_question(question: str, answer: str, card_type: str = "basic") -> str:
    """Enhance a question with additional context or hints"""
    try:
        return f"Enhanced: {question}"
    except Exception as e:
        logger.error(f"Error enhancing question: {e}")
        return question
