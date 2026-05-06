import { authLogin, authRecover, authRegister, getSession, saveSession } from "./api.js";
import { redirectToDashboardByRole } from "./authGuard.js";
import authValidation from "../modules/auth-validation.js";

const LOGIN_URL = "../public/login.html";

function togglePasswordVisibility(input, button) {
  if (!input || !button) {
    return;
  }

  const nextType = input.type === "password" ? "text" : "password";
  input.type = nextType;
  button.textContent = nextType === "password" ? "Mostrar" : "Ocultar";
}

async function handleLoginSubmit(form) {
  const feedback = document.getElementById("loginError");
  const submitButton = form.querySelector('button[type="submit"]');
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authValidation.preventDoubleSubmit()) {
      return;
    }

    authValidation.clearFeedback(feedback);
    authValidation.disableButton(submitButton, "Ingresando...");

    try {
      const email = emailInput?.value.trim() || "";
      const password = passwordInput?.value.trim() || "";
      const emailValidation = authValidation.validateEmail(email);

      if (!email || !password) {
        throw new Error("Correo y contraseña son obligatorios.");
      }

      if (!emailValidation.isValid) {
        throw new Error(emailValidation.message);
      }

      const response = await authLogin({ email, password });
      const session = response?.user
        ? { ...response.user, token: response.token || "" }
        : {
            id: response?.id,
            nombre: response?.nombre,
            email: response?.email,
            rol: response?.rol,
            token: response?.token || ""
          };
      saveSession(session);
      redirectToDashboardByRole(session);
    } catch (error) {
      authValidation.showError(
        feedback,
        error.status === 401 ? "Credenciales incorrectas" : (error.message || "No fue posible iniciar sesión.")
      );
    } finally {
      authValidation.releaseSubmit();
      authValidation.enableButton(submitButton);
    }
  });
}

async function handleRegisterSubmit(form) {
  const feedback = document.getElementById("registroFeedback");
  const submitButton = form.querySelector('button[type="submit"]');
  const emailInput = document.getElementById("email");

  let emailCheckTimeout = null;

  if (emailInput) {
    emailInput.addEventListener("input", () => {
      window.clearTimeout(emailCheckTimeout);
      authValidation.clearFeedback(feedback);

      const email = emailInput.value.trim();
      if (email.length < 5) {
        return;
      }

      emailCheckTimeout = window.setTimeout(async () => {
        try {
          const validation = authValidation.validateEmail(email);

          if (!validation.isValid) {
            authValidation.showError(feedback, validation.message);
            return;
          }

          const exists = await authValidation.checkEmailExists(email);
          if (exists) {
            authValidation.showError(feedback, "El correo ya está registrado.");
          }
        } catch (error) {
          authValidation.showError(feedback, error.message || "No fue posible validar el correo.");
        }
      }, 500);
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authValidation.preventDoubleSubmit()) {
      return;
    }

    authValidation.clearFeedback(feedback);
    authValidation.disableButton(submitButton, "Registrando...");

    try {
      const payload = {
        nombre: document.getElementById("nombre")?.value.trim() || "",
        apellido: document.getElementById("apellido")?.value.trim() || "",
        documento: document.getElementById("documento")?.value.trim() || "",
        direccion: document.getElementById("direccion")?.value.trim() || "",
        email: document.getElementById("email")?.value.trim() || "",
        telefono: document.getElementById("telefono")?.value.trim() || "",
        password: document.getElementById("password")?.value.trim() || ""
      };

      if (!payload.nombre || !payload.apellido || !payload.documento || !payload.email || !payload.telefono || !payload.password) {
        throw new Error("Completa todos los campos obligatorios.");
      }

      const emailValidation = authValidation.validateEmail(payload.email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.message);
      }

      await authRegister(payload);
      authValidation.showSuccess(feedback, "Registro exitoso. Ya puedes iniciar sesión.");
      form.reset();
      window.setTimeout(() => {
        window.location.href = LOGIN_URL;
      }, 1400);
    } catch (error) {
      authValidation.showError(feedback, error.message || "No fue posible registrar la cuenta.");
    } finally {
      authValidation.releaseSubmit();
      authValidation.enableButton(submitButton);
    }
  });
}

async function handleRecoverSubmit(form) {
  const feedback = document.getElementById("recoverFeedback");
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!authValidation.preventDoubleSubmit()) {
      return;
    }

    authValidation.clearFeedback(feedback);
    authValidation.disableButton(submitButton, "Actualizando...");

    try {
      const email = document.getElementById("recoverEmail")?.value.trim() || "";
      const newPassword = document.getElementById("recoverPassword")?.value.trim() || "";
      const confirmPassword = document.getElementById("recoverConfirmPassword")?.value.trim() || "";

      if (!email || !newPassword || !confirmPassword) {
        throw new Error("Completa todos los campos.");
      }

      const emailValidation = authValidation.validateEmail(email);
      if (!emailValidation.isValid) {
        throw new Error(emailValidation.message);
      }

      if (newPassword.length < 6) {
        throw new Error("La nueva contraseña debe tener al menos 6 caracteres.");
      }

      if (newPassword !== confirmPassword) {
        throw new Error("Las contraseñas no coinciden.");
      }

      await authRecover({ email, newPassword });
      authValidation.showSuccess(feedback, "Contraseña actualizada. Ya puedes iniciar sesión.");
      form.reset();
      window.setTimeout(() => {
        window.location.href = LOGIN_URL;
      }, 1500);
    } catch (error) {
      authValidation.showError(feedback, error.message || "No fue posible actualizar la contraseña.");
    } finally {
      authValidation.releaseSubmit();
      authValidation.enableButton(submitButton);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const session = getSession();
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registroForm");
  const recoverForm = document.getElementById("recoverPasswordForm");

  if (session && loginForm) {
    redirectToDashboardByRole(session);
    return;
  }

  if (loginForm) {
    handleLoginSubmit(loginForm);

    const toggleButton = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("password");
    if (toggleButton && passwordInput) {
      toggleButton.addEventListener("click", () => togglePasswordVisibility(passwordInput, toggleButton));
    }
  }

  if (registerForm) {
    handleRegisterSubmit(registerForm);

    const toggleButton = document.getElementById("toggleRegisterPassword");
    const passwordInput = document.getElementById("password");
    if (toggleButton && passwordInput) {
      toggleButton.addEventListener("click", () => togglePasswordVisibility(passwordInput, toggleButton));
    }
  }

  if (recoverForm) {
    handleRecoverSubmit(recoverForm);

    const passwordInput = document.getElementById("recoverPassword");
    const confirmInput = document.getElementById("recoverConfirmPassword");
    const togglePassword = document.getElementById("toggleRecoverPassword");
    const toggleConfirm = document.getElementById("toggleRecoverConfirmPassword");

    if (togglePassword && passwordInput) {
      togglePassword.addEventListener("click", () => togglePasswordVisibility(passwordInput, togglePassword));
    }

    if (toggleConfirm && confirmInput) {
      toggleConfirm.addEventListener("click", () => togglePasswordVisibility(confirmInput, toggleConfirm));
    }
  }
});
