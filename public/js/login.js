document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');
    const usernameInput = document.getElementById('username');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const forgotLink = document.getElementById('forgotLink');

    // Populate username if rememberMe was previously checked
    const savedUsername = localStorage.getItem('ragnar_saved_username');
    if (savedUsername) {
        usernameInput.value = savedUsername;
        rememberMeCheckbox.checked = true;
    }

    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        alert('A true Viking relies on memory! The default credentials are:\nUsername: ragnar\nPassword: ragnarok');
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = document.getElementById('password').value;

        // Reset error message
        errorMsg.style.display = 'none';
        errorMsg.textContent = '';

        if (!username || !password) {
            showError('Please fill in all fields.');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Save username if remember me is checked
                if (rememberMeCheckbox.checked) {
                    localStorage.setItem('ragnar_saved_username', username);
                } else {
                    localStorage.removeItem('ragnar_saved_username');
                }

                // Redirect to dashboard
                window.location.href = '/';
            } else {
                showError(result.message || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            console.error(err);
            showError('Unable to connect to server. Please try again later.');
        }
    });

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        
        // Retrigger shake animation
        errorMsg.style.animation = 'none';
        errorMsg.offsetHeight; // Trigger reflow
        errorMsg.style.animation = 'shake 0.4s ease-in-out';
    }
});
