import React, { useState } from 'react';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  AutoAwesome as AIIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://127.0.0.1:8000';

function DeckCreator() {
  const navigate = useNavigate();
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [deckId, setDeckId] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentCard, setCurrentCard] = useState({
    question: '',
    answer: '',
    type: 'basic',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const cardTypes = [
    { value: 'basic', label: 'Basic Question/Answer' },
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'true_false', label: 'True/False' },
    { value: 'definition', label: 'Definition' },
    { value: 'summary', label: 'Summary' },
  ];

  const createDeck = async () => {
    try {
      if (!deckName?.trim()) {
        setError('Please enter a deck name');
        return null;
      }

      console.log('Creating deck:', { name: deckName, description: deckDescription });
      
      const response = await fetch(`${API_URL}/decks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: deckName.trim(),
          description: deckDescription?.trim() || 'No description provided',
          is_public: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error response:', errorData);
        throw new Error(errorData.error || 'Failed to create deck');
      }

      const data = await response.json();
      console.log('Created deck:', data);
      setDeckId(data.id);
      setError(null);
      setSuccess('Deck created successfully! Saving cards...');
      return data.id;
    } catch (error) {
      console.error('Error creating deck:', error);
      setError(error.message || 'Failed to create deck');
      setSuccess(null);
      return null;
    }
  };

  const handleAddCard = async () => {
    if (!currentCard.question) {
      setError('Please enter a question');
      return;
    }

    try {
      console.log('Creating card:', currentCard);
      
      // Create deck if it doesn't exist
      let currentDeckId = deckId;
      if (!currentDeckId) {
        if (!deckName) {
          setError('Please enter a deck name');
          return;
        }
        const newDeckId = await createDeck();
        if (!newDeckId) {
          setError('Failed to create deck');
          return;
        }
        currentDeckId = newDeckId;
      }

      console.log('Using deck ID:', currentDeckId);

      // Create flashcard
      const response = await fetch(`${API_URL}/flashcards/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentCard.question,
          type: currentCard.type || 'basic',
          deck_id: currentDeckId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Server error: ${errorText}`);
      }

      const data = await response.json();
      console.log('Created card:', data);
      
      setCards([...cards, { 
        ...currentCard, 
        answer: data.answer,
        id: data.id 
      }]);
      
      setCurrentCard({
        question: '',
        answer: '',
        type: 'basic',
      });
      
      setError(null);
    } catch (error) {
      console.error('Error creating flashcard:', error);
      setError('Failed to create flashcard: ' + error.message);
    }
  };

  const handleDeleteCard = async (cardId) => {
    try {
      const response = await fetch(`${API_URL}/flashcards/${cardId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete card');
      }
      
      setCards(cards.filter(card => card.id !== cardId));
      setError(null);
    } catch (error) {
      setError('Failed to delete card: ' + error.message);
    }
  };

  const handleEditCard = async () => {
    if (!editingCard) return;
    
    try {
      console.log("Updating card:", editingCard);
      const response = await fetch(`${API_URL}/flashcards/${editingCard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: editingCard.question,
          type: editingCard.type,
          deck_id: deckId || editingCard.deck_id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(errorText);
      }

      const updatedCard = await response.json();
      console.log("Updated card:", updatedCard);
      
      setCards(cards.map(card => 
        card.id === editingCard.id ? updatedCard : card
      ));
      setEditDialogOpen(false);
      setEditingCard(null);
      setError(null);
    } catch (error) {
      console.error("Error updating card:", error);
      setError('Failed to update card: ' + error.message);
    }
  };

  const handleFinish = () => {
    if (deckId) {
      navigate(`/review/${deckId}`);
    }
  };

  const handleSaveDeck = async () => {
    try {
      if (cards.length === 0) {
        setError('Please add at least one card to the deck');
        return;
      }

      // Create deck if it doesn't exist
      if (!deckId) {
        const newDeckId = await createDeck();
        if (!newDeckId) return;
      }

      setSuccess('Saving deck...');

      // Save all cards
      const savePromises = cards.map(async card => {
        try {
          if (card.id) {
            // Update existing card
            const response = await fetch(`${API_URL}/flashcards/${card.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(card)
            });
            if (!response.ok) throw new Error('Failed to update card');
            return await response.json();
          } else {
            // Create new card
            const response = await fetch(`${API_URL}/flashcards`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...card, deck_id: deckId })
            });
            if (!response.ok) throw new Error('Failed to create card');
            return await response.json();
          }
        } catch (error) {
          console.error('Error saving card:', error);
          throw error;
        }
      });

      // Wait for all cards to be saved
      await Promise.all(savePromises);
      
      setSuccess('Deck saved successfully! Redirecting to review page...');
      
      // Navigate to review page after a short delay
      setTimeout(() => {
        navigate(`/review/${deckId}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error saving deck:', error);
      setError('Failed to save deck: ' + error.message);
      setSuccess(null);
    }
  };

  const FlashcardDisplay = ({ card }) => {
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showCorrect, setShowCorrect] = useState(false);

    const handleAnswerSelect = (option) => {
      setSelectedAnswer(option);
      setShowCorrect(true);
    };

    if (card.type === 'multiple_choice') {
      let answerData;
      try {
        answerData = typeof card.answer === 'string' ? JSON.parse(card.answer) : card.answer;
        console.log('Parsed answer data:', answerData);
      } catch (error) {
        console.error('Error parsing answer:', error);
        return (
          <Box>
            <Typography color="error">Error loading multiple choice options</Typography>
          </Box>
        );
      }

      const { options = [], correct = null, explanation = '' } = answerData || {};

      return (
        <Box>
          <Typography variant="h6" gutterBottom>
            {card.question}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
            {options.map((option, index) => (
              <Button
                key={index}
                variant={selectedAnswer === index ? "contained" : "outlined"}
                onClick={() => handleAnswerSelect(index)}
                color={showCorrect && index === correct ? "success" : 
                      showCorrect && selectedAnswer === index ? "error" : "primary"}
                sx={{ justifyContent: 'flex-start', textAlign: 'left' }}
              >
                {`${String.fromCharCode(65 + index)}) ${option}`}
              </Button>
            ))}
          </Box>
          {showCorrect && (
            <Box sx={{ mt: 2 }}>
              <Typography 
                color={selectedAnswer === correct ? "success.main" : "error.main"}
              >
                {selectedAnswer === correct ? "Correct!" : "Incorrect!"}
              </Typography>
              {explanation && (
                <Typography sx={{ mt: 1 }}>
                  <strong>Explanation: </strong>
                  {explanation}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      );
    }

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          {card.question}
        </Typography>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {card.answer}
        </Typography>
      </Box>
    );
  };

  const CardList = ({ cards, onDelete, onEdit }) => (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Flashcards
      </Typography>
      {cards.map((card, index) => (
        <Card key={card.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Card {index + 1} - {card.type.replace(/_/g, ' ').split(' ').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </Typography>
              <Box>
                <IconButton onClick={() => onEdit(card)} size="small">
                  <SettingsIcon />
                </IconButton>
                <IconButton onClick={() => onDelete(card.id)} size="small">
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
            <FlashcardDisplay card={card} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create Flashcard Deck
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Deck Name"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Deck Description"
              value={deckDescription}
              onChange={(e) => setDeckDescription(e.target.value)}
              multiline
              rows={2}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Add New Card
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Card Type</InputLabel>
            <Select
              value={currentCard.type}
              label="Card Type"
              onChange={(e) => setCurrentCard({ ...currentCard, type: e.target.value })}
            >
              {cardTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Question"
            value={currentCard.question}
            onChange={(e) => setCurrentCard({ ...currentCard, question: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            onClick={handleAddCard}
            startIcon={<AddIcon />}
            disabled={!currentCard.question}
            sx={{ mt: 1 }}
          >
            Add Card
          </Button>
        </Paper>

        <CardList cards={cards} onDelete={handleDeleteCard} onEdit={(card) => {
          setEditingCard(card);
          setEditDialogOpen(true);
        }} />

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Card</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
              <InputLabel>Card Type</InputLabel>
              <Select
                value={editingCard?.type || 'basic'}
                label="Card Type"
                onChange={(e) => setEditingCard({ ...editingCard, type: e.target.value })}
              >
                {cardTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Question"
              value={editingCard?.question || ''}
              onChange={(e) => setEditingCard({ ...editingCard, question: e.target.value })}
              sx={{ mb: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditCard} variant="contained" color="primary">
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {cards.length > 0 && (
          <Button
            variant="contained"
            color="success"
            startIcon={<AIIcon />}
            onClick={handleSaveDeck}
            sx={{ mt: 2 }}
          >
            Save Deck
          </Button>
        )}
      </Box>
    </Container>
  );
}

export default DeckCreator;
