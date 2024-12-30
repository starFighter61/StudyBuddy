import React from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Divider,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';

function Settings() {
  const [settings, setSettings] = React.useState({
    theme: 'light',
    notifications: true,
    autoPlay: false,
    cardFlipAnimation: true,
    studyReminders: true,
  });

  const handleChange = (setting) => (event) => {
    setSettings({
      ...settings,
      [setting]: event.target.value ?? event.target.checked,
    });
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Theme</InputLabel>
            <Select
              value={settings.theme}
              onChange={handleChange('theme')}
              label="Theme"
            >
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
              <MenuItem value="system">System Default</MenuItem>
            </Select>
          </FormControl>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Study Preferences
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoPlay}
                  onChange={handleChange('autoPlay')}
                />
              }
              label="Auto-play audio for cards with sound"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.cardFlipAnimation}
                  onChange={handleChange('cardFlipAnimation')}
                />
              }
              label="Enable card flip animation"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Notifications
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications}
                  onChange={handleChange('notifications')}
                />
              }
              label="Enable notifications"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.studyReminders}
                  onChange={handleChange('studyReminders')}
                />
              }
              label="Daily study reminders"
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Account
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button variant="contained" color="primary">
              Upgrade to Premium
            </Button>
            <Button variant="outlined" color="error">
              Delete Account
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Settings;
