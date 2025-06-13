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
        console.log("--- updateCalculations: START ---"); // 1
    
        const totalBudgetInput = document.getElementById('total-budget'); // Make sure this element exists
        const moneyRemainingDisplay = document.getElementById('money-remaining'); // Make sure this exists
        const overUnderBudgetDisplay = document.getElementById('over-under-budget'); // Make sure this exists
    
        if (!totalBudgetInput || !moneyRemainingDisplay || !overUnderBudgetDisplay) {
            console.error("updateCalculations: Critical UI elements missing!");
            return; // Stop if essential elements aren't found
        }
        console.log("updateCalculations: UI elements checked."); // 2
    
        const totalBudget = parseFloat(totalBudgetInput.value) || 0;
        console.log("updateCalculations: totalBudget =", totalBudget); // 3
    
        // Ensure daysData is an array and accessible
        if (!Array.isArray(daysData)) {
            console.error("updateCalculations: daysData is not an array!", daysData);
            return;
        }
        const numberOfDays = daysData.length;
        console.log("updateCalculations: numberOfDays =", numberOfDays); // 4
    
        if (numberOfDays === 0) {
            console.log("updateCalculations: No days in trip, setting defaults."); // 5
            moneyRemainingDisplay.textContent = totalBudget.toFixed(2);
            overUnderBudgetDisplay.textContent = "0.00";
            overUnderBudgetDisplay.classList.remove('over-budget', 'under-budget');
            overUnderBudgetDisplay.title = "No days in trip.";
            console.log("--- updateCalculations: END (no days) ---"); // 6
            return;
        }
    
        const dailyBudgetAllowance = numberOfDays > 0 ? (totalBudget / numberOfDays) : 0;
        console.log("updateCalculations: dailyBudgetAllowance =", dailyBudgetAllowance); // 7
        let totalExpenses = 0;
        let cumulativeBudgetDifference = 0;
    
        console.log("updateCalculations: Starting daysData.forEach loop..."); // 8
        daysData.forEach((day, index) => {
            console.log(`updateCalculations: Processing day index ${index}`); // 9
    
            // Check if 'day' object and its properties are valid
            if (!day || !day.expenseInput || !day.dailyBudgetElement) {
                console.error(`updateCalculations: Invalid 'day' object or properties at index ${index}`, day);
                return; // Skip this iteration if day object is broken
            }
            console.log(`updateCalculations: Day ${index} - expenseInput value: '${day.expenseInput.value}'`); // 10
    
            const expenseValue = parseFloat(day.expenseInput.value) || 0;
            const expenseInputString = day.expenseInput.value.trim();
            console.log(`updateCalculations: Day ${index} - expenseValue: ${expenseValue}, expenseInputString: '${expenseInputString}'`); // 11
    
            totalExpenses += expenseValue;
    
            const dayAllotmentCell = day.dailyBudgetElement;
            dayAllotmentCell.classList.remove('daily-over-budget', 'daily-under-budget', 'daily-on-budget');
            // No inline style reset here, relying on base CSS for blue
    
            if (expenseInputString !== '') {
                console.log(`updateCalculations: Day ${index} - input string is NOT empty.`); // 12
                const remainingForDay = dailyBudgetAllowance - expenseValue;
                dayAllotmentCell.textContent = remainingForDay.toFixed(2);
                console.log(`updateCalculations: Day ${index} - remainingForDay: ${remainingForDay}`); // 13
    
                if (expenseValue > 0) {
                    console.log(`updateCalculations: Day ${index} - expenseValue > 0.`); // 14
                    if (remainingForDay < 0) {
                        console.log(`updateCalculations: Day ${index} - adding 'daily-over-budget'.`); // 15
                        dayAllotmentCell.classList.add('daily-over-budget');
                    } else if (remainingForDay === 0) {
                        console.log(`updateCalculations: Day ${index} - adding 'daily-on-budget'.`); // 16
                        dayAllotmentCell.classList.add('daily-on-budget');
                    } else {
                        console.log(`updateCalculations: Day ${index} - adding 'daily-under-budget'.`); // 17
                        dayAllotmentCell.classList.add('daily-under-budget');
                    }
                } else {
                    console.log(`updateCalculations: Day ${index} - expenseValue is 0, keeping default blue.`); // 18
                }
            } else {
                console.log(`updateCalculations: Day ${index} - input string IS empty, setting allowance, keeping blue.`); // 19
                dayAllotmentCell.textContent = dailyBudgetAllowance.toFixed(2);
            }
    
            if (expenseValue > 0) {
                console.log(`updateCalculations: Day ${index} - adding to cumulativeBudgetDifference.`); // 20
                cumulativeBudgetDifference += (expenseValue - dailyBudgetAllowance);
            }
            console.log(`updateCalculations: Day ${index} - current totalExpenses: ${totalExpenses}, cumulativeBudgetDifference: ${cumulativeBudgetDifference}`); // 21
        });
        console.log("updateCalculations: Finished daysData.forEach loop."); // 22
    
        const moneyRemaining = totalBudget - totalExpenses;
        moneyRemainingDisplay.textContent = moneyRemaining.toFixed(2);
        moneyRemainingDisplay.classList.toggle('over-budget', moneyRemaining < 0);
        console.log("updateCalculations: moneyRemaining set to:", moneyRemaining); // 23
    
        overUnderBudgetDisplay.textContent = cumulativeBudgetDifference.toFixed(2);
        overUnderBudgetDisplay.classList.remove('over-budget', 'under-budget');
        console.log("updateCalculations: cumulativeBudgetDifference for display:", cumulativeBudgetDifference); // 24
    
        if (cumulativeBudgetDifference > 0) {
            console.log("updateCalculations: Setting status to 'over-budget'."); // 25
            overUnderBudgetDisplay.classList.add('over-budget');
            overUnderBudgetDisplay.title = "You are over your cumulative daily allowances for days with spending.";
        } else if (cumulativeBudgetDifference < 0) {
            console.log("updateCalculations: Setting status to 'under-budget'."); // 26
            overUnderBudgetDisplay.classList.add('under-budget');
            overUnderBudgetDisplay.title = `You are under your cumulative daily allowances by $${Math.abs(cumulativeBudgetDifference).toFixed(2)} for days with spending.`;
        } else {
            console.log("updateCalculations: Setting status to 'on track'."); // 27
            overUnderBudgetDisplay.title = "You are on track with your cumulative daily allowances for days with spending (or no spending recorded yet).";
        }
        console.log("--- updateCalculations: END ---"); // 28
    }

    
        const moneyRemaining = totalBudget - totalExpenses;
        moneyRemainingDisplay.textContent = moneyRemaining.toFixed(2);
        moneyRemainingDisplay.classList.toggle('over-budget', moneyRemaining < 0);
    
        // Styling for overUnderBudgetDisplay
        overUnderBudgetDisplay.textContent = cumulativeBudgetDifference.toFixed(2);
        overUnderBudgetDisplay.classList.remove('over-budget', 'under-budget');
        if (cumulativeBudgetDifference > 0) {
            overUnderBudgetDisplay.classList.add('over-budget');
            overUnderBudgetDisplay.title = "You are over your cumulative daily allowances for days with spending.";
        } else if (cumulativeBudgetDifference < 0) {
            overUnderBudgetDisplay.classList.add('under-budget');
            overUnderBudgetDisplay.title = `You are under your cumulative daily allowances by $${Math.abs(cumulativeBudgetDifference).toFixed(2)} for days with spending.`;
        } else {
            overUnderBudgetDisplay.title = "You are on track with your cumulative daily allowances for days with spending (or no spending recorded yet).";
        }
    }
    
        const moneyRemaining = totalBudget - totalExpenses;
        moneyRemainingDisplay.textContent = moneyRemaining.toFixed(2);
        moneyRemainingDisplay.classList.toggle('over-budget', moneyRemaining < 0);
    
        // Styling for overUnderBudgetDisplay
        overUnderBudgetDisplay.textContent = cumulativeBudgetDifference.toFixed(2);
        overUnderBudgetDisplay.classList.remove('over-budget', 'under-budget');
        if (cumulativeBudgetDifference > 0) {
            overUnderBudgetDisplay.classList.add('over-budget');
            overUnderBudgetDisplay.title = "You are over your cumulative daily allowances for days with spending.";
        } else if (cumulativeBudgetDifference < 0) {
            overUnderBudgetDisplay.classList.add('under-budget');
            overUnderBudgetDisplay.title = `You are under your cumulative daily allowances by $${Math.abs(cumulativeBudgetDifference).toFixed(2)} for days with spending.`;
        } else { // cumulativeBudgetDifference is 0 (or no days with spending yet)
            overUnderBudgetDisplay.title = "You are on track with your cumulative daily allowances for days with spending (or no spending recorded yet).";
        }
    }
    
    let saveTimeout;
    function saveDataToFirebase() {
        if (!currentUserUID || !currentTripId) return;

        // Debounce saving to avoid too many writes
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const currentTotalBudget = parseFloat(totalBudgetInput.value) || 0;
            const dailyExpensesData = {};
            daysData.forEach((day, index) => {
                dailyExpensesData[index] = day.expenseInput.value || "0";
            });

            const tripDataToUpdate = {
                totalBudget: currentTotalBudget,
                dailyExpenses: dailyExpensesData
            };

            db.ref(`users/${currentUserUID}/trips/${currentTripId}`).update(tripDataToUpdate)
                .then(() => console.log("Data saved to Firebase."))
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
            if (snapshot.exists()) {
                const tripData = snapshot.val();
                tripTitleElement.textContent = `${tripData.tripName || 'My Trip'} Budget Planner ✈️`;
                totalBudgetInput.value = tripData.totalBudget || "0";

                // Dates are stored as YYYY-MM-DD strings.
                // The Date constructor with "YYYY-MM-DD" can be tricky with timezones for comparisons.
                // Adding "T00:00:00" helps stabilize it to local midnight.
                dbStartDate = new Date(tripData.startDate + "T00:00:00");
                dbEndDate = new Date(tripData.endDate + "T00:00:00");

                initializeDays(); // Initialize rows based on fetched dates

                if (tripData.dailyExpenses && daysData.length > 0) {
                    daysData.forEach((day, index) => {
                        if (tripData.dailyExpenses[index] !== undefined && tripData.dailyExpenses[index] !== null) {
                            day.expenseInput.value = tripData.dailyExpenses[index];
                        } else {
                            day.expenseInput.value = ''; // Clear if no data for that day
                        }
                    });
                }
                updateCalculations();
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
