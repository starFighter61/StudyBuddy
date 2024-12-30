import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Alert,
} from '@mui/material';

function MultipleChoiceCard({ card, onNext }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Parse the answer data
  let answerData;
  try {
    answerData = typeof card.answer === 'string' ? JSON.parse(card.answer) : card.answer;
    console.log('Raw card answer:', card.answer); // Debug log
    console.log('Parsed answer data:', answerData); // Debug log
  } catch (error) {
    console.error('Error parsing answer:', error);
    answerData = { options: [], correct: null, explanation: 'Error loading question' };
  }

  const { options = [], correct = null, explanation = '' } = answerData || {};

  const handleAnswerSelect = (label) => {
    setSelectedAnswer(label);
    setShowExplanation(true);
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    onNext();
  };

  // If no valid options, show error
  if (!options || options.length === 0) {
    return (
      <Box>
        <Card sx={{ minHeight: 300, mb: 2 }}>
          <CardContent>
            <Typography variant="h6" color="error" align="center">
              Error loading multiple choice options
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Card sx={{ minHeight: 300, mb: 2 }}>
        <CardContent>
          <Typography variant="h5" component="div" align="center" gutterBottom>
            {card.question}
          </Typography>

          <Stack spacing={2} sx={{ mt: 4 }}>
            {options.map((option, index) => {
              // Handle both string options and object options
              const isObject = typeof option === 'object' && option !== null;
              const label = isObject ? option.label : String.fromCharCode(65 + index);
              const text = isObject ? option.text : option;
              
              return (
                <Button
                  key={index}
                  variant={selectedAnswer === label ? 'contained' : 'outlined'}
                  color={
                    selectedAnswer === label
                      ? label === correct
                        ? 'success'
                        : 'error'
                      : 'primary'
                  }
                  onClick={() => handleAnswerSelect(label)}
                  disabled={selectedAnswer !== null}
                  fullWidth
                  sx={{ py: 1.5, justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  {`${label}) ${text}`}
                </Button>
              );
            })}
          </Stack>

          {showExplanation && (
            <Box sx={{ mt: 3 }}>
              <Alert 
                severity={selectedAnswer === correct ? "success" : "error"}
                sx={{ mb: 2 }}
              >
                {selectedAnswer === correct ? 'Correct!' : 'Incorrect!'}
                {explanation && (
                  <Typography sx={{ mt: 1 }}>
                    {explanation}
                  </Typography>
                )}
              </Alert>
              <Button variant="contained" onClick={handleNext} fullWidth>
                Next Question
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default MultipleChoiceCard;
