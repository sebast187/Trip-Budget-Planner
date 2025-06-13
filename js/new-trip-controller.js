// js/new-trip-controller.js
document.addEventListener('DOMContentLoaded', () => {
    const tripNameInput = document.getElementById('trip-name');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const initialBudgetInput = document.getElementById('initial-budget');
    const createTripButton = document.getElementById('create-trip-button');
    const messageP = document.getElementById('message');

    auth.onAuthStateChanged(user => {
        if (!user) {
            // If user is not logged in, redirect to login page
            messageP.textContent = "You must be logged in to create a trip. Redirecting...";
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        }
    });

    createTripButton.addEventListener('click', () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            messageP.textContent = "Error: Not logged in.";
            return;
        }

        const tripName = tripNameInput.value.trim();
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const initialBudget = parseFloat(initialBudgetInput.value);

        if (!tripName || !startDate || !endDate || isNaN(initialBudget) || initialBudget < 0) {
            messageP.textContent = "Please fill in all fields correctly.";
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            messageP.textContent = "End date cannot be before start date.";
            return;
        }

        const newTripData = {
            tripName: tripName,
            startDate: startDate, // Store as YYYY-MM-DD string
            endDate: endDate,     // Store as YYYY-MM-DD string
            totalBudget: initialBudget,
            dailyExpenses: {} // Initialize as an empty object for expenses
        };

        const newTripRef = db.ref(`users/${currentUser.uid}/trips`).push();
        newTripRef.set(newTripData)
            .then(() => {
                messageP.textContent = "Trip created successfully! Redirecting...";
                // Redirect to the planner page for this new trip
                setTimeout(() => {
                    window.location.href = `planner.html?tripId=${newTripRef.key}`;
                }, 1500);
            })
            .catch(error => {
                console.error("Error creating trip: ", error);
                messageP.textContent = `Error: ${error.message}`;
            });
    });
});
