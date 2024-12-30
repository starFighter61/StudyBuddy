import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Paper,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Refresh as ShuffleIcon,
} from '@mui/icons-material';
import BasicCard from '../components/BasicCard';
import MultipleChoiceCard from '../components/MultipleChoiceCard';

function FlashcardViewer() {
  const { deckId } = useParams();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCards();
  }, [deckId]);

  const fetchCards = async () => {
    try {
      const response = await fetch(`http://localhost:8000/decks/${deckId}/flashcards`);
      if (!response.ok) {
        throw new Error('Failed to fetch flashcards');
      }
      const data = await response.json();
      console.log('Fetched cards:', data); // Debug log
      setCards(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleShuffle = () => {
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffledCards);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Container>
    );
  }

  if (cards.length === 0) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4 }}>
          <Typography>No flashcards found in this deck.</Typography>
        </Box>
      </Container>
    );
  }

  const currentCard = cards[currentCardIndex];
  const isMultipleChoice = currentCard.type === 'multiple_choice';

  // Extract answer and sources
  let answer, sources;
  if (typeof currentCard.answer === 'string') {
    try {
      console.log('Parsing string answer:', currentCard.answer); // Debug log
      const parsed = JSON.parse(currentCard.answer);
      console.log('Parsed answer:', parsed); // Debug log
      if (parsed.answer && parsed.sources) {
        answer = parsed.answer;
        sources = parsed.sources;
      } else {
        answer = parsed;
        sources = [];
      }
    } catch (err) {
      console.log('Error parsing answer:', err); // Debug log
      answer = currentCard.answer;
      sources = [];
    }
  } else {
    console.log('Non-string answer:', currentCard.answer); // Debug log
    answer = currentCard.answer?.answer || currentCard.answer;
    sources = currentCard.answer?.sources || [];
  }
  
  console.log('Final answer:', answer); // Debug log
  console.log('Final sources:', sources); // Debug log

  const cardToDisplay = {
    ...currentCard,
    answer
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Study Session
        </Typography>
        
        <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
          <Typography>
            Card {currentCardIndex + 1} of {cards.length}
          </Typography>
        </Paper>

        {isMultipleChoice ? (
          <MultipleChoiceCard 
            card={cardToDisplay}
            onNext={handleNext}
            sources={sources}
          />
        ) : (
          <>
            <BasicCard 
              card={cardToDisplay}
              isFlipped={isFlipped}
              onClick={handleFlip}
              sources={sources}
            />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 2 }}>
              <IconButton onClick={handlePrev} color="primary">
                <PrevIcon />
              </IconButton>
              <IconButton onClick={handleShuffle} color="primary">
                <ShuffleIcon />
              </IconButton>
              <IconButton onClick={handleNext} color="primary">
                <NextIcon />
              </IconButton>
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
}

export default FlashcardViewer;
