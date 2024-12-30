import os
import logging
from openai import OpenAI
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_openai_connection():
    # Load environment variables
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    logger.info(f"Loading .env file from: {env_path}")
    load_dotenv(env_path)

    # Get API key
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        logger.error("OPENAI_API_KEY not found in environment variables")
        return False

    try:
        # Initialize client
        logger.info("Attempting to initialize OpenAI client...")
        client = OpenAI(api_key=api_key)
        
        # Test with a simple request
        logger.info("Making test request to OpenAI API...")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say hello"}],
            max_tokens=10
        )
        
        # Check response
        if response and response.choices:
            answer = response.choices[0].message.content.strip()
            logger.info(f"Received response from API: {answer}")
            return True
        else:
            logger.error("No response received from API")
            return False
            
    except Exception as e:
        logger.error(f"Error testing OpenAI connection: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_openai_connection()
    if success:
        print("\nSuccess! OpenAI client initialized and tested successfully!")
    else:
        print("\nError: Failed to initialize or test OpenAI client")
