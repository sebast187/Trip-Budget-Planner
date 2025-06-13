// js/index-controller.js
document.addEventListener('DOMContentLoaded', () => {
    const tripsListUL = document.getElementById('trips-list');
    const noTripsMessage = document.getElementById('no-trips-message');
    //const goToCreateTripButton = document.getElementById('go-to-create-trip');

    //goToCreateTripButton.addEventListener('click', () => {
        // Option 1: Navigate to a new page
        //window.location.href = 'new-trip.html';
        // Option 2: Show a modal (more complex to implement here, would involve adding modal HTML to index.html)
    //});

    window.loadUserTrips = (userId) => {
        if (!userId) return;
        const tripsRef = db.ref(`users/${userId}/trips`);

        tripsRef.on('value', (snapshot) => {
            tripsListUL.innerHTML = ''; // Clear existing list
            if (snapshot.exists()) {
                noTripsMessage.classList.add('hidden');
                snapshot.forEach(childSnapshot => {
                    const tripId = childSnapshot.key;
                    const tripData = childSnapshot.val();

                    const li = document.createElement('li');
                    const link = document.createElement('a');
                    link.href = `planner.html?tripId=${tripId}`;
                    link.textContent = tripData.tripName || 'Unnamed Trip';
                    
                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = 'Delete';
                    deleteButton.onclick = () => deleteTrip(userId, tripId);

                    li.appendChild(link);
                    li.appendChild(deleteButton);
                    tripsListUL.appendChild(li);
                });
            } else {
                noTripsMessage.classList.remove('hidden');
            }
        }, (error) => {
            console.error("Error loading trips: ", error);
            noTripsMessage.textContent = "Error loading trips.";
            noTripsMessage.classList.remove('hidden');
        });
    };

    window.clearTripsList = () => {
        tripsListUL.innerHTML = '';
        noTripsMessage.classList.remove('hidden');
        noTripsMessage.textContent = "No trips yet. Create one!";
    };
    
    function deleteTrip(userId, tripId) {
        if (confirm("Are you sure you want to delete this trip? This cannot be undone.")) {
            db.ref(`users/${userId}/trips/${tripId}`).remove()
                .then(() => {
                    console.log("Trip deleted successfully");
                    // The 'on value' listener will automatically update the list
                })
                .catch(error => {
                    console.error("Error deleting trip: ", error);
                    alert("Failed to delete trip.");
                });
        }
    }
});
