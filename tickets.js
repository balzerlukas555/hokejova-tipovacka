(() => {
  const storageKey = 'hokejova_tipovacka_tickets_v1';

  function readTickets() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  }

  function writeTickets(tickets) {
    localStorage.setItem(storageKey, JSON.stringify(tickets));
  }

  function safeText(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function getVisibleMatches() {
    const shown = [...document.querySelectorAll('.match')];
    return shown.map((match) => {
      const teamsEl = match.querySelector('.teams');
      const matchName = teamsEl ? safeText(teamsEl.textContent) : 'Zápas';
      return {
        id: match.dataset.matchId || matchName + '-' + String(Math.random()).slice(2, 8),
        name: matchName,
        odds: 1.8 + Math.random() * 1.8
      };
    }).slice(0, 3);
  }

  function ensureStyles() {
    if (document.getElementById('ticket-system-styles')) return;

    const style = document.createElement('style');
    style.id = 'ticket-system-styles';
    style.textContent = `
      #ticketControls {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin: 20px auto;
        max-width: 420px;
        flex-wrap: wrap;
      }
      .ticket-btn {
        background: #1e293b;
        color: #fff;
        border: 1px solid #3b82f6;
        border-radius: 10px;
        padding: 10px 12px;
        cursor: pointer;
        font-weight: 700;
        font-size: 12px;
        min-width: 120px;
      }
      .ticket-btn.primary {
        background: #3b82f6;
      }
      .ticket-modal {
        position: fixed;
        inset: 0;
        display: none;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.85);
        z-index: 20000;
        padding: 16px;
      }
      .ticket-modal.open {
        display: flex;
      }
      .ticket-panel {
        background: #0f172a;
        border: 1px solid #3b82f6;
        border-radius: 14px;
        width: min(520px, 100%);
        max-height: 80vh;
        overflow: auto;
        padding: 18px;
        box-sizing: border-box;
      }
      .ticket-panel h3 {
        margin: 0 0 12px;
        color: #3b82f6;
      }
      .ticket-item {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 10px;
      }
      .ticket-item label {
        display: block;
        font-size: 12px;
        color: #94a3b8;
        margin-bottom: 6px;
      }
      .ticket-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        align-items: center;
      }
      .ticket-choice {
        width: 100%;
        margin: 4px 0;
        background: #0f172a;
        color: white;
        border: 1px solid #334155;
        padding: 8px;
        border-radius: 8px;
      }
      .ticket-stake {
        width: 100%;
        margin-top: 8px;
      }
      .ticket-actions {
        display: flex;
        gap: 10px;
        margin-top: 14px;
      }
      .ticket-actions button {
        flex: 1;
        padding: 10px 12px;
        border: 0;
        border-radius: 8px;
        cursor: pointer;
        color: white;
        font-weight: 700;
      }
      .ticket-actions .save { background: #059669; }
      .ticket-actions .cancel { background: #475569; }
      .ticket-list-item {
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 10px;
      }
      .ticket-meta {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        font-size: 12px;
        color: #94a3b8;
        margin-bottom: 8px;
      }
      .ticket-badge {
        display: inline-block;
        font-size: 10px;
        padding: 4px 7px;
        border-radius: 999px;
        font-weight: 700;
        background: #0f172a;
      }
      .ticket-badge.active { background: #0ea5e9; color: white; }
      .ticket-badge.cashout { background: #d97706; color: white; }
      .ticket-badge.history { background: #475569; color: white; }
      .ticket-cashout {
        background: #d97706;
        border: 0;
        color: white;
        width: 100%;
        padding: 8px;
        border-radius: 8px;
        margin-top: 8px;
        cursor: pointer;
        font-weight: 700;
      }
      @media (max-width: 560px) {
        .ticket-row {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createModal(title, bodyHtml, footerHtml = '') {
    let modal = document.getElementById('ticketModalRoot');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ticketModalRoot';
      modal.className = 'ticket-modal';
      modal.innerHTML = '<div class="ticket-panel"></div>';
      document.body.appendChild(modal);
    }

    const panel = modal.querySelector('.ticket-panel');
    panel.innerHTML = `
      <h3>${title}</h3>
      ${bodyHtml}
      ${footerHtml ? `<div class="ticket-actions">${footerHtml}</div>` : ''}
    `;

    return modal;
  }

  function openModal(modal) {
    modal.classList.add('open');
  }

  function closeModal(modal) {
    modal.classList.remove('open');
  }

  function renderTicketForm() {
    const matches = getVisibleMatches();

    const body = matches.length
      ? matches.map((match, index) => `
        <div class="ticket-item">
          <label>${index + 1}. ${match.name}</label>
          <div class="ticket-row">
            <select class="ticket-choice" data-match-id="${match.id}">
              <option value="1">1</option>
              <option value="X">X</option>
              <option value="2">2</option>
            </select>
            <span style="color:#fbbf24; font-weight:700;">${match.odds.toFixed(2)}</span>
          </div>
        </div>
      `).join('')
      : '<p style="color:#94a3b8;">Žádné aktivní zápasy nejsou k dispozici.</p>';

    const modal = createModal(
      'Založit tiket',
      `
        ${body}
        <div class="ticket-item">
          <label>Vklad (TC)</label>
          <input id="newTicketStake" class="ticket-choice ticket-stake" type="number" min="1" value="20" placeholder="Vklad">
        </div>
      `,
      '<button class="save" type="button" id="saveTicketBtn">Uložit</button><button class="cancel" type="button" id="closeTicketBtn">Zavřít</button>'
    );

    const saveBtn = document.getElementById('saveTicketBtn');
    const closeBtn = document.getElementById('closeTicketBtn');

    saveBtn.addEventListener('click', () => {
      const tickets = readTickets();
      const stake = Number(document.getElementById('newTicketStake')?.value || 0);
      const selections = [...document.querySelectorAll('.ticket-choice[data-match-id]')].map((select) => ({
        matchId: select.dataset.matchId,
        matchName: select.closest('.ticket-item')?.querySelector('label')?.textContent?.replace(/^\d+\.\s*/, '') || 'Zápas',
        pick: select.value
      }));

      if (!selections.length || !stake || stake <= 0) {
        alert('Zadej vklad a alespoň jeden výběr.');
        return;
      }

      tickets.push({
        id: 'T' + Date.now(),
        createdAt: new Date().toISOString(),
        status: 'active',
        stake,
        selections,
        payout: (stake * 1.95).toFixed(2),
        note: 'Aktivní tiket'
      });

      writeTickets(tickets);
      closeModal(modal);
      alert('Tiket byl vytvořen.');
    });

    closeBtn.addEventListener('click', () => closeModal(modal));
    openModal(modal);
  }

  function renderTickets(type) {
    const tickets = readTickets().filter((ticket) => {
      if (type === 'active') return ticket.status === 'active';
      if (type === 'history') return ticket.status !== 'active';
      return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!tickets.length) {
      const modal = createModal(type === 'active' ? 'Aktivní tikety' : 'Historie tiketů', '<p style="color:#94a3b8;">Žádné tikety.</p>', '<button class="cancel" type="button" id="closeTicketListBtn">Zavřít</button>');
      const closeBtn = document.getElementById('closeTicketListBtn');
      closeBtn.addEventListener('click', () => closeModal(modal));
      openModal(modal);
      return;
    }

    const body = tickets.map((ticket) => {
      const badgeClass = type === 'active' ? 'active' : 'history';
      const picks = ticket.selections.map((sel) => `${sel.matchName}: ${sel.pick}`).join(' • ');
      const cashoutButton = ticket.status === 'active'
        ? `<button class="ticket-cashout" data-cashout-id="${ticket.id}">Vybrat cashout (95 %)</button>`
        : '';

      return `
        <div class="ticket-list-item">
          <div class="ticket-meta">
            <span>${new Date(ticket.createdAt).toLocaleString('cs-CZ')}</span>
            <span class="ticket-badge ${badgeClass}">${ticket.status === 'active' ? 'Aktivní' : 'Historie'}</span>
          </div>
          <div style="font-size:13px; color:#fff; margin-bottom:8px;">${picks}</div>
          <div style="font-size:12px; color:#94a3b8;">Vklad: ${ticket.stake} TC • Výhra: ${ticket.payout} TC</div>
          ${cashoutButton}
        </div>
      `;
    }).join('');

    const modal = createModal(type === 'active' ? 'Aktivní tikety' : 'Historie tiketů', body, '<button class="cancel" type="button" id="closeTicketListBtn">Zavřít</button>');
    const closeBtn = document.getElementById('closeTicketListBtn');
    closeBtn.addEventListener('click', () => closeModal(modal));

    modal.querySelectorAll('[data-cashout-id]').forEach((button) => {
      button.addEventListener('click', () => {
        const ticketId = button.dataset.cashoutId;
        const ticketsNow = readTickets();
        const next = ticketsNow.map((ticket) => {
          if (ticket.id !== ticketId) return ticket;
          const cashoutValue = Number(ticket.stake) * 0.95;
          return { ...ticket, status: 'cashout', note: `Vyplaceno ${cashoutValue.toFixed(2)} TC`, payout: cashoutValue.toFixed(2) };
        });
        writeTickets(next);
        closeModal(modal);
        renderTickets('active');
      });
    });

    openModal(modal);
  }

  function initTicketSystem() {
    if (document.getElementById('ticketControls')) return;

    const appUI = document.getElementById('appUI');
    if (!appUI) return;

    ensureStyles();

    const controls = document.createElement('div');
    controls.id = 'ticketControls';
    controls.innerHTML = `
      <button class="ticket-btn primary" type="button" data-ticket-action="create">Založit tiket</button>
      <button class="ticket-btn" type="button" data-ticket-action="active">Aktivní tikety</button>
      <button class="ticket-btn" type="button" data-ticket-action="history">Historie tiketů</button>
    `;

    appUI.appendChild(controls);

    controls.addEventListener('click', (event) => {
      const button = event.target.closest('[data-ticket-action]');
      if (!button) return;

      const action = button.dataset.ticketAction;
      if (action === 'create') renderTicketForm();
      if (action === 'active') renderTickets('active');
      if (action === 'history') renderTickets('history');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTicketSystem);
  } else {
    initTicketSystem();
  }
})();
