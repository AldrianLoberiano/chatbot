// ========================================
//  AUTH PAGE — JavaScript
// ========================================

const API_BASE = "";

// Elements
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const toggleBtn = document.getElementById("toggleBtn");
const toggleText = document.getElementById("toggleText");
const authMessage = document.getElementById("authMessage");
const googleSignInBtn = document.getElementById("googleSignInBtn");

let isLoginMode = true;

// Check if already logged in
(async function checkAuth() {
    try {
        const res = await fetch(`${API_BASE}/api/auth/me`);
        if (res.ok) {
            window.location.href = "/";
        }
    } catch (e) { /* not logged in */ }
})();

// Toggle login/register
toggleBtn.addEventListener("click", () => {
    isLoginMode = !isLoginMode;
    loginForm.style.display = isLoginMode ? "flex" : "none";
    registerForm.style.display = isLoginMode ? "none" : "flex";
    toggleText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
    toggleBtn.textContent = isLoginMode ? "Sign up" : "Sign in";
    hideMessage();
});

// Show message
function showMessage(text, type = "error") {
    authMessage.textContent = text;
    authMessage.className = `auth-message ${type}`;
