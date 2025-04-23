const tg = window.Telegram.WebApp;
    tg.ready(); // Сообщаем Telegram, что приложение готово

    const determineButton = document.getElementById('determine_button');
    const resultsDiv = document.getElementById('results');
    const winnersListUl = document.getElementById('winners_list');
    const errorMessageDiv = document.getElementById('error_message');
    const loadingDiv = document.getElementById('loading');
    const totalParticipantsP = document.getElementById('total_participants');

    const postUrlInput = document.getElementById('post_url');
    const contestNameInput = document.getElementById('contest_name');
    const criteriaLikesCheckbox = document.getElementById('criteria_likes');
    const criteriaRepostsCheckbox = document.getElementById('criteria_reposts');
    const criteriaCommentsCheckbox = document.getElementById('criteria_comments');
    const requiredGroupsTextarea = document.getElementById('required_groups');
    const checkOwnGroupCheckbox = document.getElementById('check_own_group');
    const numWinnersInput = document.getElementById('num_winners');

   

    // --- Глобальная переменная для хранения данных последнего запроса ---
    let lastContestRequestData = null;
    let currentWinnersData = []; // Для хранения данных текущих победителей

    determineButton.addEventListener('click', handleDetermineWinners);

    async function handleDetermineWinners() {
        clearResults();
        showLoading(true);

        // --- Сбор данных из формы ---
        const postUrl = postUrlInput.value;
        const raffleName = contestNameInput.value || null; // optional
        const criteria = {
            likes: criteriaLikesCheckbox.checked,
            reposts: criteriaRepostsCheckbox.checked,
            comments: criteriaCommentsCheckbox.checked,
        };
        const requiredGroupsRaw = requiredGroupsTextarea.value.trim();
        const requiredGroups = requiredGroupsRaw ? requiredGroupsRaw.split(',').map(url => url.trim()).filter(url => url) : [];
        const checkOwnGroup = checkOwnGroupCheckbox.checked;
        const countWinners = parseInt(numWinnersInput.value, 10);

        // --- Валидация базовых данных ---
        if (!postUrl || !isValidHttpUrl(postUrl)) {
            showError("Пожалуйста, введите корректную ссылку на пост.");
            showLoading(false);
            return;
        }
        if (!criteria.likes && !criteria.reposts && !criteria.comments) {
             showError("Пожалуйста, выберите хотя бы один критерий (лайки, репосты или комментарии).");
             showLoading(false);
             return;
        }
     
         
        if (isNaN(countWinners) || countWinners < 1) {
            showError("Пожалуйста, введите корректное количество победителей (минимум 1).");
            showLoading(false);
            return;
        }

        // --- Сохраняем данные запроса ---
        RaffleRequest = {
            post_url: postUrl,
            raffle_name: raffleName,
            criteria: criteria,
            required_groups: requiredGroups,
            check_own_group: checkOwnGroup,
            count_winners: countWinners
        };
        console.log("Данные запроса:", RaffleRequest);

        try {
             // !!! Укажи URL твоего РАЗВЕРНУТОГО FastAPI бэкенда !!!
            // const backendUrl = 'http://localhost:8000';  ЗАМЕНИТЬ НА РЕАЛЬНЫЙ URL ПОСЛЕ ДЕПЛОЯ!

            // БЛЯТЬ ЗАПОМНИ ЧТО /api/ -> backend:8000 Для nginx в докере  именно со слешами
            const response = await fetch(`/api/get_winners`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(RaffleRequest), // Используем сохраненные данные
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Ошибка сервера: ${response.status}`);
            }

            const data = await response.json();
            console.log("Полученные данные:", data);
            displayResults(data.winners, data.msg);

        } catch (error) {
            console.error("Ошибка при определении победителей:", error);
            showError(`Ошибка: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }

    async function handleRerollWinner(winnerToRerollId) {
         if (!lastContestRequestData || !currentWinnersData.length) {
             showError("Нет данных предыдущего розыгрыша для перевыбора.");
             return;
         }
         showLoading(true);
         clearResults(false); // Не очищаем полностью, только список

         const rerollRequestData = {
            contest_data: lastContestRequestData,
            current_winners: currentWinnersData, // Передаем текущих победителей
            winner_to_reroll_id: winnerToRerollId
         }

          try {
             // !!! Укажи URL твоего РАЗВЕРНУТОГО FastAPI бэкенда !!!
            //  const backendUrl = 'http://localhost:8000'; // ЗАМЕНИТЬ!
             const response = await fetch(`/api/reroll_winner`, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                 },
                 body: JSON.stringify(rerollRequestData),
             });

             if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.detail || `Ошибка сервера: ${response.status}`);
             }

             const RaffleResponse = await response.json();
             // Отображаем обновленный список
             displayResults(data.winners, RaffleResponse.msg);

         } catch (error) {
             console.error("Ошибка при перевыборе победителя:", error);
             showError(`Ошибка перевыбора: ${error.message}`);
             // Можно вернуть старый список или оставить сообщение об ошибке
             // displayResults(currentWinnersData, lastContestRequestData.num_winners); // Показать старый список
         } finally {
             showLoading(false);
         }
    }

    function displayResults(winners, msg) {
        currentWinnersData = winners; // Обновляем глобальные данные
        winnersListUl.innerHTML = ''; // Очищаем предыдущий список

         if (winners && winners.length > 0) {
             totalParticipantsP.textContent = `${msg}`;
             winners.forEach(winner => {
                const li = document.createElement('li');
                li.innerHTML = `<div class="winner">
                                    <a href="${winner.profile_url}" target="_blank">
                                    ${winner.first_name} ${winner.last_name}
                                    </a>
                                    <button class="reroll-button" 
                                            data-userid="${winner.user_id}">
                                        Перевыбрать
                                    </button>
                                </div>`

                    // Добавляем обработчик на кнопку "Перевыбрать"
                    li.querySelector('.reroll-button').addEventListener('click', () => {
                    handleRerollWinner(winner.user_id);
                    });
                    winnersListUl.appendChild(li);
                });
             } else {
                  totalParticipantsP.textContent = `Всего участников, выполнивших условия: 0`;
                 winnersListUl.innerHTML = '<li>Победители не найдены (возможно, никто не выполнил условия).</li>';
             }
            resultsDiv.style.display = 'block';
            errorMessageDiv.textContent = ''; // Очищаем ошибки
        }
    
        function clearResults(clearTotal = true) {
            winnersListUl.innerHTML = '';
            resultsDiv.style.display = 'none';
            errorMessageDiv.textContent = '';
            if(clearTotal) {
                totalParticipantsP.textContent = '';
                lastContestRequestData = null; // Сбрасываем данные при полном сбросе
                currentWinnersData = [];
            }
        }
    
        function showError(message) {
            errorMessageDiv.textContent = message;
            resultsDiv.style.display = 'block'; // Показываем блок результатов, чтобы было видно ошибку
        }
    
        function showLoading(isLoading) {
            loadingDiv.style.display = isLoading ? 'block' : 'none';
            determineButton.disabled = isLoading; // Блокируем кнопку во время загрузки
            // Можно блокировать и другие элементы формы
        }
    
        // Простая проверка URL (можно улучшить)
        function isValidHttpUrl(string) {
          let url;
          try {
            url = new URL(string);
          } catch (_) {
            return false;
          }
          return url.protocol === "http:" || url.protocol === "https:";
        }
    
        // Пример использования цвета из темы Telegram (можно применять к элементам)
        document.body.style.backgroundColor = tg.themeParams.bg_color || '#ffffff';
        document.body.style.color = tg.themeParams.text_color || '#000000';
        determineButton.style.backgroundColor = tg.themeParams.button_color || '#007bff';
        determineButton.style.color = tg.themeParams.button_text_color || '#ffffff';
    
        