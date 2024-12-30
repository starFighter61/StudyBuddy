import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CreateCardForm from '../components/CreateCardForm';

const API_URL = 'http://127.0.0.1:8000';

const CARD_TYPES = {
  basic: 'Basic',
  multiple_choice: 'Multiple Choice',
  definition: 'Definition',
  true_false: 'True/False',
  fill_in_blank: 'Fill in the Blank'
};

function DeckView() {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [deleteCardId, setDeleteCardId] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    question: '',
    type: 'basic'
  });

  useEffect(() => {
    const fetchDeck = async () => {
      try {
        // Fetch deck details
        const deckResponse = await fetch(`${API_URL}/decks/${deckId}`);
        if (!deckResponse.ok) {
          throw new Error('Failed to fetch deck');
        }
        const deckData = await deckResponse.json();
        setDeck(deckData);

        // Fetch deck's cards
        const cardsResponse = await fetch(`${API_URL}/decks/${deckId}/flashcards`);
        if (!cardsResponse.ok) {
          throw new Error('Failed to fetch cards');
        }
        const cardsData = await cardsResponse.json();
        
        // Parse card answers if they're stored as strings
        const parsedCards = cardsData.map(card => ({
          ...card,
          answer: typeof card.answer === 'string' ? JSON.parse(card.answer) : card.answer
        }));
        
        setCards(parsedCards);
      } catch (err) {
        console.error('Error fetching deck:', err);
        setError(err.message);
      }
    };

    fetchDeck();
  }, [deckId]);

  const handleCardCreated = (newCard) => {
    setCards([...cards, newCard]);
  };

  const handleDeleteCard = async () => {
    if (!deleteCardId) return;
    
    try {
      const response = await fetch(`${API_URL}/flashcards/${deleteCardId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete card');
      }

      setCards(cards.filter(card => card.id !== deleteCardId));
      setDeleteCardId(null);
    } catch (err) {
      console.error('Error deleting card:', err);
      setError(err.message);
    }
  };

  const handleEditClick = (card) => {
    setEditingCard(card);
    setEditFormData({
      question: card.question,
      type: card.type || 'basic'
    });
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    try {
      if (!editingCard) return;
      
      console.log('Updating card:', {
        id: editingCard.id,
        ...editFormData,
        deck_id: deckId
      });

      const response = await fetch(`${API_URL}/flashcards/${editingCard.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: editFormData.question,
          type: editFormData.type,
          deck_id: deckId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const updatedCard = await response.json();
      console.log('Card updated:', updatedCard);
      
      // Update the card in the deck
      setCards(cards.map(card => 
        card.id === editingCard.id ? updatedCard : card
      ));
      
      // Close the dialog and reset form
      setEditDialogOpen(false);
      setEditingCard(null);
      setEditFormData({ question: '', type: 'basic' });
      
      // Show success message
      setSuccessMessage('Card updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating card:', error);
      setError(error.message);
    }
  };

  if (!deck) {
    return (
      <Container maxWidth="md">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {deck.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {deck.description || 'No description'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Create Card Form */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Create New Card
              </Typography>
              <CreateCardForm deckId={deckId} onCardCreated={handleCardCreated} />
            </Paper>
          </Grid>

          {/* Cards List */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Cards ({cards.length})
            </Typography>
            <Grid container spacing={2}>
              {cards.map((card) => (
                <Grid item xs={12} key={card.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" gutterBottom>
                            Question:
                          </Typography>
                          <Typography paragraph>
                            {card.question}
                          </Typography>

                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Type: {CARD_TYPES[card.type]}
                              {card.total_reviews > 0 && ` • Accuracy: ${Math.round((card.correct_reviews / card.total_reviews) * 100)}%`}
                            </Typography>
                            <IconButton 
                              size="small"
                              onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
                              sx={{ ml: 1 }}
                            >
                              {expandedCard === card.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </Box>

                          <Collapse in={expandedCard === card.id}>
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="h6" gutterBottom>
                                Answer:
                              </Typography>
                              {typeof card.answer === 'string' ? (
                                <Typography>{card.answer}</Typography>
                              ) : (
                                <Box>
                                  {card.type === 'multiple_choice' && (
                                    <>
                                      {card.answer.options.map((option, index) => (
                                        <Typography
                                          key={index}
                                          sx={{
                                            color: option === card.answer.correct_answer ? 'success.main' : 'inherit',
                                            fontWeight: option === card.answer.correct_answer ? 'bold' : 'normal',
                                            mb: 1
                                          }}
                                        >
                                          {String.fromCharCode(65 + index)}. {option}
                                          {option === card.answer.correct_answer && ' ✓'}
                                        </Typography>
                                      ))}
                                      {card.answer.explanation && (
                                        <Box sx={{ mt: 2 }}>
                                          <Typography variant="subtitle2" color="text.secondary">
                                            Explanation:
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary">
                                            {card.answer.explanation}
                                          </Typography>
                                        </Box>
                                      )}
                                    </>
                                  )}
                                </Box>
                              )}
                            </Box>
                          </Collapse>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            color="primary"
                            onClick={() => handleEditClick(card)}
                          >
                            <SettingsIcon />
                          </IconButton>
                          <IconButton 
                            color="error" 
                            onClick={() => setDeleteCardId(card.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>

        {/* Navigation */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
          {cards.length > 0 && (
            <Button
              variant="contained"
              onClick={() => navigate(`/review/${deckId}`)}
            >
              Study Deck
            </Button>
          )}
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteCardId)}
        onClose={() => setDeleteCardId(null)}
      >
        <DialogTitle>Delete Card</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this card? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteCardId(null)}>Cancel</Button>
          <Button onClick={handleDeleteCard} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Card Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Card</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Question"
              value={editFormData.question}
              onChange={(e) => setEditFormData({ ...editFormData, question: e.target.value })}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Card Type</InputLabel>
              <Select
                value={editFormData.type}
                label="Card Type"
                onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
              >
                {Object.entries(CARD_TYPES).map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default DeckView;
