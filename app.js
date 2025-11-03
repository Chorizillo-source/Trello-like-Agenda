// Trello-like Kanban Board - Vanilla JS
// Features: lists, cards, drag&drop, inline list rename, edit card dialog, delete confirm, persistence (localStorage)

(function () {
  const boardEl = document.getElementById('board');
  const addListBtn = document.getElementById('add-list-btn');
  const clearBtn = document.getElementById('clear-board-btn');

  const listTpl = document.getElementById('list-template');
  const cardTpl = document.getElementById('card-template');

  const cardDialog = document.getElementById('card-dialog');
  const cardTitleInput = document.getElementById('card-title-input');
  const cardDescInput = document.getElementById('card-desc-input');
  const cardSaveBtn = document.getElementById('card-save-btn');

  const confirmDialog = document.getElementById('confirm-dialog');
  const confirmTitle = document.getElementById('confirm-title');
  const confirmMessage = document.getElementById('confirm-message');
  const confirmAccept = document.getElementById('confirm-accept');

  const STORAGE_KEY = 'trello_project_board_v1';

  let state = safeLoadState() || seedDemoData();
  let editing = null; // { listId, cardId }
  let pendingConfirm = null; // { action: Function }

  render();

  addListBtn.addEventListener('click', () => {
    // Ensure state structure exists
    if (!state || !Array.isArray(state.lists)) {
      state = { lists: [] };
    }
    const list = createList('New list');
    state.lists.push(list);
    persist();
    render();
  });

  clearBtn.addEventListener('click', () => {
    openConfirm({
      title: 'Reset board',
      message: 'This will clear the board and load demo data again.',
      onAccept: () => {
        state = seedDemoData(true);
        persist();
        render();
      }
    });
  });

  function seedDemoData(force = false) {
    if (!force && localStorage.getItem(STORAGE_KEY)) {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    }
    return {
      lists: [
        createList('To Do', [
          createCard('Draft project README', 'Outline features and usage'),
          createCard('Sketch UI', 'Wireframe lists and cards')
        ]),
        createList('In Progress', [
          createCard('Implement drag & drop'),
          createCard('Add persistence', 'Use localStorage')
        ]),
        createList('Done', [
          createCard('Initial scaffold'),
        ]),
      ]
    };
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function safeLoadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.lists)) return null;
      return parsed;
    } catch (e) {
      console.warn('State load failed, reseeding demo data', e);
      return null;
    }
  }

  function uid() { return Math.random().toString(36).slice(2, 9); }

  function createList(title, cards = []) {
    return { id: uid(), title, cards };
  }

  function createCard(title, desc = '') {
    return { id: uid(), title, desc };
  }

  function render() {
    boardEl.innerHTML = '';
    state.lists.forEach((list, index) => {
      const node = renderList(list, index);
      boardEl.appendChild(node);
    });
  }

  function renderList(list, listIndex) {
    const node = listTpl.content.firstElementChild.cloneNode(true);
    const titleInput = node.querySelector('.list-title');
    const cardsEl = node.querySelector('.cards');

    titleInput.value = list.title;
    titleInput.addEventListener('change', () => {
      list.title = titleInput.value.trim() || 'Untitled';
      persist();
    });

    // List actions
    node.querySelector('.delete-list').addEventListener('click', () => {
      openConfirm({
        title: 'Delete list',
        message: `Delete list "${list.title}" and all its cards?`,
        onAccept: () => {
          state.lists.splice(listIndex, 1);
          persist();
          render();
        }
      });
    });
    node.querySelector('.move-left').addEventListener('click', () => {
      if (listIndex > 0) {
        const [l] = state.lists.splice(listIndex, 1);
        state.lists.splice(listIndex - 1, 0, l);
        persist();
        render();
      }
    });
    node.querySelector('.move-right').addEventListener('click', () => {
      if (listIndex < state.lists.length - 1) {
        const [l] = state.lists.splice(listIndex, 1);
        state.lists.splice(listIndex + 1, 0, l);
        persist();
        render();
      }
    });

    // Cards
    list.cards.forEach((card, idx) => {
      const c = renderCard(card, list, idx);
      cardsEl.appendChild(c);
    });

    node.querySelector('.add-card').addEventListener('click', () => {
      const newCard = createCard('New card');
      list.cards.push(newCard);
      persist();
      render();
    });

    // Drag and drop for lists (optional visual cue)
    node.addEventListener('dragover', (e) => {
      if (drag.card) {
        e.preventDefault();
        node.classList.add('drag-over');
      }
    });
    node.addEventListener('dragleave', () => node.classList.remove('drag-over'));
    node.addEventListener('drop', (e) => {
      node.classList.remove('drag-over');
      if (drag.card) {
        e.preventDefault();
        const targetList = list;
        moveCard(drag.fromList, drag.cardIndex, targetList, targetList.cards.length);
      }
    });

    return node;
  }

  function renderCard(card, list, cardIndex) {
    const node = cardTpl.content.firstElementChild.cloneNode(true);
    const titleEl = node.querySelector('.card-title');
    titleEl.textContent = card.title;

    node.querySelector('.edit-card').addEventListener('click', () => {
      openCardDialog(list.id, card.id);
    });
    node.querySelector('.delete-card').addEventListener('click', () => {
      openConfirm({
        title: 'Delete card',
        message: `Delete card "${card.title}"?`,
        onAccept: () => {
          const i = list.cards.findIndex(c => c.id === card.id);
          if (i !== -1) list.cards.splice(i, 1);
          persist();
          render();
        }
      });
    });

    // DnD
    node.addEventListener('dragstart', () => {
      drag.card = card;
      drag.cardIndex = cardIndex;
      drag.fromList = list;
      node.classList.add('dragging');
    });
    node.addEventListener('dragend', () => {
      drag.card = null;
      node.classList.remove('dragging');
    });

    node.addEventListener('dragover', (e) => {
      if (!drag.card) return;
      e.preventDefault();
      const cardsEl = node.parentElement;
      const children = Array.from(cardsEl.children);
      const hoverIndex = children.indexOf(node);
      if (drag.fromList === list && drag.cardIndex === hoverIndex) return;
      const after = isAfter(e.clientY, node) ? 1 : 0;
      moveCard(drag.fromList, drag.cardIndex, list, hoverIndex + after);
    });

    return node;
  }

  function isAfter(y, cardEl) {
    const rect = cardEl.getBoundingClientRect();
    return y > rect.top + rect.height / 2;
  }

  function moveCard(fromList, fromIndex, toList, toIndex) {
    if (!fromList || fromIndex == null || !toList) return;
    const [card] = fromList.cards.splice(fromIndex, 1);
    toIndex = Math.max(0, Math.min(toIndex, toList.cards.length));
    toList.cards.splice(toIndex, 0, card);
    // Update drag context to new location
    drag.cardIndex = toList.cards.indexOf(card);
    drag.fromList = toList;
    persist();
    render();
  }

  function openCardDialog(listId, cardId) {
    const list = state.lists.find(l => l.id === listId);
    if (!list) return;
    const card = list.cards.find(c => c.id === cardId);
    if (!card) return;

    editing = { listId, cardId };
    cardTitleInput.value = card.title;
    cardDescInput.value = card.desc || '';
    cardDialog.showModal();
  }

  cardDialog.addEventListener('close', () => { editing = null; });
  cardSaveBtn.addEventListener('click', () => {
    if (!editing) return;
    const list = state.lists.find(l => l.id === editing.listId);
    const card = list?.cards.find(c => c.id === editing.cardId);
    if (!card) return;
    card.title = cardTitleInput.value.trim() || 'Untitled';
    card.desc = cardDescInput.value;
    persist();
    render();
  });

  function openConfirm({ title, message, onAccept }) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    pendingConfirm = { action: onAccept };
    confirmDialog.showModal();
  }
  confirmDialog.addEventListener('close', () => { pendingConfirm = null; });
  confirmAccept.addEventListener('click', () => {
    if (pendingConfirm?.action) pendingConfirm.action();
  });

  // Simple drag context
  const drag = { card: null, cardIndex: null, fromList: null };
})();
