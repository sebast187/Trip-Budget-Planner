// js/planner-controller.js
document.addEventListener('DOMContentLoaded', () => {
    const totalBudgetInput = document.getElementById('total-budget');
    const moneyRemainingDisplay = document.getElementById('money-remaining');
    const overUnderBudgetDisplay = document.getElementById('over-under-budget');
    const tripDaysBody = document.getElementById('trip-days-body');
    const tripTitleElement = document.getElementById('trip-title');
    const containerDiv = document.querySelector('.container');

    let daysData = [];
    let currentTripId = null;
    let currentUserUID = null;
    let dbStartDate, dbEndDate;

    function formatDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function initializeDays() {
        tripDaysBody.innerHTML = '';
        daysData = [];

        if (!dbStartDate || !dbEndDate) {
            console.error("Start or End date not loaded for trip.");
            tripTitleElement.textContent = "Error: Trip dates not found ✈️";
            return;
        }

        let currentDate = new Date(dbStartDate);
        currentDate.setHours(0, 0, 0, 0);
        const loopEndDate = new Date(dbEndDate);
        loopEndDate.setHours(0, 0, 0, 0);

        let dayIndex = 0;
        while (currentDate <= loopEndDate) {
            const tr = document.createElement('tr');
            tr.style.opacity = 0;

            const dateTd = document.createElement('td');
            dateTd.textContent = formatDate(currentDate);
            dateTd.classList.add('date-cell');

            const expenseTd = document.createElement('td');
            expenseTd.classList.add('expenses-cell');
            const expenseInput = document.createElement('input');
            expenseInput.type = 'number';
            expenseInput.min = '0';
            expenseInput.placeholder = '0.00';
            expenseInput.dataset.dayIndex = dayIndex;
            expenseInput.addEventListener('input', () => {
                updateCalculations(); // This will re-calculate and re-style
                saveDataToFirebase(); // This saves the actual input value
            });
            expenseTd.appendChild(expenseInput);

            const dailyBudgetTd = document.createElement('td');
            dailyBudgetTd.classList.add('daily-budget-cell'); // Base class for default blue
            dailyBudgetTd.textContent = '0.00';

            tr.appendChild(dateTd);
            tr.appendChild(expenseTd);
            tr.appendChild(dailyBudgetTd);
            tripDaysBody.appendChild(tr);

            daysData.push({
                expenseInput: expenseInput,
                dailyBudgetElement: dailyBudgetTd,
                rowElement: tr
            });

            currentDate.setDate(currentDate.getDate() + 1);
            dayIndex++;
        }

        daysData.forEach((day, index) => {
            setTimeout(() => {
                day.rowElement.style.transition = 'opacity 0.5s ease-out';
                day.rowElement.style.opacity = 1;
            }, index * 30);
        });
    }

    function updateCalculations() {
        const totalBudget = parseFloat(totalBudgetInput.value) || 0;
        const numberOfDays = daysData.length;

        if (numberOfDays === 0) {
            moneyRemainingDisplay.textContent = totalBudget.toFixed(2);
            overUnderBudgetDisplay.textContent = "0.00";
            overUnderBudgetDisplay.classList.remove('over-budget', 'under-budget');
            overUnderBudgetDisplay.title = "No days in trip.";
            return;
        }

        const dailyBudgetAllowance = numberOfDays > 0 ? (totalBudget / numberOfDays) : 0;
        let totalExpenses = 0; // This will sum all actual expenses for "Money Remaining"
        let cumulativeBudgetDifference = 0; // For "Budget Status", only for days with spending > 0

        daysData.forEach(day => {
            const expenseValue = parseFloat(day.expenseInput.value) || 0; // If input is blank or "0", this is 0
            const expenseInputString = day.expenseInput.value.trim();

            totalExpenses += expenseValue; // Accumulate all for money remaining

            const dayAllotmentCell = day.dailyBudgetElement;
            // Reset specific styling classes
            dayAllotmentCell.classList.remove('daily-over-budget', 'daily-under-budget', 'daily-on-budget');
            // We don't need to reset inline style.color/fontWeight if base .daily-budget-cell handles blue

            // Logic for the "Daily Allotment ($)" cell display and color
            if (expenseValue > 0) { // If there's actual spending for the day
                const remainingForDay = dailyBudgetAllowance - expenseValue;
                dayAllotmentCell.textContent = remainingForDay.toFixed(2);
                if (remainingForDay < 0) {
                    dayAllotmentCell.classList.add('daily-over-budget'); // Red
                } else if (remainingForDay === 0) { // Spent exactly the allowance
                    dayAllotmentCell.classList.add('daily-on-budget'); // Neutral text color (defined in CSS)
                } else { // remainingForDay > 0 (spent less than allowance)
                    dayAllotmentCell.classList.add('daily-under-budget'); // Green
                }
            } else { // Expense is 0 (or input is blank)
                dayAllotmentCell.textContent = dailyBudgetAllowance.toFixed(2); // Show full allowance
                // No specific class added, so it relies on the base .daily-budget-cell style (blue)
            }

            // Logic for the "Budget Status" (cumulativeBudgetDifference)
            // Only consider days with actual spending > 0 for this status
            if (expenseValue > 0) {
                cumulativeBudgetDifference += (expenseValue - dailyBudgetAllowance);
            }
        });

        // Update "Money Remaining ($)"
        const moneyRemaining = totalBudget - totalExpenses;
        moneyRemainingDisplay.textContent = moneyRemaining.toFixed(2);
        moneyRemainingDisplay.classList.toggle('over-budget', moneyRemaining < 0);

        // Update "Budget Status" display
        overUnderBudgetDisplay.textContent = cumulativeBudgetDifference.toFixed(2);
        overUnderBudgetDisplay.classList.remove('over-budget', 'under-budget');
        if (cumulativeBudgetDifference > 0) {
            overUnderBudgetDisplay.classList.add('over-budget');
            overUnderBudgetDisplay.title = "You are over your cumulative daily allowances for days with spending.";
        } else if (cumulativeBudgetDifference < 0) {
            overUnderBudgetDisplay.classList.add('under-budget');
            overUnderBudgetDisplay.title = `You are under your cumulative daily allowances by $${Math.abs(cumulativeBudgetDifference).toFixed(2)} for days with spending.`;
        } else { // cumulativeBudgetDifference is 0 (or no days with actual spending recorded yet)
            overUnderBudgetDisplay.title = "You are on track with your cumulative daily allowances for days with spending (or no spending recorded yet).";
        }
    }

    let saveTimeout;
    function saveDataToFirebase() {
        if (!currentUserUID || !currentTripId) return;

        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const currentTotalBudget = parseFloat(totalBudgetInput.value) || 0;
            const dailyExpensesData = {};
            daysData.forEach((day, index) => {
                // Save the raw input value, or "0" if it's blank (this matches your original working logic)
                dailyExpensesData[index] = day.expenseInput.value || "0";
            });

            const tripDataToUpdate = {
                totalBudget: currentTotalBudget,
                dailyExpenses: dailyExpensesData
            };

            db.ref(`users/${currentUserUID}/trips/${currentTripId}`).update(tripDataToUpdate)
                .then(() => console.log("Data saved to Firebase."))
                .catch(error => console.error("Error saving data to Firebase: ", error));
        }, 1000);
    }

    function loadDataFromFirebase() {
        if (!currentUserUID || !currentTripId) {
            tripTitleElement.textContent = "Error: Trip not specified ✈️";
            return;
        }

        const tripRef = db.ref(`users/${currentUserUID}/trips/${currentTripId}`);
        tripRef.on('value', snapshot => {
            if (snapshot.exists()) {
                const tripData = snapshot.val();
                tripTitleElement.textContent = `${tripData.tripName || 'My Trip'} Budget Planner ✈️`;
                totalBudgetInput.value = tripData.totalBudget || "0";
                dbStartDate = new Date(tripData.startDate + "T00:00:00");
                dbEndDate = new Date(tripData.endDate + "T00:00:00");

                initializeDays();

                if (tripData.dailyExpenses && daysData.length > 0) {
                    daysData.forEach((day, index) => {
                        if (tripData.dailyExpenses[index] !== undefined && tripData.dailyExpenses[index] !== null) {
                            day.expenseInput.value = tripData.dailyExpenses[index];
                        } else {
                            day.expenseInput.value = '';
                        }
                    });
                }
                updateCalculations(); // Crucial to call this after loading and populating inputs
            } else {
                console.error("Trip data not found in Firebase!");
                tripTitleElement.textContent = "Trip Not Found ✈️";
                alert("Could not find data for this trip. It might have been deleted.");
                window.location.href = "index.html";
            }
        }, error => {
            console.error("Error loading data from Firebase: ", error);
            tripTitleElement.textContent = "Error Loading Trip ✈️";
        });
    }

    const backLink = document.createElement('a');
    backLink.href = 'index.html';
    backLink.textContent = '← Back to My Trips';
    backLink.classList.add('back-link');
    containerDiv.insertBefore(backLink, containerDiv.firstChild);

    totalBudgetInput.addEventListener('input', () => {
        updateCalculations();
        saveDataToFirebase();
    });

    const urlParams = new URLSearchParams(window.location.search);
    currentTripId = urlParams.get('tripId');

    if (!currentTripId) {
        alert("No trip specified! Redirecting to homepage.");
        window.location.href = 'index.html';
        return;
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserUID = user.uid;
            loadDataFromFirebase();
        } else {
            alert("You need to be logged in to view this page. Redirecting to login.");
            window.location.href = 'index.html';
        }
    });
});
