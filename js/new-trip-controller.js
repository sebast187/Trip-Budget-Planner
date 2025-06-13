// js/new-trip-controller.js
document.addEventListener('DOMContentLoaded', () => {
    const tripNameInput = document.getElementById('trip-name');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const initialBudgetInput = document.getElementById('initial-budget');
    const createTripButton = document.getElementById('create-trip-button');
    const messageP = document.getElementById('message'); // The <p id="message"> element

    // Function to display messages with appropriate styling
    function showMessage(text, type = 'info') { // type can be 'info', 'success', or 'error'
        messageP.textContent = text;
        if (type === 'success') {
            messageP.className = 'message success';
        } else if (type === 'error') {
            messageP.className = 'message error';
        } else { // 'info' or any other, just basic message style
            messageP.className = 'message'; // Assuming you might add a base .message style
        }
    }

    // Function to clear messages
    function clearMessage() {
        messageP.textContent = '';
        messageP.className = 'message'; // Reset to base class, hiding background/border
    }


    auth.onAuthStateChanged(user => {
        if (!user) {
            showMessage("You must be logged in to create a trip. Redirecting to login page...", 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 3000); // Increased timeout slightly for user to read message
        } else {
            // User is logged in, perhaps clear any lingering messages if page was reloaded
            // clearMessage(); // Optional: clear message if user navigates back and is logged in
        }
    });

    createTripButton.addEventListener('click', () => {
        clearMessage(); // Clear any previous messages before processing

        const currentUser = auth.currentUser;
        if (!currentUser) {
            showMessage("Error: You are not logged in. Please log in to create a trip.", 'error');
            // Optionally, redirect to login after a delay
            // setTimeout(() => { window.location.href = 'index.html'; }, 2500);
            return;
        }

        const tripName = tripNameInput.value.trim();
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const initialBudget = parseFloat(initialBudgetInput.value);

        // Validation
        if (!tripName) {
            showMessage("Please enter a name for your trip.", 'error');
            tripNameInput.focus(); // Focus on the problematic field
            return;
        }
        if (!startDate) {
            showMessage("Please select a start date.", 'error');
            startDateInput.focus();
            return;
        }
        if (!endDate) {
            showMessage("Please select an end date.", 'error');
            endDateInput.focus();
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            showMessage("End date cannot be before the start date.", 'error');
            endDateInput.focus();
            return;
        }
        if (isNaN(initialBudget) || initialBudget < 0) {
            showMessage("Please enter a valid initial budget (0 or more).", 'error');
            initialBudgetInput.focus();
            return;
        }

        // All checks passed, proceed to create trip
        const newTripData = {
            tripName: tripName,
            startDate: startDate, // Stored as YYYY-MM-DD string
            endDate: endDate,     // Stored as YYYY-MM-DD string
            totalBudget: initialBudget,
            dailyExpenses: {} // Initialize as an empty object for expenses
        };

        // Disable button to prevent multiple submissions
        createTripButton.disabled = true;
        createTripButton.textContent = 'Creating...';


        const newTripRef = db.ref(`users/${currentUser.uid}/trips`).push();
        newTripRef.set(newTripData)
            .then(() => {
                showMessage("Trip created successfully! Redirecting to your planner...", 'success');
                setTimeout(() => {
                    window.location.href = `planner.html?tripId=${newTripRef.key}`;
                }, 2000); // Redirect after 2 seconds
            })
            .catch(error => {
                console.error("Error creating trip: ", error);
                showMessage(`Error creating trip: ${error.message}`, 'error');
                createTripButton.disabled = false; // Re-enable button on error
                createTripButton.textContent = 'Create Trip';
            });
    });
});
