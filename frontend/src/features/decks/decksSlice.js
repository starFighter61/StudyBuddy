import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  decks: [],
  status: 'idle',
  error: null,
};

export const decksSlice = createSlice({
  name: 'decks',
  initialState,
  reducers: {
    setDecks: (state, action) => {
      state.decks = action.payload;
    },
    addDeck: (state, action) => {
      state.decks.push(action.payload);
    },
    updateDeck: (state, action) => {
      const index = state.decks.findIndex(deck => deck.id === action.payload.id);
      if (index !== -1) {
        state.decks[index] = action.payload;
      }
    },
    removeDeck: (state, action) => {
      state.decks = state.decks.filter(deck => deck.id !== action.payload);
    },
  },
});

export const { setDecks, addDeck, updateDeck, removeDeck } = decksSlice.actions;

export default decksSlice.reducer;
