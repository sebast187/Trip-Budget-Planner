// js/auth.js
document.addEventListener('DOMContentLoaded', () => {
    const loginFormElement = document.getElementById('login-form'); // This is now a <form> element
    const signupFormElement = document.getElementById('signup-form'); // This is now a <form> element

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
    if (showSignupLink) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (loginFormElement) loginFormElement.classList.add('hidden');
            if (signupFormElement) signupFormElement.classList.remove('hidden');
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (signupFormElement) signupFormElement.classList.add('hidden');
            if (loginFormElement) loginFormElement.classList.remove('hidden');
        });
    }

    // Handle Auth State Changes
    auth.onAuthStateChanged(user => {
        if (user) {
            userStatusDisplay.textContent = `Logged in as: ${user.email}`;
            if (authFormsContainer) authFormsContainer.classList.add('hidden');
            if (appContentContainer) appContentContainer.classList.remove('hidden');
            if (logoutButton) logoutButton.classList.remove('hidden');
            if (window.loadUserTrips) window.loadUserTrips(user.uid);
        } else {
            userStatusDisplay.textContent = ''; // Clear status or set to "Not logged in"
            if (authFormsContainer) authFormsContainer.classList.remove('hidden');
            if (appContentContainer) appContentContainer.classList.add('hidden');
            if (logoutButton) logoutButton.classList.add('hidden');
            if (window.clearTripsList) window.clearTripsList();
        }
    });

    // Login
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            if (!loginEmailInput || !loginPasswordInput) return;
            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;
            auth.signInWithEmailAndPassword(email, password)
                .then(userCredential => {
                    console.log('User logged in:', userCredential.user);
                    // Now that login-form is a <form> element, reset() should work
                    if (loginFormElement && typeof loginFormElement.reset === 'function') {
                        loginFormElement.reset();
                    } else {
                        // Fallback if it's somehow not a form or reset is unavailable
                        loginEmailInput.value = '';
                        loginPasswordInput.value = '';
                        console.warn("login-form element not found or not a form, inputs cleared manually.");
                    }
                })
                .catch(error => {
                    console.error('Login error:', error);
                    alert(`Login failed: ${error.message}`);
                });
        });
    }

    // Signup
    if (signupButton) {
        signupButton.addEventListener('click', () => {
            if (!signupEmailInput || !signupPasswordInput) return;
            const email = signupEmailInput.value;
            const password = signupPasswordInput.value;
            auth.createUserWithEmailAndPassword(email, password)
                .then(userCredential => {
                    console.log('User signed up:', userCredential.user);
                    // Now that signup-form is a <form> element, reset() should work
                    if (signupFormElement && typeof signupFormElement.reset === 'function') {
                        signupFormElement.reset();
                    } else {
                        signupEmailInput.value = '';
                        signupPasswordInput.value = '';
                        console.warn("signup-form element not found or not a form, inputs cleared manually.");
                    }
                })
                .catch(error => {
                    console.error('Signup error:', error);
                    alert(`Sign up failed: ${error.message}`);
                });
        });
    }

    // Logout
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('User logged out');
                // Page will react based on onAuthStateChanged
            }).catch(error => {
                console.error('Logout error:', error);
            });
        });
    }
});
