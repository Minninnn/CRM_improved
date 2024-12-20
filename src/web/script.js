document.addEventListener('DOMContentLoaded', () => {
    // Инициализация модальных окон Bootstrap
    const dealModal = new bootstrap.Modal(document.getElementById('dealModal'));
    const editDealModal = new bootstrap.Modal(document.getElementById('editDealModal'));

    // Массивы с названиями дней недели и месяцев на русском языке
    const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

    // Элементы формы для создания новой сделки
    const toolsList = document.getElementById('toolsList');
    const productsList = document.getElementById('productsList');
    const servicesList = document.getElementById('servicesList');
    const selectedDateTimeInput = document.getElementById('selectedDateTime');
    const dealModalElement = document.getElementById('dealModal');
    const saveDealButton = document.getElementById('saveDealButton');

    // Элементы для редактирования сделки
    const editToolsList = document.getElementById('editToolsList');
    const editProductsList = document.getElementById('editProductsList');
    const editServicesList = document.getElementById('editServicesList');
    const editDealIdInput = document.getElementById('editDealId');
    const editClientName = document.getElementById('editClientName');
    const editClientPhone = document.getElementById('editClientPhone');
    const editClientEmail = document.getElementById('editClientEmail');
    const editDateTimeInput = document.getElementById('editDateTimeInput');
    const updateDealButton = document.getElementById('updateDealButton');

    // Кнопки навигации недель/дней
    const prevWeekButton = document.getElementById('prevWeek');
    const nextWeekButton = document.getElementById('nextWeek');
    const currentWeekButton = document.getElementById('currentWeek');
    const prevDayButton = document.getElementById('prevDay');
    const nextDayButton = document.getElementById('nextDay');

    // Глобальные переменные для смещений
    let weekOffset = 0;
    let dayOffset = 0;
    let displayStartDate = null;

    // Хранилище сделок
    // Ключ: ISO-строка даты/времени, значение: массив сделок
    const dealsMap = new Map();

    // Ссылка на экземпляр AG Grid
    let gridApi;

    //================================================================================
    // 1) Функция для загрузки справочных данных (инструменты, продукты, услуги)
    //================================================================================
    const fetchData = async (url) => {
        try {
            const response = await fetch(url, { credentials: 'same-origin' });
            if (!response.ok) {
                throw new Error(`Ошибка сети: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Ошибка при загрузке данных: ${error}`);
            throw error;
        }
    };

    const loadInitialData = async () => {
        try {
            const [tools, products, services] = await Promise.all([
                fetchData('/api/tools'),
                fetchData('/api/products'),
                fetchData('/api/services')
            ]);
            // Заполняем списки для модальных окон
            populateToolsList(tools);
            populateProductsList(products);
            populateServicesList(services);
            populateEditToolsList(tools);
            populateEditProductsList(products);
            populateEditServicesList(services);
        } catch (error) {
            alert('Ошибка при загрузке данных. Пожалуйста, попробуйте позже.');
        }
    };

    //================================================================================
    // 2) Заполнение списков инструментов, продуктов, услуг
    //================================================================================
    function populateToolsList(tools) {
        if (!toolsList) return;
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

            // Длительность
            const durationContainer = document.createElement('div');
            durationContainer.classList.add('d-flex', 'align-items-center', 'mt-2');

            const durationInput = document.createElement('input');
            durationInput.type = 'number';
            durationInput.min = '30';
            durationInput.step = '30';
            durationInput.value = '30';
            durationInput.dataset.toolId = tool.id;
            durationInput.classList.add('form-control', 'duration-input');
            durationInput.title = 'Минимальная продолжительность: 30 минут';

            const durationDisplay = document.createElement('span');
            durationDisplay.classList.add('ms-2', 'duration-display');
            durationDisplay.textContent = '0.5 ч';

            durationInput.addEventListener('input', (event) => {
                const minutes = parseInt(event.target.value, 10);
                durationDisplay.textContent = (minutes >= 30 ? (minutes / 60).toFixed(1) : 0.5) + ' ч';
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
        if (!productsList) return;
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

    function populateServicesList(services) {
        if (!servicesList) return;
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

            const durationContainer = document.createElement('div');
            durationContainer.classList.add('d-flex', 'align-items-center', 'mt-1');
            durationContainer.style.display = 'none';

            const durationInput = document.createElement('input');
            durationInput.type = 'number';
            durationInput.min = '30';
            durationInput.step = '30';
            durationInput.value = '30';
            durationInput.dataset.serviceId = service.id;
            durationInput.classList.add('form-control', 'edit-service-duration-input', 'me-2');

            const durationDisplay = document.createElement('span');
            durationDisplay.classList.add('duration-display');
            durationDisplay.textContent = '0.5 ч';

            checkbox.addEventListener('change', (event) => {
                if (event.target.checked) {
                    durationContainer.style.display = 'flex';
                } else {
                    durationContainer.style.display = 'none';
                    durationInput.value = '30';
                    durationDisplay.textContent = '0.5 ч';
                }
            });

            durationInput.addEventListener('input', (event) => {
                const minutes = parseInt(event.target.value, 10);
                durationDisplay.textContent = (minutes >= 30 ? (minutes / 60).toFixed(1) : 0.5) + ' ч';
            });

            durationContainer.appendChild(durationInput);
            durationContainer.appendChild(durationDisplay);

            div.appendChild(checkbox);
            div.appendChild(label);
            div.appendChild(durationContainer);
            fragment.appendChild(div);
        });
        servicesList.appendChild(fragment);
    }

    // Аналогичные функции для списков в окне редактирования
    function populateEditToolsList(tools) {
        if (!editToolsList) return;
        editToolsList.innerHTML = '';
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
            amountInput.classList.add('form-control', 'edit-amount-input', 'mt-1');

            // Длительность
            const durationContainer = document.createElement('div');
            durationContainer.classList.add('d-flex', 'align-items-center', 'mt-2');

            const durationInput = document.createElement('input');
            durationInput.type = 'number';
            durationInput.min = '30';
            durationInput.step = '30';
            durationInput.value = '30';
            durationInput.dataset.toolId = tool.id;
            durationInput.classList.add('form-control', 'edit-duration-input');

            const durationDisplay = document.createElement('span');
            durationDisplay.classList.add('ms-2', 'duration-display');
            durationDisplay.textContent = '0.5 ч';

            durationInput.addEventListener('input', (event) => {
                const minutes = parseInt(event.target.value, 10);
                durationDisplay.textContent = (minutes >= 30 ? (minutes / 60).toFixed(1) : 0.5) + ' ч';
            });

            durationContainer.appendChild(durationInput);
            durationContainer.appendChild(durationDisplay);

            div.appendChild(label);
            div.appendChild(amountInput);
            div.appendChild(durationContainer);
            fragment.appendChild(div);
        });
        editToolsList.appendChild(fragment);
    }

    function populateEditProductsList(products) {
        if (!editProductsList) return;
        editProductsList.innerHTML = '';
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
            input.classList.add('form-control', 'edit-product-amount-input', 'mt-1');

            div.appendChild(label);
            div.appendChild(input);
            fragment.appendChild(div);
        });
        editProductsList.appendChild(fragment);
    }

    function populateEditServicesList(services) {
        if (!editServicesList) return;
        editServicesList.innerHTML = '';
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

            const durationContainer = document.createElement('div');
            durationContainer.classList.add('d-flex', 'align-items-center', 'mt-1');
            durationContainer.style.display = 'none';

            const durationInput = document.createElement('input');
            durationInput.type = 'number';
            durationInput.min = '30';
            durationInput.step = '30';
            durationInput.value = '30';
            durationInput.dataset.serviceId = service.id;
            durationInput.classList.add('form-control', 'edit-service-duration-input', 'me-2');

            const durationDisplay = document.createElement('span');
            durationDisplay.classList.add('duration-display');
            durationDisplay.textContent = '0.5 ч';

            checkbox.addEventListener('change', (event) => {
                if (event.target.checked) {
                    durationContainer.style.display = 'flex';
                } else {
                    durationContainer.style.display = 'none';
                    durationInput.value = '30';
                    durationDisplay.textContent = '0.5 ч';
                }
            });

            durationInput.addEventListener('input', (event) => {
                const minutes = parseInt(event.target.value, 10);
                durationDisplay.textContent = (minutes >= 30 ? (minutes / 60).toFixed(1) : 0.5) + ' ч';
            });

            durationContainer.appendChild(durationInput);
            durationContainer.appendChild(durationDisplay);

            div.appendChild(checkbox);
            div.appendChild(label);
            div.appendChild(durationContainer);
            fragment.appendChild(div);
        });
        editServicesList.appendChild(fragment);
    }

    //================================================================================
    // 3) Логика AG Grid (создание столбцов, строк и рендер сделок)
    //================================================================================
    // Генерируем список 30-минутных интервалов с 10:00 до 20:00
    function generateTimeSlots() {
        const slots = [];
        let start = 10 * 60; // 10:00 in minutes
        const end = 20 * 60;  // 20:00 in minutes
        while (start <= end) {
            slots.push(start);
            start += 30;
        }
        return slots;
    }

    function formatTime(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
    }

    // Формируем колонки для всех дней (7 шт. + колонка Time)
    const columnDefs = [
        {
            headerName: 'Время',
            field: 'time',
            width: 90,
        },
        {
            headerName: 'День 1',
            field: 'day0',
            cellRenderer: 'dealsCellRenderer',
            flex: 1
        },
        {
            headerName: 'День 2',
            field: 'day1',
            cellRenderer: 'dealsCellRenderer',
            flex: 1
        },
        {
            headerName: 'День 3',
            field: 'day2',
            cellRenderer: 'dealsCellRenderer',
            flex: 1
        },
        {
            headerName: 'День 4',
            field: 'day3',
            cellRenderer: 'dealsCellRenderer',
            flex: 1
        },
        {
            headerName: 'День 5',
            field: 'day4',
            cellRenderer: 'dealsCellRenderer',
            flex: 1
        },
        {
            headerName: 'День 6',
            field: 'day5',
            cellRenderer: 'dealsCellRenderer',
            flex: 1
        },
        {
            headerName: 'День 7',
            field: 'day6',
            cellRenderer: 'dealsCellRenderer',
            flex: 1
        }
    ];

    // Ячеечный рендерер для отображения сделок.
    class DealsCellRenderer {
        init(params) {
            this.params = params;
            this.eGui = document.createElement('div');
            this.eGui.style.position = 'relative';
            this.renderCell();
        }

        renderCell() {
            const cellValue = this.params.value; // Массив сделок или undefined
            this.eGui.innerHTML = '';

            // Кнопка "Добавить"
            const addButton = document.createElement('button');
            addButton.classList.add('btn', 'btn-success', 'btn-sm');
            addButton.textContent = 'Добавить';
            addButton.style.margin = '2px';
            addButton.addEventListener('click', (e) => {
                e.stopPropagation();
                // При клике — открываем модальное окно для создания сделки
                const rowTime = this.params.data.timeInMinutes;
                const dayIndex = Number(this.params.colDef.field.replace('day', ''));
                const cellDate = getCellDateTime(rowTime, dayIndex);
                openDealModal(cellDate);
            });

            // Если есть сделки, выводим их
            if (cellValue && Array.isArray(cellValue) && cellValue.length > 0) {
                cellValue.forEach(deal => {
                    const dealDiv = document.createElement('div');
                    dealDiv.classList.add('badge', 'bg-info', '-dark', 'd-block', 'mb-1');
                    const durationHours = deal.duration ? (deal.duration / 60).toFixed(1) : '0.5';
                    dealDiv.textContent = `${deal.clientName} - ${durationHours} ч`;
                    dealDiv.addEventListener('click', (event) => {
                        event.stopPropagation();
                        // Открыть модальное окно редактирования
                        openEditDealModal(deal.id);
                    });
                    this.eGui.appendChild(dealDiv);
                });
            }

            // Добавляем кнопку
            this.eGui.appendChild(addButton);
        }

        getGui() {
            return this.eGui;
        }

        refresh(params) {
            this.params = params;
            this.renderCell();
            return true;
        }
    }

    //================================================================================
    // 4) Генерация rowData для AG Grid
    //================================================================================
    function buildRowData() {
        const timeslots = generateTimeSlots();
        return timeslots.map(totalMinutes => {
            const row = {
                time: formatTime(totalMinutes),
                timeInMinutes: totalMinutes
            };
            for (let i = 0; i < 7; i++) {
                const isoStr = getCellDateTimeISO(totalMinutes, i);
                const dealsInCell = dealsMap.get(isoStr) || [];
                row['day' + i] = dealsInCell;
            }
            return row;
        });
    }

    function getCellDateTimeISO(minutes, dayIndex) {
        const cellDate = new Date(displayStartDate);
        cellDate.setDate(cellDate.getDate() + dayIndex);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        cellDate.setHours(hours, mins, 0, 0);
        return cellDate.toISOString();
    }

    function getCellDateTime(minutes, dayIndex) {
        const iso = getCellDateTimeISO(minutes, dayIndex);
        return new Date(iso);
    }

    //================================================================================
    // 5) Инициализация самой AG Grid
    //================================================================================
    function initAGGrid() {
        const gridOptions = {
            columnDefs: columnDefs,
            rowData: [],
            defaultColDef: {
            resizable: true,
            },
            components: {
                dealsCellRenderer: DealsCellRenderer
            },
            domLayout: 'autoHeight',
            onFirstDataRendered: (params) => {
                params.api.sizeColumnsToFit();
            },
        };
        const eGridDiv = document.getElementById('scheduleGrid');
        if (!eGridDiv) {
            console.error('Не найден контейнер #scheduleGrid для инициализации AG Grid');
            return;
        }
        gridApi = new agGrid.Grid(eGridDiv, gridOptions);
    }

    function updateGridData() {
        if (!gridApi) return;
        const rowData = buildRowData();
        gridApi.gridOptions.api.setRowData(rowData);
        updateWeekDaysHeader();
    }

    //================================================================================
    // 6) Загрузка сделок с сервера и заполнение dealsMap
    //================================================================================
    async function fetchDeals() {
        const startDateStr = displayStartDate.toISOString();
        const endDate = new Date(displayStartDate);
        endDate.setDate(endDate.getDate() + 7);
        const endDateStr = endDate.toISOString();

        try {
            const data = await fetchData(
                `/api/deals?start_date=${encodeURIComponent(startDateStr)}&end_date=${encodeURIComponent(endDateStr)}`
            );
            dealsMap.clear();
            data.forEach(deal => {
                const scheduledDateTime = new Date(deal.scheduled_date).toISOString();
                if (!dealsMap.has(scheduledDateTime)) {
                    dealsMap.set(scheduledDateTime, []);
                }
                dealsMap.get(scheduledDateTime).push(deal);
            });
            updateGridData();
        } catch (error) {
            console.error('Ошибка при загрузке сделок:', error);
        }
    }

    //================================================================================
    // 7) Логика переключения недель/дней и отображения дат
    //================================================================================
    function updateWeekDates() {
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + weekOffset * 7);
        const dayOfWeek = baseDate.getDay();
        // Считаем, сколько дней до понедельника
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
    }

    function updateWeekDaysHeader() {
        const columnDefsNew = gridApi.gridOptions.columnDefs;
        for (let i = 0; i < 7; i++) {
            const date = new Date(displayStartDate);
            date.setDate(displayStartDate.getDate() + i);
            const dayStr = `${date.getDate()} ${months[date.getMonth()]} (${weekdays[date.getDay()]})`;
            columnDefsNew[i + 1].headerName = dayStr;
        }
        gridApi.gridOptions.api.setColumnDefs(columnDefsNew);
    }

    function setupNavigationButtons() {
        if (prevWeekButton) {
            prevWeekButton.addEventListener('click', debounce(() => {
                weekOffset -= 1;
                dayOffset = 0;
                refreshSchedule();
            }, 100));
        }
        if (nextWeekButton) {
            nextWeekButton.addEventListener('click', debounce(() => {
                weekOffset += 1;
                dayOffset = 0;
                refreshSchedule();
            }, 100));
        }
        if (currentWeekButton) {
            currentWeekButton.addEventListener('click', debounce(() => {
                weekOffset = 0;
                dayOffset = 0;
                refreshSchedule();
            }, 100));
        }
        if (prevDayButton) {
            prevDayButton.addEventListener('click', debounce(() => {
                dayOffset -= 1;
                refreshSchedule();
            }, 100));
        }
        if (nextDayButton) {
            nextDayButton.addEventListener('click', debounce(() => {
                dayOffset += 1;
                refreshSchedule();
            }, 100));
        }
    }

    function refreshSchedule() {
        updateWeekDates();
        fetchDeals();
    }

    //================================================================================
    // 8) Функции создания и обновления сделок
    //================================================================================
    async function saveDeal() {
        if (!dealModalElement) return;

        // Сброс ошибок валидации
        ['clientName', 'clientPhone', 'clientEmail'].forEach(id => {
            const el = dealModalElement.querySelector(`#${id}`);
            if (el) el.classList.remove('is-invalid');
        });
        if (toolsList) toolsList.classList.remove('is-invalid');
        if (servicesList) servicesList.classList.remove('is-invalid');

        let isValid = true;

        const clientNameElement = dealModalElement.querySelector('#clientName');
        const clientPhoneElement = dealModalElement.querySelector('#clientPhone');
        const clientEmailElement = dealModalElement.querySelector('#clientEmail');
        const dateTimeElement = dealModalElement.querySelector('#selectedDateTime');

        if (!clientNameElement || !clientPhoneElement || !clientEmailElement || !dateTimeElement) {
            alert('Внутренняя ошибка формы сделки.');
            return;
        }

        const clientName = clientNameElement.value.trim();
        const clientPhone = clientPhoneElement.value.trim();
        const clientEmail = clientEmailElement.value.trim();
        const dateTime = dateTimeElement.value;

        // Валидация
        if (clientName === '') {
            clientNameElement.classList.add('is-invalid');
            isValid = false;
        }
        if (clientEmail === '' && clientPhone === '') {
            clientEmailElement.classList.add('is-invalid');
            clientPhoneElement.classList.add('is-invalid');
            isValid = false;
        }

        // Сбор данных продуктов
        const products = [];
        dealModalElement.querySelectorAll('#productsList .product-item').forEach(item => {
            const input = item.querySelector('.product-amount-input');
            if (input) {
                const amount = parseInt(input.value, 10);
                if (amount > 0) {
                    products.push({
                        id: parseInt(input.dataset.productId, 10),
                        amount: amount
                    });
                }
            }
        });

        // Сбор данных услуг
        const services = [];
        dealModalElement.querySelectorAll('#servicesList .service-item').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
                const durationInput = item.querySelector('.edit-service-duration-input');
                const duration = parseInt(durationInput.value, 10);
                if (isNaN(duration) || duration < 30) {
                    durationInput.classList.add('is-invalid');
                    isValid = false;
                }
                services.push({
                    id: parseInt(checkbox.dataset.serviceId, 10),
                    contractor: checkbox.dataset.contractor,
                    duration: duration
                });
            }
        });

        // Сбор данных инструментов
        const tools = [];
        dealModalElement.querySelectorAll('#toolsList .tool-item').forEach(item => {
            const amountInput = item.querySelector('.amount-input');
            const durationInput = item.querySelector('.duration-input');
            if (amountInput && durationInput) {
                const availableAmount = parseInt(amountInput.dataset.availableAmount, 10);
                const amount = parseInt(amountInput.value, 10);
                const duration = parseInt(durationInput.value, 10);

                if (amount > availableAmount) {
                    amountInput.classList.add('is-invalid');
                    isValid = false;
                }

                if (amount > 0) {
                    tools.push({
                        id: parseInt(amountInput.dataset.toolId, 10),
                        amount: amount,
                        duration: duration
                    });
                }
            }
        });

        if (tools.length === 0 && services.length === 0) {
            if (toolsList) toolsList.classList.add('is-invalid');
            if (servicesList) servicesList.classList.add('is-invalid');
            isValid = false;
        }

        if (!isValid) {
            alert('Проверьте введённые данные.');
            return;
        }

        // Данные сделки
        const dealData = {
            tools,
            products,
            services,
            clientName,
            clientPhone,
            clientEmail,
            dateTime
        };

        try {
            const response = await fetch('/createDeal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dealData)
            });
            if (!response.ok) {
                throw new Error(await response.text() || 'Неизвестная ошибка при сохранении');
            }
            dealModal.hide();
            await fetchDeals();
        } catch (error) {
            alert('Ошибка при сохранении сделки: ' + error.message);
        }
    }

    async function updateDeal() {
        const dealId = editDealIdInput.value;
        const clientNameVal = editClientName.value.trim();
        const clientPhoneVal = editClientPhone.value.trim();
        const clientEmailVal = editClientEmail.value.trim();
        const dateTimeVal = editDateTimeInput ? editDateTimeInput.value : '';

        const tools = Array.from(document.querySelectorAll('#editToolsList .edit-amount-input'))
            .map(input => {
                const amount = parseInt(input.value, 10);
                if (amount > 0) {
                    const durationInput = input.closest('.tool-item').querySelector('.edit-duration-input');
                    const duration = parseInt(durationInput.value, 10);
                    return {
                        id: parseInt(input.dataset.toolId, 10),
                        amount,
                        duration
                    };
                }
                return null;
            }).filter(Boolean);

        const products = Array.from(document.querySelectorAll('#editProductsList .edit-product-amount-input'))
            .map(input => {
                const amount = parseInt(input.value, 10);
                if (amount > 0) {
                    return {
                        id: parseInt(input.dataset.productId, 10),
                        amount
                    };
                }
                return null;
            }).filter(Boolean);

        const services = Array.from(document.querySelectorAll('#editServicesList .service-item'))
            .map(item => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox && checkbox.checked) {
                    const durationInput = item.querySelector('.edit-service-duration-input');
                    const duration = parseInt(durationInput.value, 10);
                    return {
                        id: parseInt(checkbox.dataset.serviceId, 10),
                        contractor: checkbox.dataset.contractor,
                        duration
                    };
                }
                return null;
            }).filter(Boolean);

        let isValid = true;

        // Валидация
        if (clientNameVal === '') {
            editClientName.classList.add('is-invalid');
            isValid = false;
        } else {
            editClientName.classList.remove('is-invalid');
        }

        if (clientEmailVal === '' && clientPhoneVal === '') {
            editClientEmail.classList.add('is-invalid');
            editClientPhone.classList.add('is-invalid');
            isValid = false;
        } else {
            editClientEmail.classList.remove('is-invalid');
            editClientPhone.classList.remove('is-invalid');
        }

        if (tools.length === 0 && services.length === 0) {
            alert('Выберите хотя бы один инструмент или услугу.');
            isValid = false;
        }

        services.forEach(s => {
            if (!s.duration || s.duration < 30) isValid = false;
        });
        tools.forEach(t => {
            if (!t.duration || t.duration < 30) isValid = false;
        });

        if (!isValid) {
            alert('Проверьте введённые данные.');
            return;
        }

        const updatedDealData = {
            id: dealId,
            clientName: clientNameVal,
            clientPhone: clientPhoneVal,
            clientEmail: clientEmailVal,
            tools,
            products,
            services,
            dateTime: dateTimeVal
        };

        try {
            const response = await fetch('/api/update-deal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedDealData)
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            console.log('Сделка успешно обновлена.');
            editDealModal.hide();
            await fetchDeals();
        } catch (error) {
            console.error('Ошибка обновления сделки:', error);
            alert('Ошибка при обновлении сделки: ' + error.message);
        }
    }

    //================================================================================
    // 9) Открытие модальных окон
    //================================================================================
    function openDealModal(cellDate) {
        selectedDateTimeInput.value = cellDate.toISOString();
        dealModal.show();
    }

    function openEditDealModal(dealId) {
        fetch(`/api/get-deal/${dealId}`)
            .then(resp => {
                if (!resp.ok) throw new Error(`Ошибка загрузки сделки: ${resp.status}`);
                return resp.json();
            })
            .then(dealData => {
                populateEditModal(dealData);
            })
            .catch(err => {
                console.error(err);
                alert('Не удалось загрузить данные сделки');
            });
    }

    function populateEditModal(dealData) {
        if (!dealData) {
            alert('Пустые данные сделки для редактирования');
            return;
        }

        editClientName.value = dealData.clientName || '';
        editClientPhone.value = dealData.clientPhone || '';
        editClientEmail.value = dealData.clientEmail || '';
        editDealIdInput.value = dealData.id || '';

        if (editDateTimeInput) {
            const scheduledDateTime = new Date(dealData.scheduled_date);
            const offset = scheduledDateTime.getTimezoneOffset();
            const localDateTime = new Date(scheduledDateTime.getTime() - offset * 60000);
            editDateTimeInput.value = localDateTime.toISOString().slice(0, 16);
        }

        // Сбрасываем значения
        document.querySelectorAll('#editToolsList .edit-amount-input').forEach(input => {
            input.value = '0';
            const durInput = input.closest('.tool-item').querySelector('.edit-duration-input');
            durInput.value = '30';
            const durDisp = input.closest('.tool-item').querySelector('.duration-display');
            if (durDisp) durDisp.textContent = '0.5 ч';
        });

        document.querySelectorAll('#editProductsList .edit-product-amount-input').forEach(input => {
            input.value = '0';
        });

        document.querySelectorAll('#editServicesList .service-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
            const durCont = checkbox.closest('.service-item').querySelector('.d-flex');
            durCont.style.display = 'none';
            const durInput = durCont.querySelector('.edit-service-duration-input');
            durInput.value = '30';
            durCont.querySelector('.duration-display').textContent = '0.5 ч';
        });

        // Заполняем текущие данные сделки
        if (dealData.tools) {
            dealData.tools.forEach(tool => {
                const amountInput = document.querySelector(
                    `#editToolsList .edit-amount-input[data-tool-id="${tool.id}"]`
                );
                if (amountInput) {
                    amountInput.value = tool.amount;
                    const durInput = amountInput.closest('.tool-item').querySelector('.edit-duration-input');
                    durInput.value = tool.duration || '30';
                    const durDisp = amountInput.closest('.tool-item').querySelector('.duration-display');
                    durDisp.textContent = (tool.duration ? (tool.duration / 60).toFixed(1) : '0.5') + ' ч';
                }
            });
        }

        if (dealData.products) {
            dealData.products.forEach(product => {
                const productInput = document.querySelector(
                    `#editProductsList .edit-product-amount-input[data-product-id="${product.id}"]`
                );
                if (productInput) {
                    productInput.value = product.amount;
                }
            });
        }

        if (dealData.services) {
            dealData.services.forEach(service => {
                const serviceCheckbox = document.querySelector(
                    `#editServicesList .service-item input[type="checkbox"][data-service-id="${service.id}"]`
                );
                if (serviceCheckbox) {
                    serviceCheckbox.checked = true;
                    const durCont = serviceCheckbox.closest('.service-item').querySelector('.d-flex');
                    durCont.style.display = 'flex';
                    const durInput = durCont.querySelector('.edit-service-duration-input');
                    durInput.value = service.duration || '30';
                    durCont.querySelector('.duration-display').textContent = (service.duration ? (service.duration / 60).toFixed(1) : '0.5') + ' ч';
                }
            });
        }

        editDealModal.show();
    }

    //================================================================================
    // 10) Вспомогательная функция debounce
    //================================================================================
    function debounce(func, delay) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }

    //================================================================================
    // Инициализация при загрузке
    //================================================================================
    loadInitialData();     // Загрузить инструменты/продукты/услуги
    initAGGrid();          // Инициализировать Grid
    setupNavigationButtons();
    updateWeekDates();     // Расчитать неделю
    fetchDeals();          // Загрузить сделки и отобразить

    // Сохранение сделки
    if (saveDealButton) {
        saveDealButton.addEventListener('click', saveDeal);
    }

    // Обновление сделки
    if (updateDealButton) {
        updateDealButton.addEventListener('click', updateDeal);
    }
});