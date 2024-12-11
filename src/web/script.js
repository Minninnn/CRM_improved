document.addEventListener('DOMContentLoaded', () => {
    // Массивы со строковыми значениями для дат
    const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

    // Элементы с DOM
    const toolsList = document.getElementById('toolsList');
    const productsList = document.getElementById('productsList');
    const servicesList = document.getElementById('servicesList');
    const selectedDateTimeInput = document.getElementById('selectedDateTime');
    const dealModalElement = document.getElementById('dealModal');
    const saveDealButton = document.getElementById('saveDealButton');

    // Глобальные переменные для смещений недели/дня
    let weekOffset = 0;
    let dayOffset = 0;
    let displayStartDate = null;

    // Хранилище сделок
    const dealsMap = new Map();

    // Универсальная функция загрузки данных
    const fetchData = async (url) => {
        try {
            const response = await fetch(url, { credentials: 'same-origin' });
            if (!response.ok) {
                throw new Error(`Ошибка сети: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Ошибка при загрузке данных с ${url}:`, error);
            throw error;
        }
    };

    // Загрузка начальных данных
    const loadInitialData = async () => {
        try {
            const [tools, products, services] = await Promise.all([
                fetchData('/api/tools'),
                fetchData('/api/products'),
                fetchData('/api/services')
            ]);

            populateToolsList(tools);
            populateProductsList(products);
            populateServicesList(services);

        } catch (error) {
            alert('Ошибка при загрузке данных. Пожалуйста, попробуйте снова позже.');
        }
    };

    function populateToolsList(tools) {
        toolsList.innerHTML = '';
        const fragment = document.createDocumentFragment();

        tools.forEach(tool => {
            const div = document.createElement('div');
            div.classList.add('tool-item', 'mb-3');

            const label = document.createElement('label');
            label.classList.add('form-label', 'fw-bold');
            label.textContent = `${tool.name} (доступно: ${tool.amount})`;

            const amountInput = document.createElement('input');
            amountInput.type = 'number';
            amountInput.min = '0';
            amountInput.max = tool.amount;
            amountInput.value = '0';
            amountInput.dataset.toolId = tool.id;
            amountInput.dataset.availableAmount = tool.amount;
            amountInput.classList.add('form-control', 'amount-input', 'mt-1');
            amountInput.placeholder = 'Количество';

            const durationContainer = document.createElement('div');
            durationContainer.classList.add('d-flex', 'align-items-center', 'mt-2');

            const durationInput = document.createElement('input');
            durationInput.type = 'number';
            durationInput.min = '30';
            durationInput.step = '30';
            durationInput.value = '30';
            durationInput.dataset.toolId = tool.id;
            durationInput.classList.add('form-control', 'duration-input');
            durationInput.placeholder = 'Продолжительность (минуты)';
            durationInput.title = 'Минимальная продолжительность: 30 минут';

            const durationDisplay = document.createElement('span');
            durationDisplay.classList.add('ms-2', 'duration-display');
            durationDisplay.textContent = '0.5 ч';

            // Обработчик изменения значения длительности для обновления отображения часов
            durationInput.addEventListener('input', (event) => {
                const minutes = parseInt(event.target.value, 10);
                if (!isNaN(minutes) && minutes >= 30) {
                    const hours = (minutes / 60).toFixed(1);
                    durationDisplay.textContent = `${hours} ч`;
                } else {
                    durationDisplay.textContent = '0.5 ч';
                }
            });

            durationContainer.appendChild(durationInput);
            durationContainer.appendChild(durationDisplay);

            div.appendChild(label);
            div.appendChild(amountInput);
            div.appendChild(durationContainer);
            fragment.appendChild(div);
        });

        toolsList.appendChild(fragment);
    }

    function populateProductsList(products) {
        productsList.innerHTML = '';
        const fragment = document.createDocumentFragment();

        products.forEach(product => {
            const div = document.createElement('div');
            div.classList.add('product-item', 'mb-2');

            const label = document.createElement('label');
            label.textContent = `${product.name} (доступно: ${product.amount})`;

            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.max = product.amount;
            input.value = '0';
            input.dataset.productId = product.id;
            input.classList.add('form-control', 'product-amount-input', 'mt-1');

            div.appendChild(label);
            div.appendChild(input);
            fragment.appendChild(div);
        });

        productsList.appendChild(fragment);
    }

    // Обновлённая функция populateServicesList с добавлением поля ввода длительности
    function populateServicesList(services) {
        servicesList.innerHTML = '';
        const fragment = document.createDocumentFragment();

        services.forEach(service => {
            const div = document.createElement('div');
            div.classList.add('service-item', 'mb-2');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.serviceId = service.id;
            checkbox.dataset.contractor = service.contractor;
            checkbox.classList.add('form-check-input', 'ms-2', 'me-2');

            const label = document.createElement('label');
            label.textContent = `${service.name} (исполнитель: ${service.contractor})`;
            label.classList.add('form-check-label');

            // Создание контейнера для ввода длительности
            const durationContainer = document.createElement('div');
            durationContainer.classList.add('d-flex', 'align-items-center', 'mt-1');
            durationContainer.style.display = 'none'; // Изначально скрыт

            const durationInput = document.createElement('input');
            durationInput.type = 'number';
            durationInput.min = '30';
            durationInput.step = '30';
            durationInput.value = '30';
            durationInput.dataset.serviceId = service.id;
            durationInput.classList.add('form-control', 'service-duration-input', 'me-2');
            durationInput.placeholder = 'Продолжительность (минуты)';
            durationInput.title = 'Минимальная продолжительность: 30 минут';

            const durationDisplay = document.createElement('span');
            durationDisplay.classList.add('duration-display');
            durationDisplay.textContent = '0.5 ч';

            durationContainer.appendChild(durationInput);
            durationContainer.appendChild(durationDisplay);

            // Обработчик изменения чекбокса для показа/скрытия поля длительности
            checkbox.addEventListener('change', (event) => {
                if (event.target.checked) {
                    durationContainer.style.display = 'flex';
                } else {
                    durationContainer.style.display = 'none';
                    durationInput.value = '30'; // Сброс значения до 30 минут
                    durationDisplay.textContent = '0.5 ч';
                }
            });

            // Обработчик изменения значения длительности для обновления отображения часов
            durationInput.addEventListener('input', (event) => {
                const minutes = parseInt(event.target.value, 10);
                if (!isNaN(minutes) && minutes >= 30) {
                    const hours = (minutes / 60).toFixed(1);
                    durationDisplay.textContent = `${hours} ч`;
                } else {
                    durationDisplay.textContent = '0.5 ч';
                }
            });

            div.appendChild(checkbox);
            div.appendChild(label);
            div.appendChild(durationContainer);
            fragment.appendChild(div);
        });

        servicesList.appendChild(fragment);
    }

    function generateTimeSlots() {
        const startTime = 10 * 60;
        const endTime = 20 * 60;
        const step = 30;
        const timeContainerLeft = document.getElementById('time-container-left');
        const timeContainerRight = document.getElementById('time-container-right');

        timeContainerLeft.innerHTML = '';
        timeContainerRight.innerHTML = '';

        const fragmentLeft = document.createDocumentFragment();
        const fragmentRight = document.createDocumentFragment();

        for (let minutes = startTime; minutes <= endTime; minutes += step) {
            const timeString = formatTime(minutes);

            const timeElementLeft = document.createElement('div');
            timeElementLeft.classList.add('time-cell');
            timeElementLeft.textContent = timeString;

            fragmentLeft.appendChild(timeElementLeft);
            const timeElementRight = timeElementLeft.cloneNode(true);
            fragmentRight.appendChild(timeElementRight);
        }

        timeContainerLeft.appendChild(fragmentLeft);
        timeContainerRight.appendChild(fragmentRight);
    }

    function formatTime(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const paddedHours = hours.toString().padStart(2, '0');
        const paddedMinutes = minutes.toString().padStart(2, '0');
        return `${paddedHours}:${paddedMinutes}`;
    }

    function generateScheduleGrid() {
        const tableContainer = document.getElementById('table-container');
        const timeCells = document.querySelectorAll('#time-container-left .time-cell');
        tableContainer.innerHTML = '';

        const fragment = document.createDocumentFragment();

        timeCells.forEach(timeCell => {
            const row = document.createElement('div');
            row.classList.add('schedule-row');

            const timeString = timeCell.textContent;
            const [hour, minute] = timeString.split(':').map(Number);

            for (let i = 0; i < 7; i++) {
                const cell = document.createElement('div');
                cell.classList.add('schedule-cell');
                cell.dataset.datetime = getCellDateTimeISO(hour, minute, i);

                const dealsContainer = document.createElement('div');
                dealsContainer.classList.add('deals-container');
                cell.appendChild(dealsContainer);

                const dealOptions = document.createElement('div');
                dealOptions.classList.add('deal-options');

                const editButton = document.createElement('button');
                editButton.textContent = 'Редактировать';
                editButton.classList.add('btn', 'btn-sm', 'btn-primary', 'me-1');
                editButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEditDealModal(cell.dataset.datetime);
                });

                const addButton = document.createElement('button');
                addButton.textContent = 'Добавить';
                addButton.classList.add('btn', 'btn-sm', 'btn-success');
                addButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openDealModal(new Date(cell.dataset.datetime));
                });

                dealOptions.appendChild(editButton);
                dealOptions.appendChild(addButton);
                cell.appendChild(dealOptions);

                row.appendChild(cell);
            }

            fragment.appendChild(row);
        });

        tableContainer.appendChild(fragment);
        fetchDealsAndUpdateCells();
    }

    function getCellDateTimeISO(hour, minute, dayIndex) {
        const cellDate = new Date(displayStartDate);
        cellDate.setDate(displayStartDate.getDate() + dayIndex);
        cellDate.setHours(hour, minute, 0, 0);
        return cellDate.toISOString();
    }

    async function fetchDealsAndUpdateCells() {
        const startDate = displayStartDate.toISOString();
        const endDate = new Date(displayStartDate);
        endDate.setDate(endDate.getDate() + 7);
        const endDateString = endDate.toISOString();

        try {
            const data = await fetchData(`/api/deals?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDateString)}`);

            dealsMap.clear();

            data.forEach(deal => {
                const scheduledDateTime = new Date(deal.scheduled_date).toISOString();
                if (!dealsMap.has(scheduledDateTime)) {
                    dealsMap.set(scheduledDateTime, []);
                }
                dealsMap.get(scheduledDateTime).push(deal);
            });

            updateCellsWithDeals();

        } catch (error) {
            console.error('Ошибка при получении сделок:', error);
        }
    }

    function updateCellsWithDeals() {
        // Очистка предыдущих отображений сделок
        document.querySelectorAll('.deals-container').forEach(container => {
            container.innerHTML = '';
        });

        // Удаление классов у всех ячеек
        document.querySelectorAll('.schedule-cell').forEach(cell => {
            cell.classList.remove('has-deal', 'split', 'deal-start', 'deal-end');
            cell.dataset.dealId = '';
        });

        dealsMap.forEach((deals, datetime) => {
            deals.forEach(deal => {

                const cell = document.querySelector(`.schedule-cell[data-datetime="${datetime}"]`);
                if (cell) {
                    const dealsContainer = cell.querySelector('.deals-container');

                    // Рассчёт количества ячеек, которые должна занимать сделка
                    const slotDuration = 30; // продолжительность одного слота в минутах
                    const dealDuration = deal.duration || 30; // продолжительность сделки в минутах
                    const spanSlots = Math.ceil(dealDuration / slotDuration);

                    // Проверка, не выходит ли сделка за границы текущей недели
                    const startDate = new Date(datetime);
                    const endDate = new Date(startDate);
                    endDate.setMinutes(endDate.getMinutes() + dealDuration);

                    // Проверка, что все слоты для сделки свободны
                    let canPlaceDeal = true;
                    for (let i = 0; i < spanSlots; i++) {
                        const currentDateTime = new Date(startDate.getTime() + i * slotDuration * 60000).toISOString();
                        const currentCell = document.querySelector(`.schedule-cell[data-datetime="${currentDateTime}"]`);
                        if (!currentCell || currentCell.dataset.dealId) {
                            canPlaceDeal = false;
                            break;
                        }
                    }

                    if (canPlaceDeal) {
                        // Отметить ячейки как занятые
                        for (let i = 0; i < spanSlots; i++) {
                            const currentDateTime = new Date(startDate.getTime() + i * slotDuration * 60000).toISOString();
                            const currentCell = document.querySelector(`.schedule-cell[data-datetime="${currentDateTime}"]`);
                            if (currentCell) {
                                currentCell.dataset.dealId = deal.id; // Использование полученного id
                                if (i === 0) {
                                    currentCell.classList.add('has-deal', 'deal-start');
                                } else if (i === spanSlots - 1) {
                                    currentCell.classList.add('deal-end');
                                } else {
                                    currentCell.classList.add('has-deal');
                                }
                            }
                        }

                        // Создание элемента сделки только в первой ячейке
                        const dealDiv = document.createElement('div');
                        dealDiv.classList.add('deal-item', 'badge', 'bg-info', 'text-dark', 'mb-1', 'd-block');
                        dealDiv.style.width = `${spanSlots * 100}%`; // возможно, нужно скорректировать по дизайну
                        if (deal.duration && Number(deal.duration) > 29) {
                            const durationHours = formatDuration(Number(deal.duration));
                            dealDiv.textContent = `${deal.clientName} - ${durationHours} ч`;
                        } else {
                            dealDiv.textContent = `${deal.clientName}`;
                        }

                        // Добавление обработчиков событий
                        dealDiv.addEventListener('click', (e) => {
                            e.stopPropagation();
                            openEditDealModal(deal.id); // предполагается, что модалка может принимать id сделки
                        });

                        dealsContainer.appendChild(dealDiv);
                    } else {
                        console.warn(`Не удалось разместить сделку ${deal.id} из-за занятых слотов.`);
                    }
                }
            });
        });
    }

    function setupCellClickHandler() {
        const tableContainer = document.getElementById('table-container');
        tableContainer.addEventListener('click', (event) => {
            const target = event.target.closest('.schedule-cell');
            if (target) {
                const cellDateStr = target.getAttribute('data-datetime');
                const cellDate = new Date(cellDateStr);
                openDealModal(cellDate);
            }
        });
    }

    function openDealModal(cellDate) {
        selectedDateTimeInput.value = cellDate.toISOString();
        const dealModal = new bootstrap.Modal(dealModalElement);
        dealModal.show();
    }

    function openEditDealModal(dealId) {
        // Найти сделку по id
        let dealToEdit = null;
        dealsMap.forEach((deals, datetime) => {
            deals.forEach(deal => {
                if (deal.id === dealId) {
                    dealToEdit = deal;
                }
            });
        });

        if (!dealToEdit) {
            alert('Сделка не найдена для редактирования.');
            return;
        }

        document.getElementById('clientName').value = dealToEdit.clientName || '';
        document.getElementById('clientPhone').value = dealToEdit.clientPhone || '';
        document.getElementById('clientEmail').value = dealToEdit.clientEmail || '';
        selectedDateTimeInput.value = dealToEdit.scheduled_date;

        // Заполнение инструментов, продуктов и услуг
        // Очистка предыдущих выборов
        document.querySelectorAll('#toolsList .amount-input').forEach(input => {
            input.value = '0';
        });
        document.querySelectorAll('#productsList .product-amount-input').forEach(input => {
            input.value = '0';
        });
        document.querySelectorAll('#servicesList .service-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
            const durationContainer = checkbox.closest('.service-item').querySelector('.d-flex');
            durationContainer.style.display = 'none';
            const durationInput = durationContainer.querySelector('.service-duration-input');
            durationInput.value = '30';
            durationContainer.querySelector('.duration-display').textContent = '0.5 ч';
        });

        // Предполагается, что dealToEdit содержит информацию о выбранных инструментах, продуктах и услугах
        // Необходимо заполнить соответствующие поля

        if (dealToEdit.tools) {
            dealToEdit.tools.forEach(tool => {
                const amountInput = document.querySelector(`.amount-input[data-tool-id="${tool.id}"]`);
                if (amountInput) {
                    amountInput.value = tool.amount;
                    const toolItem = amountInput.closest('.tool-item');
                    if (tool.amount > 0) {
                        toggleDurationInput(toolItem, true);
                        const durationInput = toolItem.querySelector('.duration-input');
                        durationInput.value = tool.duration || '30';
                        const durationDisplay = toolItem.querySelector('.duration-display');
                        durationDisplay.textContent = `${formatDuration(tool.duration || 30)} ч`;
                    }
                }
            });
        }

        if (dealToEdit.products) {
            dealToEdit.products.forEach(product => {
                const productInput = document.querySelector(`.product-amount-input[data-product-id="${product.id}"]`);
                if (productInput) {
                    productInput.value = product.amount;
                }
            });
        }

        if (dealToEdit.services) {
            dealToEdit.services.forEach(service => {
                const serviceCheckbox = document.querySelector(`.service-item input[type="checkbox"][data-service-id="${service.id}"]`);
                if (serviceCheckbox) {
                    serviceCheckbox.checked = true;
                    const durationContainer = serviceCheckbox.closest('.service-item').querySelector('.d-flex');
                    durationContainer.style.display = 'flex';
                    const durationInput = durationContainer.querySelector('.service-duration-input');
                    durationInput.value = service.duration || '30';
                    durationContainer.querySelector('.duration-display').textContent = `${formatDuration(service.duration || 30)} ч`;
                }
            });
        }

        const dealModal = new bootstrap.Modal(dealModalElement);
        dealModal.show();
    }

    async function saveDeal() {
        // Удаление классов ошибок
        ['clientName', 'clientPhone', 'clientEmail'].forEach(id => {
            document.getElementById(id).classList.remove('is-invalid');
        });
        toolsList.classList.remove('is-invalid');
        servicesList.classList.remove('is-invalid');

        let isValid = true;

        const clientName = document.getElementById('clientName').value.trim();
        const clientPhone = document.getElementById('clientPhone').value.trim();
        const clientEmail = document.getElementById('clientEmail').value.trim();
        const dateTime = selectedDateTimeInput.value;

        if (clientName === '') {
            document.getElementById('clientName').classList.add('is-invalid');
            isValid = false;
        }

        if (clientEmail === '' && clientPhone === '') {
            document.getElementById('clientEmail').classList.add('is-invalid');
            document.getElementById('clientPhone').classList.add('is-invalid');
            isValid = false;
        }

        const products = [];
        document.querySelectorAll('#productsList .product-item').forEach(item => {
            const input = item.querySelector('.product-amount-input');
            const amount = parseInt(input.value, 10);
            if (amount > 0) {
                products.push({
                    id: parseInt(input.dataset.productId, 10),
                    amount: amount
                });
            }
        });

        const services = [];
        document.querySelectorAll('#servicesList .service-item').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox.checked) {
                const durationInput = item.querySelector('.service-duration-input');
                const duration = parseInt(durationInput.value, 10);
                if (isNaN(duration) || duration < 30) {
                    durationInput.classList.add('is-invalid');
                    isValid = false;
                } else {
                    durationInput.classList.remove('is-invalid');
                }

                services.push({
                    id: parseInt(checkbox.dataset.serviceId, 10),
                    contractor: checkbox.dataset.contractor,
                    duration: duration // Добавляем длительность услуги
                });
            }
        });

        const tools = [];
        const toolItems = document.querySelectorAll('#toolsList .tool-item');
        toolItems.forEach(item => {
            const amountInput = item.querySelector('.amount-input');
            const durationInput = item.querySelector('.duration-input');
            const availableAmount = parseInt(amountInput.dataset.availableAmount, 10);
            const amount = parseInt(amountInput.value, 10);
            const duration = parseInt(durationInput.value, 10);

            if (amount > availableAmount) {
                amountInput.classList.add('is-invalid');
                isValid = false;
            } else {
                amountInput.classList.remove('is-invalid');
            }

            if (amount > 0) {
                tools.push({
                    id: parseInt(amountInput.dataset.toolId, 10),
                    amount: amount,
                    duration: duration
                });
            }
        });

        if (tools.length === 0 && services.length === 0) {
            toolsList.classList.add('is-invalid');
            servicesList.classList.add('is-invalid');
            isValid = false;
        }

        if (!isValid) {
            alert('Пожалуйста, проверьте введенные данные.');
            return;
        }

        const dealData = {
            tools: tools,
            products: products,
            services: services,
            clientName: clientName,
            clientPhone: clientPhone,
            clientEmail: clientEmail,
            dateTime: dateTime
            // duration: tools.reduce((total, tool) => total + tool.duration * tool.amount, 0) // Возможно, не нужен, так как длительность услуг обрабатывается отдельно
        };

        console.log('Отправка данных сделки:', dealData);

        try {
            const response = await fetch('/createDeal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dealData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Неизвестная ошибка при сохранении сделки');
            }

            const dealModal = bootstrap.Modal.getInstance(dealModalElement);
            if (dealModal) {
                dealModal.hide();
            }
            
            await fetchDealsAndUpdateCells();
            updateWeekDates();

        } catch (error) {
            alert('Ошибка при сохранении сделки: ' + error.message);
        }
    }

    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    function updateWeekDates() {
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + weekOffset * 7);

        const dayOfWeek = baseDate.getDay();
        const daysToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;

        const currentWeekMonday = new Date(baseDate);
        currentWeekMonday.setDate(baseDate.getDate() + daysToMonday);

        displayStartDate = new Date(currentWeekMonday);
        displayStartDate.setDate(displayStartDate.getDate() + dayOffset);
        displayStartDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const date = new Date(displayStartDate);
            date.setDate(displayStartDate.getDate() + i);

            const dateNumber = date.getDate();
            const monthName = months[date.getMonth()];
            const weekdayName = weekdays[date.getDay()];

            const dateElement = document.querySelector(`#day${i} .date`);
            const weekdayElement = document.querySelector(`#day${i} .weekday`);

            if (dateElement && weekdayElement) {
                dateElement.textContent = `${dateNumber} ${monthName}`;
                weekdayElement.textContent = weekdayName;
            }
        }

        generateScheduleGrid();
    }

    function toggleDurationInput(toolItem, show) {
        const durationInput = toolItem.querySelector('.duration-input');
        if (durationInput) {
            if (show) {
                durationInput.classList.add('visible');
            } else {
                durationInput.classList.remove('visible');
                durationInput.value = '1';
            }
        }
    }

    function setupToolsListHandlers() {
        toolsList.addEventListener('input', (event) => {
            const target = event.target;
            if (target.classList.contains('amount-input')) {
                const toolItem = target.closest('.tool-item');
                const amount = parseInt(target.value, 10);
                if (amount > 0) {
                    toggleDurationInput(toolItem, true);
                } else {
                    toggleDurationInput(toolItem, false);
                }
            }
        });
    }

    function formatDuration(minutes) {
        const hours = minutes / 60;
        return hours.toFixed(1);
    }

    document.getElementById('prevWeek').addEventListener('click', debounce(function () {
        weekOffset -= 1;
        dayOffset = 0;
        updateWeekDates();
    }, 100));

    document.getElementById('nextWeek').addEventListener('click', debounce(function () {
        weekOffset += 1;
        dayOffset = 0;
        updateWeekDates();
    }, 100));

    document.getElementById('currentWeek').addEventListener('click', debounce(function () {
        weekOffset = 0;
        dayOffset = 0;
        updateWeekDates();
    }, 100));

    document.getElementById('prevDay').addEventListener('click', debounce(function () {
        dayOffset -= 1;
        updateWeekDates();
    }, 100));

    document.getElementById('nextDay').addEventListener('click', debounce(function () {
        dayOffset += 1;
        updateWeekDates();
    }, 100));

    saveDealButton.addEventListener('click', saveDeal);

    setupToolsListHandlers();
    loadInitialData();
    generateTimeSlots();
    setupCellClickHandler();
    updateWeekDates();
});