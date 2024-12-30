import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Container,
  Paper,
  Alert,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  Add as AddIcon,
} from '@mui/icons-material';

const API_URL = 'http://127.0.0.1:8000';

function Dashboard() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalCards: 0,
    studyTime: '0h',
    accuracy: '0%',
  });

  const handleDeleteDeck = async (deckId) => {
    if (!window.confirm('Are you sure you want to delete this deck?')) {
      return;
    }

    try {
      console.log('Deleting deck:', deckId);
      const response = await fetch(`http://127.0.0.1:8000/decks/${deckId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      console.log('Delete response status:', response.status);
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (!response.ok) {
        throw new Error(`Failed to delete deck: ${responseText}`);
      }

      try {
        const data = JSON.parse(responseText);
        console.log('Parsed response:', data);
        
        // Remove the deck from the local state
        setDecks(decks.filter(deck => deck.id !== deckId));
        console.log('Deck deleted successfully:', data.message);
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        console.error('Response that failed to parse:', responseText);
        throw new Error('Server returned invalid JSON');
      }
    } catch (err) {
      console.error('Error deleting deck:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    const fetchDecks = async () => {
      try {
        const response = await fetch(`${API_URL}/decks`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch decks: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Fetched decks:', data);  
        setDecks(data);
        
        // Fetch cards for each deck to calculate overall stats
        let totalCards = 0;
        let totalReviews = 0;
        let correctReviews = 0;
        
        for (const deck of data) {
          const cardsResponse = await fetch(`${API_URL}/decks/${deck.id}/flashcards`);
          if (cardsResponse.ok) {
            const cards = await cardsResponse.json();
            console.log(`Fetched cards for deck ${deck.id}:`, cards);
            totalCards += cards.length;
            
            // Calculate accuracy from card stats
            cards.forEach(card => {
              console.log(`Card ${card.id} stats:`, {
                total_reviews: card.total_reviews,
                correct_reviews: card.correct_reviews
              });
              if (card.total_reviews) {
                totalReviews += card.total_reviews;
                correctReviews += card.correct_reviews || 0;
              }
            });
          }
        }
        
        console.log('Final stats:', {
          totalCards,
          totalReviews,
          correctReviews
        });
        
        // Calculate overall accuracy
        const accuracy = totalReviews > 0 
          ? Math.round((correctReviews / totalReviews) * 100) 
          : 0;
        
        // Update stats with real data
        const newStats = {
          totalCards,
          studyTime: `${Math.round(totalReviews * 0.5)}m`, // Estimate 30 seconds per review
          accuracy: `${accuracy}%`
        };
        console.log('Setting new stats:', newStats);
        setStats(newStats);
      } catch (err) {
        console.error('Error fetching decks:', err);
        setError(err.message);
      }
    };

    fetchDecks();
  }, []);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome back!
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Stats Overview */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
              <SchoolIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <div>
                <Typography variant="h6">{decks.length} Decks</Typography>
                <Typography variant="body2" color="text.secondary">Total Decks</Typography>
              </div>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
              <TimelineIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <div>
                <Typography variant="h6">{stats.studyTime}</Typography>
                <Typography variant="body2" color="text.secondary">Study Time</Typography>
              </div>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
              <div>
                <Typography variant="h6">{stats.accuracy}</Typography>
                <Typography variant="body2" color="text.secondary">Accuracy</Typography>
              </div>
            </Paper>
          </Grid>
        </Grid>

        {/* Create Deck Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/create')}
          >
            Create New Deck
          </Button>
        </Box>

        {/* Decks Grid */}
        <Grid container spacing={3}>
          {decks.map((deck) => (
            <Grid item xs={12} sm={6} md={4} key={deck.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {deck.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {deck.description || 'No description'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => navigate(`/deck/${deck.id}`)}
                    >
                      View & Edit
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate(`/review/${deck.id}`)}
                    >
                      Study
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() => handleDeleteDeck(deck.id)}
                    >
                      Delete
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
}

export default Dashboard;
