import { checkEmailExists } from "../core/api.js";

class AuthValidation {
  constructor() {
    this.isSubmitting = false;
    this.lastSubmitTime = 0;
    this.debounceDelay = 1200;
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(String(email || "").trim());

    return {
      isValid,
      message: isValid ? "" : "El formato del correo no es válido."
    };
  }

  preventDoubleSubmit() {
    const now = Date.now();

    if (this.isSubmitting || (now - this.lastSubmitTime) < this.debounceDelay) {
      return false;
    }

    this.isSubmitting = true;
    this.lastSubmitTime = now;
    return true;
  }

  releaseSubmit() {
    this.isSubmitting = false;
  }

  async checkEmailExists(email) {
    const data = await checkEmailExists(email);
    return Boolean(data?.exists);
  }

  showError(element, message) {
    if (!element) return;
    element.className = "feedback error";
    element.textContent = message;
  }

  showSuccess(element, message) {
    if (!element) return;
    element.className = "feedback success";
    element.textContent = message;
  }

  clearFeedback(element) {
    if (!element) return;
    element.className = "feedback";
    element.textContent = "";
  }

  disableButton(button, loadingText = "Procesando...") {
    if (!button) return;
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
  }

  enableButton(button) {
    if (!button) return;
    button.disabled = false;
    button.textContent = button.dataset.originalText || "Enviar";
  }
}

const authValidation = new AuthValidation();
window.authValidation = authValidation;

export default authValidation;
