# Your Personal Agenda (Trello-like Kanban)

A lightweight, dependency-free Trello-style Kanban board you can run locally in any browser. It supports lists and cards, adding/removing items, drag-and-drop card reordering, inline list renaming, card editing, confirmation dialogs, reset/seed demo data, and basic theming with a Light/Dark toggle.

## Demo
Open `index.html` in your browser.

## Features
- Lists
  - Add list, rename list, move list left/right
  - Delete list with confirmation
- Cards
  - Add card, edit title/description, delete card with confirmation
  - Drag and drop to reorder within a list or move between lists
- Persistence
  - Board is saved in `localStorage` and restored on reload
  - Reset button restores demo data
- Theming
  - Light/Dark theme toggle (persisted)
- Accessible, keyboard-friendly structure and semantic HTML

## Project Structure
- index.html — App shell, header actions, list/card templates, dialogs
- style.css — UI styles for dark/light, lists, cards, dialogs
- app.js — State model, rendering, drag/drop, dialogs, persistence

## Getting Started
1. Clone or download this repository.
2. Open `index.html` in your browser.
3. Use the controls:
   - Light/Dark toggles theme
   - + Add list creates new lists
   - Inside each list: + Add card, edit/delete each card
   - Drag cards to reorder/move
   - Reset restores demo data

No build tools or servers required.

## Persistent Data
- Stored under `localStorage` key: `trello_project_board_v1`
- Theme is stored under `localStorage` key: `tp_theme`
- Use DevTools > Application > Local Storage to clear or inspect

## Notes
- If the theme toggle doesn’t switch, ensure the small snippet in `app.js` is present:
  - Query `themeToggle`, apply saved theme before the initial render, and toggle `.light` on `<html>` while persisting to `localStorage`.

## License
MIT
