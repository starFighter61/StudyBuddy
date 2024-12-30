import { configureStore } from '@reduxjs/toolkit';
import decksReducer from './features/decks/decksSlice';

export const store = configureStore({
  reducer: {
    decks: decksReducer,
  },
});
