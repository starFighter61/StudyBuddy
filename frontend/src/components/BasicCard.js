import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

const BasicCard = ({ card, isFlipped, onClick, sources }) => {
  // Function to process citations and create links
  const processAnswer = (text, sources) => {
    if (!text || !sources) return text;

    console.log('Processing answer:', text); // Debug log
    console.log('With sources:', sources); // Debug log

    // Split the answer into parts before "Sources:" section
    const [mainAnswer, sourcesSection] = text.split('Sources:');
    
    // Replace citation numbers with clickable links
    const processedAnswer = mainAnswer.replace(/\[(\d+)\]/g, (match, num) => {
      const source = sources.find(s => s.number === parseInt(num));
      console.log('Found source for citation', num, ':', source); // Debug log
      if (!source) return match;
      return `<a href="${source.url}" target="_blank" rel="noopener noreferrer" style="color: #1976d2; text-decoration: none;">[${num}]</a>`;
    });

    // Process the sources section if it exists
    if (sourcesSection) {
      const processedSources = sourcesSection.split('\n').map(line => {
        const match = line.match(/^\d+\./);
        if (match) {
          const num = match[0].replace('.', '');
          const source = sources.find(s => s.number === parseInt(num));
          console.log('Found source for listing', num, ':', source); // Debug log
          if (source) {
            return `${num}. <a href="${source.url}" target="_blank" rel="noopener noreferrer" style="color: #1976d2; text-decoration: none;">${source.title}</a>`;
          }
        }
        return line;
      }).join('\n');
      return processedAnswer + '\n\nSources:' + processedSources;
    }

    return processedAnswer;
  };

  const displayAnswer = card.answer || 'No answer available';
  console.log('Display answer:', displayAnswer); // Debug log
  console.log('Sources:', sources); // Debug log
  
  const processedAnswer = processAnswer(displayAnswer, sources);
  console.log('Processed answer:', processedAnswer); // Debug log

  return (
    <Card 
      onClick={onClick}
      sx={{ 
        minWidth: 275,
        cursor: 'pointer',
        transition: 'transform 0.3s ease-in-out',
        '&:hover': {
          transform: 'scale(1.02)'
        }
      }}
    >
      <CardContent>
        <Typography variant="h5" component="div" align="center">
          {isFlipped ? (
            <Typography 
              variant="body1" 
              component="div"
              dangerouslySetInnerHTML={{ __html: processedAnswer }}
              sx={{
                '& a': {
                  color: '#1976d2 !important',
                  textDecoration: 'none !important',
                  cursor: 'pointer',
                  '&:hover': {
                    textDecoration: 'underline !important'
                  }
                }
              }}
            />
          ) : card.question}
        </Typography>
      </CardContent>
    </Card>
  );
};

export default BasicCard;
