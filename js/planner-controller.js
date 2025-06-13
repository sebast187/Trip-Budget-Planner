// js/planner-controller.js
document.addEventListener('DOMContentLoaded', () => {
    // DOM Element Getters - ensure these IDs/selectors match your planner.html
    const totalBudgetInput = document.getElementById('total-budget');
    const moneyRemainingDisplay = document.getElementById('money-remaining');
    const overUnderBudgetDisplay = document.getElementById('over-under-budget');
    const tripDaysBody = document.getElementById('trip-days-body');
    const tripTitleElement = document.getElementById('trip-title');
    const containerDiv = document.querySelector('.container.container--wide'); // Targeting the specific wider container

    // Initial null checks for critical elements to catch issues early
    if (!totalBudgetInput) {
        console.error("CRITICAL ERROR: Element with ID 'total-budget' not found!");
    }
    if (!moneyRemainingDisplay) {
        console.error("CRITICAL ERROR: Element with ID 'money-remaining' not found!");
    }
    if (!overUnderBudgetDisplay) {
        console.error("CRITICAL ERROR: Element with ID 'over-under-budget' not found!");
    }
    if (!tripDaysBody) {
        console.error("CRITICAL ERROR: Element with ID 'trip-days-body' not found!");
    }
    if (!tripTitleElement) {
        console.error("CRITICAL ERROR: Element with ID 'trip-title' not found!");
    }
    if (!containerDiv) {
        console.error("CRITICAL ERROR: Element with class '.container.container--wide' not found!");
    }

    let daysData = [];
    let currentTripId = null;
    let currentUserUID = null;
    let dbStartDate, dbEndDate; // To store dates loaded from DB

    function formatDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function initializeDays() {
        if (!tripDaysBody) return; // Don't proceed if table body isn't found
        tripDaysBody.innerHTML = '';
        daysData = [];

        if (!dbStartDate || !dbEndDate) {
            console.error("Start or End date not loaded for trip. Cannot initialize days.");
            if (tripTitleElement) tripTitleElement.textContent = "Error: Trip dates not found ✈️";
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
                if (day.rowElement) day.rowElement.style.opacity = 1; // Check if rowElement exists
            }, index * 30 + 50); // Added small delay and stagger
        });
    }

    function updateCalculations() {
        // Ensure critical display elements are available before proceeding
        if (!totalBudgetInput || !moneyRemainingDisplay || !overUnderBudgetDisplay) {
            console.error("updateCalculations: Missing one or more display elements.");
            return;
        }

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
        let totalExpenses = 0;
        let cumulativeBudgetDifference = 0;

        daysData.forEach(day => {
            // Ensure day object and its properties are valid
            if (!day || !day.expenseInput || !day.dailyBudgetElement) {
                console.warn("updateCalculations: Skipping an invalid day object in daysData.");
                return; // Skips this iteration of the loop
            }

            const expenseValue = parseFloat(day.expenseInput.value) || 0;
            totalExpenses += expenseValue;

            const dayAllotmentCell = day.dailyBudgetElement;
            dayAllotmentCell.classList.remove('daily-over-budget', 'daily-under-budget', 'daily-on-budget');

            if (expenseValue > 0) {
                const remainingForDay = dailyBudgetAllowance - expenseValue;
                dayAllotmentCell.textContent = remainingForDay.toFixed(2);
                if (remainingForDay < 0) {
                    dayAllotmentCell.classList.add('daily-over-budget');
                } else if (remainingForDay === 0) {
                    dayAllotmentCell.classList.add('daily-on-budget');
                } else {
                    dayAllotmentCell.classList.add('daily-under-budget');
                }
            } else {
                dayAllotmentCell.textContent = dailyBudgetAllowance.toFixed(2);
            }

            if (expenseValue > 0) {
                cumulativeBudgetDifference += (expenseValue - dailyBudgetAllowance);
            }
        });

        moneyRemainingDisplay.textContent = totalExpenses.toFixed(2); // Should be totalBudget - totalExpenses
        moneyRemainingDisplay.textContent = (totalBudget - totalExpenses).toFixed(2);
        moneyRemainingDisplay.classList.toggle('over-budget', (totalBudget - totalExpenses) < 0);


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

    let saveTimeout;
    function saveDataToFirebase() {
        if (!currentUserUID || !currentTripId) return;
        if (!totalBudgetInput) { // Check if totalBudgetInput is available
            console.error("saveDataToFirebase: totalBudgetInput is null, cannot save.");
            return;
        }

        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const currentTotalBudget = parseFloat(totalBudgetInput.value) || 0;
            const dailyExpensesData = {};
            daysData.forEach((day, index) => {
                if (day && day.expenseInput) { // Ensure day and expenseInput exist
                    dailyExpensesData[index] = day.expenseInput.value || "0";
                } else {
                    dailyExpensesData[index] = "0"; // Default if problematic
                }
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
            if (tripTitleElement) tripTitleElement.textContent = "Error: Trip not specified ✈️";
            return;
        }

        const tripRef = db.ref(`users/${currentUserUID}/trips/${currentTripId}`);
        tripRef.on('value', snapshot => {
            if (snapshot.exists()) {
                const tripData = snapshot.val();
                if (tripTitleElement) tripTitleElement.textContent = `${tripData.tripName || 'My Trip'} Budget Planner ✈️`;
                if (totalBudgetInput) totalBudgetInput.value = tripData.totalBudget || "0";

                dbStartDate = new Date(tripData.startDate + "T00:00:00");
                dbEndDate = new Date(tripData.endDate + "T00:00:00");

                initializeDays(); // Initialize rows based on fetched dates

                if (tripData.dailyExpenses && daysData.length > 0) {
                    daysData.forEach((day, index) => {
                        if (day && day.expenseInput) { // Check before accessing expenseInput
                            if (tripData.dailyExpenses[index] !== undefined && tripData.dailyExpenses[index] !== null) {
                                day.expenseInput.value = tripData.dailyExpenses[index];
                            } else {
                                day.expenseInput.value = '';
                            }
                        }
                    });
                }
                updateCalculations(); // Crucial to call this after loading and populating inputs
            } else {
                console.error("Trip data not found in Firebase!");
                if (tripTitleElement) tripTitleElement.textContent = "Trip Not Found ✈️";
                alert("Could not find data for this trip. It might have been deleted.");
                window.location.href = "index.html";
            }
        }, error => {
            console.error("Error loading data from Firebase: ", error);
            if (tripTitleElement) tripTitleElement.textContent = "Error Loading Trip ✈️";
        });
    }

    // Add "Back to My Trips" link
    if (containerDiv) { // Check if containerDiv exists
        const backLink = document.createElement('a');
        backLink.href = 'index.html';
        backLink.textContent = '← Back to My Trips';
        backLink.classList.add('back-link');
        containerDiv.insertBefore(backLink, containerDiv.firstChild);
    }

    // Event listener for total budget input - THIS WAS THE LIKELY ERROR SPOT
    if (totalBudgetInput) { // <<<< KEY FIX: Check if totalBudgetInput was found
        totalBudgetInput.addEventListener('input', () => {
            updateCalculations();
            saveDataToFirebase();
        });
    } else {
        // This message will appear if the earlier console.error for totalBudgetInput ran
        console.warn("Could not attach event listener to totalBudgetInput as it was not found in the DOM.");
    }

    // Main execution flow
    const urlParams = new URLSearchParams(window.location.search);
    currentTripId = urlParams.get('tripId');

    if (!currentTripId) {
        alert("No trip specified! Redirecting to homepage.");
        window.location.href = 'index.html';
        return; // Stop further execution if no tripId
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            currentUserUID = user.uid;
            loadDataFromFirebase(); // Load data once user is confirmed and tripId is present
        } else {
            // User is signed out or not yet signed in
            alert("You need to be logged in to view this page. Redirecting to login.");
            window.location.href = 'index.html';
        }
    });
});
