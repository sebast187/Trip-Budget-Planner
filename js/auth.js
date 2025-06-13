// js/auth.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginButton = document.getElementById('login-button');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPasswordInput = document.getElementById('signup-password');
    const signupButton = document.getElementById('signup-button');
    const logoutButton = document.getElementById('logout-button');
    const userStatusDisplay = document.getElementById('user-status');
    const authFormsContainer = document.getElementById('auth-forms');
    const appContentContainer = document.getElementById('app-content');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');

    // Toggle forms
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    // Handle Auth State Changes
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            userStatusDisplay.textContent = `Logged in as: ${user.email}`;
            authFormsContainer.classList.add('hidden');
            appContentContainer.classList.remove('hidden');
            logoutButton.classList.remove('hidden');
            if (window.loadUserTrips) window.loadUserTrips(user.uid); // Call function from index-controller.js
        } else {
            // User is signed out
            userStatusDisplay.textContent = 'Not logged in';
            authFormsContainer.classList.remove('hidden');
            appContentContainer.classList.add('hidden');
            logoutButton.classList.add('hidden');
            if (window.clearTripsList) window.clearTripsList(); // Call function from index-controller.js
        }
    });

    // Login
    loginButton.addEventListener('click', () => {
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;
        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log('User logged in:', userCredential.user);
                loginForm.reset();
            })
            .catch(error => {
                console.error('Login error:', error);
                alert(`Login failed: ${error.message}`);
            });
    });

    // Signup
    signupButton.addEventListener('click', () => {
        const email = signupEmailInput.value;
        const password = signupPasswordInput.value;
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log('User signed up:', userCredential.user);
                signupForm.reset();
                // Automatically logs in after signup
            })
            .catch(error => {
                console.error('Signup error:', error);
                alert(`Sign up failed: ${error.message}`);
            });
    });

    // Logout
    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => {
            console.log('User logged out');
        }).catch(error => {
            console.error('Logout error:', error);
        });
    });
});
