import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Button,
  Typography,
  Paper,
  Rating,
  CircularProgress,
  Alert,
  TextField
} from '@mui/material';

const API_URL = 'http://127.0.0.1:8000';

const renderQuestionContent = (currentCard) => {
  if (currentCard.type === 'fill_in_blank') {
    const parts = currentCard.question.split('_____');
    return (
      <Box>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <Typography component="span" variant="h5">
              {part}
            </Typography>
            {index < parts.length - 1 && (
              <Typography component="span" variant="h5" color="primary" sx={{ mx: 1, fontWeight: 'bold' }}>
                _____
              </Typography>
            )}
          </React.Fragment>
        ))}
      </Box>
    );
  }
  return (
    <Typography variant="h5">
      {currentCard.question}
    </Typography>
  );
};

const getTrueOrFalseOptions = () => ['True', 'False'];

const isAnswerCorrect = (currentCard, selectedAnswer) => {
  console.log('Checking answer:', { currentCard, selectedAnswer });
  
  if (!currentCard || selectedAnswer === null || selectedAnswer === undefined) {
    console.log('Missing card or answer');
    return false;
  }

  switch (currentCard.type) {
    case 'multiple_choice':
      return selectedAnswer === currentCard.parsedAnswer?.correct_answer;
    case 'true_false':
      return selectedAnswer === currentCard.parsedAnswer?.correct_answer;
    case 'fill_in_blank':
      const userAnswer = String(selectedAnswer).toLowerCase().trim();
      const correctAnswer = String(currentCard.parsedAnswer?.correct_answer).toLowerCase().trim();
      console.log('Fill in blank comparison:', { userAnswer, correctAnswer });
      return userAnswer === correctAnswer;
    default:
      return true;
  }
};

function ReviewDeck() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [canRetry, setCanRetry] = useState(false);

  useEffect(() => {
    fetchCards();
  }, [deckId]);

  useEffect(() => {
    console.log('Card index changed:', currentCardIndex);
    // Reset states for new card
    setSelectedAnswer(null);
    setIsAnswerChecked(false);
    setFeedback(null);
    setShowAnswer(false);
    setCanRetry(false);
  }, [currentCardIndex]);

  useEffect(() => {
    console.log('Cards array updated:', cards);
  }, [cards]);

  const fetchCards = async () => {
    setLoading(true);
    try {
      console.log('Fetching cards for deck:', deckId);
      const response = await fetch(`${API_URL}/decks/${deckId}/flashcards`);
      if (!response.ok) {
        throw new Error('Failed to fetch cards');
      }
      const data = await response.json();
      console.log('Fetched cards:', data);

      const validCards = data.filter(card => {
        if (!card || !card.question) return false;
        
        // Process answer data
        if (typeof card.answer === 'string') {
          try {
            card.parsedAnswer = JSON.parse(card.answer);
          } catch (e) {
            card.parsedAnswer = { answer: card.answer };
          }
        } else {
          card.parsedAnswer = card.answer;
        }
        
        console.log('Processed card:', {
          question: card.question,
          answer: card.answer,
          parsedAnswer: card.parsedAnswer
        });
        
        return true;
      });

      console.log('Valid cards:', validCards);
      setCards(validCards);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching cards:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const handleShowAnswer = () => {
    console.log('Current card:', currentCard);
    if (currentCard?.parsedAnswer) {
      console.log('Parsed answer:', currentCard.parsedAnswer);
    }
    setShowAnswer(true);
    if (currentCard?.type !== 'multiple_choice') {
      checkAnswer();
    }
  };

  const handleNextCard = () => {
    console.log('Current card index:', currentCardIndex, 'Total cards:', cards.length);
    
    if (currentCardIndex >= cards.length - 1) {
      const shouldReview = window.confirm('You have reached the end of the deck. Would you like to review these cards again?');
      if (shouldReview) {
        // Reset to the beginning of the deck
        setCurrentCardIndex(0);
        // Optionally shuffle the cards
        const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
        setCards(shuffledCards);
      }
    } else {
      setCurrentCardIndex(prev => prev + 1);
    }
  };

  const handleDifficulty = async (score) => {
    try {
      const response = await fetch(`${API_URL}/flashcards/${currentCard.id}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score }),
      });

      if (!response.ok) {
        throw new Error('Failed to update difficulty');
      }
      
      handleNextCard();
    } catch (error) {
      console.error('Error updating difficulty:', error);
      setError('Failed to update difficulty: ' + error.message);
    }
  };

  const checkAnswer = () => {
    console.log('Checking answer:', { 
      selectedAnswer, 
      currentCard,
      correctAnswer: currentCard?.parsedAnswer?.correct_answer 
    });

    if (!currentCard || selectedAnswer === null || selectedAnswer === '') {
      console.log('Missing card or answer');
      return;
    }

    const isCorrect = isAnswerCorrect(currentCard, selectedAnswer);
    console.log('Answer is correct:', isCorrect);

    setFeedback({
      correct: isCorrect,
      message: isCorrect ? 'Correct! Well done!' : 'Incorrect. Try again!'
    });
    
    setIsAnswerChecked(true);
  };

  const handleRetry = () => {
    setSelectedAnswer(null);
    setFeedback(null);
    setCanRetry(false);
  };

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
      </Container>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <Container>
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>No cards in this deck</Typography>
          <Button variant="contained" onClick={() => navigate(`/deck/${deckId}`)}>
            Back to Deck
          </Button>
        </Box>
      </Container>
    );
  }

  const currentCard = cards[currentCardIndex];

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Card {currentCardIndex + 1} of {cards.length}
          </Typography>
        </Box>

        {currentCard?.type === 'multiple_choice' ? (
          <Paper elevation={3}>
            <Box sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom>
                {currentCard?.question}
              </Typography>

              <Box sx={{ mt: 2, width: '100%' }}>
                {currentCard.parsedAnswer?.options?.map((option, index) => {
                  const letter = String.fromCharCode(65 + index);
                  const isSelected = selectedAnswer === option;
                  const isCorrect = currentCard.parsedAnswer?.correct_answer === option;
                  let buttonColor = 'primary';
                  
                  if (isAnswerChecked || (canRetry && isSelected)) {
                    if (isCorrect) {
                      buttonColor = 'success';
                    } else if (isSelected) {
                      buttonColor = 'error';
                    }
                  }
                  
                  return (
                    <Button
                      key={index}
                      fullWidth
                      variant={isSelected ? 'contained' : 'outlined'}
                      color={buttonColor}
                      onClick={() => !isAnswerChecked && setSelectedAnswer(option)}
                      disabled={isAnswerChecked}
                      sx={{ 
                        mt: 1,
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        position: 'relative',
                        pl: 4
                      }}
                    >
                      <Typography
                        sx={{
                          position: 'absolute',
                          left: 16,
                          fontWeight: 'bold'
                        }}
                      >
                        {letter}.
                      </Typography>
                      {option}
                      {isAnswerChecked && isCorrect && ' ✓'}
                    </Button>
                  );
                })}
              </Box>

              {!isAnswerChecked && selectedAnswer !== null && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={checkAnswer}
                  >
                    Check Answer
                  </Button>
                  {canRetry && (
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleRetry}
                    >
                      Try Again
                    </Button>
                  )}
                </Box>
              )}

              {isAnswerChecked && (
                <>
                  <Box sx={{ mt: 3 }}>
                    {feedback && (
                      <Typography 
                        variant="h6" 
                        color={feedback.correct ? 'success.main' : 'error.main'}
                        sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}
                      >
                        {feedback.message}
                      </Typography>
                    )}
                    {currentCard.parsedAnswer?.explanation && (
                      <>
                        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                          Explanation:
                        </Typography>
                        <Typography variant="body1">
                          {currentCard.parsedAnswer.explanation}
                        </Typography>
                      </>
                    )}
                  </Box>
                  <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Rate this card's difficulty:
                    </Typography>
                    <Rating
                      size="large"
                      max={3}
                      onChange={(event, newValue) => handleDifficulty(newValue)}
                    />
                  </Box>
                </>
              )}
            </Box>
          </Paper>
        ) : currentCard?.type === 'true_false' ? (
          <Paper elevation={3} sx={{ p: 4, minHeight: '400px', display: 'flex', flexDirection: 'column', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              {renderQuestionContent(currentCard)}
              <Box sx={{ mt: 4 }}>
                {getTrueOrFalseOptions().map((option) => (
                  <Button
                    key={option}
                    fullWidth
                    variant={selectedAnswer === option ? 'contained' : 'outlined'}
                    color={
                      isAnswerChecked ? 
                        (option === currentCard.parsedAnswer?.correct_answer ? 'success' : 
                         option === selectedAnswer ? 'error' : 'primary') 
                        : 'primary'
                    }
                    onClick={() => {
                      if (!isAnswerChecked) {
                        setSelectedAnswer(option);
                        // Auto-check answer after selection
                        setTimeout(() => {
                          console.log('Auto-checking answer for:', option);
                          checkAnswer();
                        }, 100);
                      }
                    }}
                    disabled={isAnswerChecked}
                    sx={{ mt: 2 }}
                  >
                    {option}
                    {isAnswerChecked && option === currentCard.parsedAnswer?.correct_answer && ' ✓'}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* Feedback section */}
            {isAnswerChecked && (
              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography 
                  variant="h6" 
                  color={feedback?.correct ? 'success.main' : 'error.main'} 
                  sx={{ mb: 2, fontWeight: 'bold' }}
                >
                  {feedback?.correct ? 'Correct! ✓' : `Incorrect! The correct answer is ${currentCard.parsedAnswer?.correct_answer}`}
                </Typography>
                
                {currentCard.parsedAnswer?.explanation && (
                  <Box sx={{ mt: 2, textAlign: 'left' }}>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      Explanation:
                    </Typography>
                    <Typography variant="body1">
                      {currentCard.parsedAnswer.explanation}
                    </Typography>
                  </Box>
                )}

                {/* Rating section */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Rate this card's difficulty:
                  </Typography>
                  <Rating 
                    size="large" 
                    max={3} 
                    onChange={(event, newValue) => handleDifficulty(newValue)}
                  />
                </Box>
              </Box>
            )}
          </Paper>
        ) : currentCard?.type === 'fill_in_blank' ? (
          <Paper elevation={3} sx={{ p: 4, minHeight: '400px', display: 'flex', flexDirection: 'column', mb: 2 }}>
            <Box sx={{ flex: 1 }}>
              {renderQuestionContent(currentCard)}
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Type your answer here"
                value={selectedAnswer || ''}
                onChange={(e) => {
                  console.log('TextField onChange:', e.target.value);
                  setSelectedAnswer(e.target.value);
                }}
                disabled={isAnswerChecked}
                sx={{ mt: 4 }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && selectedAnswer) {
                    console.log('Enter key pressed');
                    checkAnswer();
                  }
                }}
              />
            </Box>

            {selectedAnswer && !isAnswerChecked && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 2 }}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={() => {
                    console.log('Check Answer button clicked');
                    checkAnswer();
                  }}
                >
                  Check Answer
                </Button>
              </Box>
            )}

            {/* Feedback and Rating section */}
            {(isAnswerChecked || feedback) && (
              <>
                <Box sx={{ mt: 3 }}>
                  {feedback && (
                    <Typography 
                      variant="h6" 
                      color={feedback.correct ? 'success.main' : 'error.main'} 
                      sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}
                    >
                      {feedback.message}
                    </Typography>
                  )}
                  <Typography variant="body1" color="primary" sx={{ mb: 2, textAlign: 'center' }}>
                    Your answer: {selectedAnswer}
                  </Typography>
                  <Typography variant="body1" color={feedback?.correct ? "success.main" : "primary"} sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
                    Correct answer: {currentCard.parsedAnswer?.correct_answer}
                  </Typography>
                  {currentCard.parsedAnswer?.explanation && (
                    <>
                      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                        Explanation:
                      </Typography>
                      <Typography variant="body1">
                        {currentCard.parsedAnswer.explanation}
                      </Typography>
                    </>
                  )}
                </Box>
                {isAnswerChecked && (
                  <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Rate this card's difficulty:
                    </Typography>
                    <Rating size="large" max={3} onChange={(event, newValue) => handleDifficulty(newValue)} />
                  </Box>
                )}
              </>
            )}
          </Paper>
        ) : (
          <Box>
            {!showAnswer ? (
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 4, 
                  minHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mb: 2
                }}
              >
                <Typography variant="h5" gutterBottom>
                  {currentCard?.question}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleShowAnswer}
                  sx={{ mt: 2 }}
                >
                  Show Answer
                </Button>
              </Paper>
            ) : (
              <Paper 
                elevation={3} 
                sx={{ 
                  p: 4, 
                  minHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  mb: 2
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Answer:
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {currentCard?.parsedAnswer?.answer || currentCard?.answer || 'No answer available'}
                  </Typography>

                  {currentCard?.parsedAnswer?.explanation && (
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                        Explanation:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {currentCard.parsedAnswer.explanation}
                      </Typography>
                    </Box>
                  )}

                  {feedback && (
                    <Typography 
                      variant="body1" 
                      color="success.main"
                      sx={{ mt: 2, mb: 2, fontWeight: 'bold' }}
                    >
                      {feedback.message}
                    </Typography>
                  )}
                </Box>

                <Box 
                  sx={{ 
                    pt: 3, 
                    mt: 'auto',
                    borderTop: '1px solid rgba(0,0,0,0.1)',
                    width: '100%',
                    textAlign: 'center'
                  }}
                >
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Rate this card's difficulty:
                  </Typography>
                  <Rating
                    size="large"
                    max={3}
                    onChange={(event, newValue) => handleDifficulty(newValue)}
                  />
                </Box>
              </Paper>
            )}
          </Box>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            variant="outlined"
            onClick={() => setCurrentCardIndex(prev => Math.max(0, prev - 1))}
            disabled={currentCardIndex === 0}
          >
            Previous Card
          </Button>
          <Typography variant="body2">
            Card {currentCardIndex + 1} of {cards.length}
          </Typography>
          <Button
            variant="contained"
            onClick={handleNextCard}
            disabled={currentCardIndex >= cards.length - 1}
          >
            Next Card
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default ReviewDeck;
