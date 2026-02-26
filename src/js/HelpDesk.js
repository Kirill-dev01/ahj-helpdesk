export default class HelpDesk {
    constructor() {
        // Предполагаем, что бэкенд запущен локально на порту 7070
        this.apiUrl = 'http://localhost:7070';

        // Элементы списка
        this.ticketsList = document.getElementById('tickets-list');
        this.addBtn = document.getElementById('add-ticket-btn');

        // Элементы модалки добавления/редактирования
        this.ticketModal = document.getElementById('ticket-modal');
        this.ticketForm = document.getElementById('ticket-form');
        this.modalTitle = document.getElementById('modal-title');
        this.inputName = document.getElementById('ticket-name');
        this.inputDesc = document.getElementById('ticket-description');
        this.cancelModalBtn = document.getElementById('cancel-modal-btn');

        // Элементы модалки удаления
        this.deleteModal = document.getElementById('delete-modal');
        this.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        this.cancelDeleteBtn = document.getElementById('cancel-delete-btn');

        // Состояние
        this.editingTicketId = null;
        this.deletingTicketId = null;

        this.init();
    }

    init() {
        this.registerEvents();
        this.loadTickets(); // При запуске сразу грузим тикеты с сервера
    }

    registerEvents() {
        // Открытие модалки добавления
        this.addBtn.addEventListener('click', () => this.showModal('add'));

        // Закрытие модалок
        this.cancelModalBtn.addEventListener('click', () => this.hideModal(this.ticketModal));
        this.cancelDeleteBtn.addEventListener('click', () => this.hideModal(this.deleteModal));

        // Отправка формы (Создание или Обновление)
        this.ticketForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                name: this.inputName.value.trim(),
                description: this.inputDesc.value.trim(),
                status: false // По умолчанию тикет не выполнен
            };

            if (this.editingTicketId) {
                this.updateTicket(this.editingTicketId, data);
            } else {
                this.createTicket(data);
            }
        });

        // Подтверждение удаления
        this.confirmDeleteBtn.addEventListener('click', () => {
            if (this.deletingTicketId) {
                this.deleteTicket(this.deletingTicketId);
            }
        });

        // Делегирование событий для элементов внутри списка тикетов
        this.ticketsList.addEventListener('click', (e) => {
            const ticketEl = e.target.closest('.ticket');
            if (!ticketEl) return;

            const id = ticketEl.dataset.id;

            // Клик по чекбоксу статуса
            if (e.target.classList.contains('ticket-status')) {
                this.toggleStatus(id, e.target.checked);
                return;
            }

            // Клик по кнопке редактирования (✎)
            if (e.target.classList.contains('edit-btn')) {
                this.showModal('edit', id);
                return;
            }

            // Клик по кнопке удаления (✖)
            if (e.target.classList.contains('delete-btn')) {
                this.deletingTicketId = id;
                this.deleteModal.classList.remove('hidden');
                return;
            }

            // Клик по самому тикету (показать/скрыть подробное описание)
            if (!e.target.closest('.ticket-actions') && !e.target.classList.contains('ticket-status')) {
                this.toggleDetails(id, ticketEl);
            }
        });
    }

    // --- API ЗАПРОСЫ ---

    async loadTickets() {
        try {
            const response = await fetch(`${this.apiUrl}/?method=allTickets`);
            const tickets = await response.json();
            this.renderTickets(tickets);
        } catch (e) {
            console.error('Ошибка загрузки тикетов. Убедитесь, что сервер запущен на порту 7070', e);
        }
    }

    async createTicket(data) {
        await fetch(`${this.apiUrl}/?method=createTicket`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        this.hideModal(this.ticketModal);
        this.loadTickets();
    }

    async updateTicket(id, data) {
        await fetch(`${this.apiUrl}/?method=updateById&id=${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        this.hideModal(this.ticketModal);
        this.loadTickets();
    }

    async deleteTicket(id) {
        await fetch(`${this.apiUrl}/?method=deleteById&id=${id}`);
        this.hideModal(this.deleteModal);
        this.loadTickets();
    }

    async toggleStatus(id, isDone) {
        await fetch(`${this.apiUrl}/?method=updateById&id=${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: isDone })
        });
    }

    async toggleDetails(id, ticketEl) {
        let detailsEl = ticketEl.querySelector('.ticket-details');

        // Если описание еще не загружено - грузим с сервера
        if (!detailsEl) {
            const response = await fetch(`${this.apiUrl}/?method=ticketById&id=${id}`);
            const fullTicket = await response.json();

            detailsEl = document.createElement('div');
            detailsEl.className = 'ticket-details';
            detailsEl.textContent = fullTicket.description || 'Нет подробного описания';
            ticketEl.querySelector('.ticket-content').appendChild(detailsEl);
        }

        // Переключаем видимость
        detailsEl.style.display = detailsEl.style.display === 'block' ? 'none' : 'block';
    }

    // --- UI И ОТРИСОВКА ---

    renderTickets(tickets) {
        this.ticketsList.innerHTML = '';
        tickets.forEach(ticket => {
            const date = new Date(ticket.created).toLocaleString('ru-RU');

            const el = document.createElement('div');
            el.className = 'ticket';
            el.dataset.id = ticket.id;

            el.innerHTML = `
        <input type="checkbox" class="ticket-status" ${ticket.status ? 'checked' : ''}>
        <div class="ticket-content">
          <div class="ticket-name">${ticket.name}</div>
        </div>
        <div class="ticket-date">${date}</div>
        <div class="ticket-actions">
          <button class="edit-btn">✎</button>
          <button class="delete-btn">✖</button>
        </div>
      `;
            this.ticketsList.appendChild(el);
        });
    }

    showModal(mode, id = null) {
        this.editingTicketId = id;
        this.ticketForm.reset();

        if (mode === 'add') {
            this.modalTitle.textContent = 'Добавить тикет';
        } else if (mode === 'edit') {
            this.modalTitle.textContent = 'Изменить тикет';
            // Находим текущее имя тикета в DOM, чтобы подставить в инпут
            const ticketEl = document.querySelector(`.ticket[data-id="${id}"]`);
            this.inputName.value = ticketEl.querySelector('.ticket-name').textContent;

            const detailsEl = ticketEl.querySelector('.ticket-details');
            if (detailsEl) this.inputDesc.value = detailsEl.textContent;
        }

        this.ticketModal.classList.remove('hidden');
    }

    hideModal(modal) {
        modal.classList.add('hidden');
        this.editingTicketId = null;
        this.deletingTicketId = null;
    }
}