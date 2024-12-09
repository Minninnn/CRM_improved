document.addEventListener('DOMContentLoaded', function () {
    const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

    let weekOffset = 0;
    let dayOffset = 0;
    let displayStartDate;

    function updateWeekDates() {
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + weekOffset * 7);

        const dayOfWeek = baseDate.getDay();
        const daysToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;

        const currentWeekMonday = new Date(baseDate);
        currentWeekMonday.setDate(baseDate.getDate() + daysToMonday);

        displayStartDate = new Date(currentWeekMonday);
        displayStartDate.setDate(displayStartDate.getDate() + dayOffset);

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

    function animateButton(button) {
        button.classList.add('button-clicked');
        setTimeout(() => {
            button.classList.remove('button-clicked');
        }, 200);
    }
    function generateTimeSlots() {
        const startTime = 10 * 60;
        const endTime = 20 * 60;
        const step = 30;
        const timeContainerLeft = document.getElementById('time-container-left');
        const timeContainerRight = document.getElementById('time-container-right');

        timeContainerLeft.innerHTML = '';
        timeContainerRight.innerHTML = '';

        for (let minutes = startTime; minutes <= endTime; minutes += step) {
            const timeString = formatTime(minutes);

            const timeElementLeft = document.createElement('div');
            timeElementLeft.classList.add('time-cell');
            timeElementLeft.textContent = timeString;
            timeContainerLeft.appendChild(timeElementLeft);

            const timeElementRight = timeElementLeft.cloneNode(true);
            timeContainerRight.appendChild(timeElementRight);
        }
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

        timeCells.forEach((timeCell, timeIndex) => {
            const row = document.createElement('div');
            row.classList.add('schedule-row');

            const timeString = timeCell.textContent;
            const [hour, minute] = timeString.split(':').map(Number);

            for (let i = 0; i < 7; i++) {
                const cell = document.createElement('div');
                cell.classList.add('schedule-cell');

                const cellDate = new Date(displayStartDate);
                cellDate.setDate(displayStartDate.getDate() + i);
                cellDate.setHours(hour, minute, 0, 0);

                cell.addEventListener('click', function () {
                    openDealModal(cellDate);
                });

                row.appendChild(cell);
            }
            tableContainer.appendChild(row);
        });
    }

    function openDealModal(cellDate) {
        document.getElementById('selectedDateTime').value = cellDate.toISOString();
        var dealModal = new bootstrap.Modal(document.getElementById('dealModal'));
        dealModal.show();
    }

    fetch('/api/tools', { credentials: 'same-origin' })
        .then(response => response.json())
        .then(data => {
            const toolsList = document.getElementById('toolsList');
            toolsList.innerHTML = '';
            data.forEach(tool => {
                const div = document.createElement('div');
                div.classList.add('tool-item', 'mb-2');

                const label = document.createElement('label');
                label.textContent = `${tool.name} (доступно: ${tool.amount})`;

                const amountInput = document.createElement('input');
                amountInput.type = 'number';
                amountInput.min = '0';
                amountInput.max = tool.amount;
                amountInput.value = '0';
                amountInput.dataset.toolId = tool.id;
                amountInput.classList.add('form-control', 'amount-input');
                amountInput.placeholder = 'Количество';

                const durationInput = document.createElement('input');
                durationInput.type = 'number';
                durationInput.min = '1';
                durationInput.value = '1';
                durationInput.dataset.toolId = tool.id;
                durationInput.classList.add('form-control', 'duration-input');
                durationInput.placeholder = 'Продолжительность (часы)';

                div.appendChild(label);
                div.appendChild(amountInput);
                div.appendChild(durationInput);
                toolsList.appendChild(div);
            });
        });

    fetch('/api/products', { credentials: 'same-origin' })
        .then(response => response.json())
        .then(data => {
            const productsList = document.getElementById('productsList');
            productsList.innerHTML = '';
            data.forEach(product => {
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
                input.classList.add('form-control', 'product-amount-input');

                div.appendChild(label);
                div.appendChild(input);
                productsList.appendChild(div);
            });
        });


    fetch('/api/services', { credentials: 'same-origin' })
        .then(response => response.json())
        .then(data => {
            const servicesList = document.getElementById('servicesList');
            servicesList.innerHTML = '';
            data.forEach(service => {
                const div = document.createElement('div');
                div.classList.add('service-item', 'mb-2');

                const label = document.createElement('label');
                label.textContent = `${service.name} (исполнитель: ${service.contractor})`;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.dataset.serviceId = service.id;
                checkbox.dataset.contractor = service.contractor;
                checkbox.classList.add('form-check-input');

                div.appendChild(checkbox);
                div.appendChild(label);
                servicesList.appendChild(div);
            });
        });


    function saveDeal() {
        // Очистка предыдущих стилей валидации
        document.getElementById('clientName').classList.remove('is-invalid');
        document.getElementById('clientPhone').classList.remove('is-invalid');
        document.getElementById('clientEmail').classList.remove('is-invalid');
        document.querySelector('#toolsList').classList.remove('is-invalid');
        document.querySelector('#servicesList').classList.remove('is-invalid');

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
                services.push({
                    id: parseInt(checkbox.dataset.serviceId, 10),
                    contractor: checkbox.dataset.contractor
                });
            }
        });

        const clientName = document.getElementById('clientName').value.trim();
        const clientPhone = document.getElementById('clientPhone').value.trim();
        const clientEmail = document.getElementById('clientEmail').value.trim();
        const dateTime = document.getElementById('selectedDateTime').value;

        const toolItems = document.querySelectorAll('#toolsList .tool-item');
        const tools = [];
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

        // Валидация
        let isValid = true;

        if (clientName === '') {
            document.getElementById('clientName').classList.add('is-invalid');
            isValid = false;
        }

        if (clientEmail === '' && clientPhone === '') {
            document.getElementById('clientEmail').classList.add('is-invalid');
            document.getElementById('clientPhone').classList.add('is-invalid');
            isValid = false;
        }

        if (tools.length === 0 && services.length === 0) {
            document.querySelector('#toolsList').classList.add('is-invalid');
            document.querySelector('#servicesList').classList.add('is-invalid');
            isValid = false;
        }

        if (!isValid) {
            alert('Пожалуйста, проверьте введенные данные. Запрашиваемое количество инструмента не должно превышать доступное.');
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
        };

        fetch('/createDeal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify(dealData)
        })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(text);
                    });
                }
                return response.text();
            })
            .then(data => {
                alert('Сделка успешно создана.');
                var dealModal = bootstrap.Modal.getInstance(document.getElementById('dealModal'));
                dealModal.hide();
            })
            .catch(error => {
                alert('Ошибка при сохранении сделки: ' + error.message);
            });
    }

    document.getElementById('prevWeek').addEventListener('click', function () {
        weekOffset -= 1;
        dayOffset = 0;
        updateWeekDates();
        animateButton(this);
    });

    document.getElementById('nextWeek').addEventListener('click', function () {
        weekOffset += 1;
        dayOffset = 0;
        updateWeekDates();
        animateButton(this);
    });

    document.getElementById('currentWeek').addEventListener('click', function () {
        weekOffset = 0;
        dayOffset = 0;
        updateWeekDates();
        animateButton(this);
    });

    document.getElementById('prevDay').addEventListener('click', function () {
        dayOffset -= 1;
        updateWeekDates();
        animateButton(this);
    });

    document.getElementById('nextDay').addEventListener('click', function () {
        dayOffset += 1;
        updateWeekDates();
        animateButton(this);
    });

    document.getElementById('saveDealButton').addEventListener('click', function () {
        saveDeal();
    });

    generateTimeSlots();
    updateWeekDates();

});
