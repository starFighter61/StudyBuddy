import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Typography,
  Paper,
} from '@mui/material';

const API_URL = 'http://127.0.0.1:8000';

const CARD_TYPES = {
  basic: 'Basic',
  multiple_choice: 'Multiple Choice',
  definition: 'Definition',
  true_false: 'True/False',
  fill_in_blank: 'Fill in the Blank'
};

function CreateCardForm({ deckId, onCardCreated }) {
  const [question, setQuestion] = useState('');
  const [type, setType] = useState('basic');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdCard, setCreatedCard] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setCreatedCard(null);

    try {
      console.log('Creating card with data:', { question, type, deck_id: deckId });
      const response = await fetch(`${API_URL}/flashcards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          question,
          type,
          deck_id: deckId
        })
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (!response.ok) {
        throw new Error(`Failed to create card: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log('Created card:', data);

      // Parse the answer if it's stored as a JSON string
      try {
        data.answer = typeof data.answer === 'string' ? JSON.parse(data.answer) : data.answer;
      } catch (e) {
        console.log('Answer is not JSON:', data.answer);
      }

      // Show the created card
      setCreatedCard(data);
      
      // Notify parent
      if (onCardCreated) {
        onCardCreated(data);
      }
    } catch (err) {
      console.error('Error creating card:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnother = () => {
    setQuestion('');
    setCreatedCard(null);
  };

  // If a card was just created, show its details
  if (createdCard) {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Card Created Successfully!
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Question:
          </Typography>
          <Typography paragraph>
            {createdCard.question}
          </Typography>

          <Typography variant="subtitle1" gutterBottom>
            Answer:
          </Typography>
          <Typography paragraph>
            {typeof createdCard.answer === 'object' 
              ? JSON.stringify(createdCard.answer, null, 2)
              : createdCard.answer}
          </Typography>

          <Typography variant="subtitle2" color="text.secondary">
            Type: {CARD_TYPES[createdCard.type]}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleCreateAnother}
          >
            Create Another Card
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        label="Question"
        variant="outlined"
        fullWidth
        required
        multiline
        rows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        disabled={loading}
        sx={{ mb: 2 }}
      />

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Card Type</InputLabel>
        <Select
          value={type}
          label="Card Type"
          onChange={(e) => setType(e.target.value)}
          disabled={loading}
        >
          {Object.entries(CARD_TYPES).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={loading}
        sx={{ height: 48 }}
      >
        {loading ? <CircularProgress size={24} /> : 'Create Card'}
      </Button>
    </Box>
  );
}

export default CreateCardForm;
