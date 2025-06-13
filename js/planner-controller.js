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
    let dbStartDate, dbEndDate; // To store dates loaded from DB

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
        currentDate.setHours(0, 0, 0, 0); // Normalize to start of day
        const loopEndDate = new Date(dbEndDate);
        loopEndDate.setHours(0, 0, 0, 0); // Normalize to start of day

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
                updateCalculations();
                saveDataToFirebase();
            });
            expenseTd.appendChild(expenseInput);

            const dailyBudgetTd = document.createElement('td');
            dailyBudgetTd.classList.add('daily-budget-cell');
            dailyBudgetTd.textContent = '0.00';

            tr.appendChild(dateTd);
            tr.appendChild(expenseTd);
            tr.appendChild(dailyBudgetTd);
            tripDaysBody.appendChild(tr);

            daysData.push({
                // dateString: currentDate.toISOString().split('T')[0], // YYYY-MM-DD for potential keying
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
            }, index * 30); // Stagger animation
        });
    }

    function updateCalculations() {
        const totalBudget = parseFloat(totalBudgetInput.value) || 0;
        const numberOfDays = daysData.length;

        if (numberOfDays === 0) {
            moneyRemainingDisplay.textContent = totalBudget.toFixed(2);
            overUnderBudgetDisplay.textContent = "0.00";
            return;
        }

        const dailyBudgetAllowance = numberOfDays > 0 ? (totalBudget / numberOfDays) : 0;
        let totalExpenses = 0;
        let cumulativeBudgetDifference = 0;

        daysData.forEach(day => {
            const expenseValue = parseFloat(day.expenseInput.value) || 0;
            const expenseInputString = day.expenseInput.value.trim();
            totalExpenses += expenseValue;

            const dayAllotmentCell = day.dailyBudgetElement;
            dayAllotmentCell.classList.remove('daily-over-budget', 'daily-under-budget', 'daily-on-budget');
            dayAllotmentCell.style.color = '';
            dayAllotmentCell.style.fontWeight = '';

            if (expenseInputString !== '') {
                const remainingForDay = dailyBudgetAllowance - expenseValue;
                dayAllotmentCell.textContent = remainingForDay.toFixed(2);
                if (remainingForDay < 0) dayAllotmentCell.classList.add('daily-over-budget');
                else if (expenseValue > 0 && remainingForDay === 0) dayAllotmentCell.classList.add('daily-on-budget');
                else dayAllotmentCell.classList.add('daily-under-budget');
            } else {
                dayAllotmentCell.textContent = dailyBudgetAllowance.toFixed(2);
            }
            if (expenseInputString !== '') {
                cumulativeBudgetDifference += (expenseValue - dailyBudgetAllowance);
            }
        });

        const moneyRemaining = totalBudget - totalExpenses;
        moneyRemainingDisplay.textContent = moneyRemaining.toFixed(2);
        moneyRemainingDisplay.classList.toggle('over-budget', moneyRemaining < 0);

        overUnderBudgetDisplay.textContent = cumulativeBudgetDifference.toFixed(2);
        overUnderBudgetDisplay.classList.remove('over-budget', 'under-budget');
        if (cumulativeBudgetDifference > 0) {
            overUnderBudgetDisplay.classList.add('over-budget');
            overUnderBudgetDisplay.title = "You are over your cumulative daily allowances.";
        } else if (cumulativeBudgetDifference < 0) {
            overUnderBudgetDisplay.classList.add('under-budget');
            overUnderBudgetDisplay.title = `You are under your cumulative daily allowances by $${Math.abs(cumulativeBudgetDifference).toFixed(2)}.`;
        } else {
            overUnderBudgetDisplay.title = "You are on track with your cumulative daily allowances.";
        }
    }

    let saveTimeout;
    function saveDataToFirebase() {
        if (!currentUserUID || !currentTripId) return;

        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const currentTotalBudget = parseFloat(totalBudgetInput.value) || 0;
            const dailyExpensesData = {};

            console.log("--- Saving Data ---"); // Log when saving starts
            daysData.forEach((day, index) => {
                // CHANGE HERE: Don't convert empty string to "0" automatically on save.
                // Let an empty input be saved as an empty string.
                // Calculation logic will still treat parseFloat('') as 0.
                const expenseVal = day.expenseInput.value;
                dailyExpensesData[index] = expenseVal; // Store the raw value (could be "" or "123")
                console.log(`Day ${index} (from daysData[${index}].expenseInput.value): '${expenseVal}', will be saved as: '${dailyExpensesData[index]}'`);
            });
            console.log("Full dailyExpensesData to save:", JSON.stringify(dailyExpensesData));


            const tripDataToUpdate = {
                totalBudget: currentTotalBudget,
                dailyExpenses: dailyExpensesData
            };

            db.ref(`users/${currentUserUID}/trips/${currentTripId}`).update(tripDataToUpdate)
                .then(() => console.log("Data saved to Firebase successfully!"))
                .catch(error => console.error("Error saving data to Firebase: ", error));
        }, 1000); // Save 1 second after the last input
    }

    function loadDataFromFirebase() {
        if (!currentUserUID || !currentTripId) {
            tripTitleElement.textContent = "Error: Trip not specified ✈️";
            return;
        }

        const tripRef = db.ref(`users/${currentUserUID}/trips/${currentTripId}`);
        tripRef.on('value', snapshot => { // Use 'on' for real-time updates if needed, or 'once' for single load
            if (tripData.dailyExpenses && daysData.length > 0) {
                daysData.forEach((day, index) => {
                    const expenseValueFromDb = tripData.dailyExpenses[index];
                    // If the value from DB is null, undefined, or an empty string, set input to empty.
                    // Otherwise, use the value from DB (which could be "0" or "123").
                    if (expenseValueFromDb !== undefined && expenseValueFromDb !== null) {
                        day.expenseInput.value = expenseValueFromDb;
                    } else {
                        // This case handles if the key doesn't exist for the index
                        day.expenseInput.value = '';
                    }
                });
            } else if (daysData.length > 0) { // If tripData.dailyExpenses is null/undefined or empty object
                    daysData.forEach(day => {
                        day.expenseInput.value = ''; // All days become empty
                    });
            }
            updateCalculations(); // This should now use correctly populated inputs
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

    // Add "Back to My Trips" link
    const backLink = document.createElement('a');
    backLink.href = 'index.html';
    backLink.textContent = '← Back to My Trips';
    backLink.classList.add('back-link');
    containerDiv.insertBefore(backLink, containerDiv.firstChild); // Add at the top of the container


    // Event listener for total budget input
    totalBudgetInput.addEventListener('input', () => {
        updateCalculations();
        saveDataToFirebase();
    });

    // Main execution flow
    const urlParams = new URLSearchParams(window.location.search);
    currentTripId = urlParams.get('tripId');

    if (!currentTripId) {
        alert("No trip specified! Redirecting to homepage.");
        window.location.href = 'index.html';
        return; // Stop further execution
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserUID = user.uid;
            loadDataFromFirebase(); // Load data once user is confirmed and tripId is present
        } else {
            alert("You need to be logged in to view this page. Redirecting to login.");
            window.location.href = 'index.html';
        }
    });
});
