/* Set this to the Web App URL created from google-apps-script/Code.gs. */
const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbyKqd6xaPTl4_BmkHvoTuie90dE6VxXKEA8SHU6Dm4OM6lYNrQie7ZDRfylVlTms9uSxQ/exec";

const form = document.querySelector("#briefForm");
const message = document.querySelector("#formMessage");
const budget = document.querySelector("#budget");
const budgetValue = document.querySelector("#budgetValue");
const menuButton = document.querySelector("#menu");
const nav = document.querySelector("nav");
const formStartedAt = Date.now();

function formatBudget(value) {
  return new Intl.NumberFormat("fa-IR").format(value) + " میلیون تومان";
}
function updateBudget() { budgetValue.textContent = formatBudget(budget.value); }
function showMessage(text, type) { message.textContent = text; message.className = type; }

budget.addEventListener("input", updateBudget);
menuButton.addEventListener("click", () => nav.classList.toggle("open"));
nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => nav.classList.remove("open")));

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  if (form.website.value) return; // bot trap
  if (!FORM_ENDPOINT || FORM_ENDPOINT.includes("PASTE_")) {
    showMessage("اتصال فرم هنوز تنظیم نشده است. ابتدا آدرس Web App گوگل را در app.js وارد کنید.", "error");
    return;
  }
  const submit = form.querySelector("button[type=submit]");
  const values = new FormData(form);
  const payload = {
    name: values.get("name").trim(), company: values.get("company").trim(), email: values.get("email").trim(),
    phone: values.get("phone").trim(), services: values.getAll("services"), budget: `${budget.value} میلیون تومان`,
    notes: values.get("notes").trim(), website: values.get("website"),
    submittedAt: new Date().toISOString(), formStartedAt, source: window.location.href
  };
  submit.disabled = true;
  showMessage("در حال ثبت درخواست…", "");
  try {
    const response = await fetch(FORM_ENDPOINT, { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "text/plain;charset=utf-8" } });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Submission failed");
    form.reset(); budget.value = 50; updateBudget();
    showMessage("درخواست شما ارسال شد. ایمیل تأیید به‌زودی ارسال می‌شود.", "success");
  } catch (error) {
    console.error(error);
    showMessage("ثبت درخواست انجام نشد. لطفاً دوباره تلاش کنید یا با ما تماس بگیرید.", "error");
  } finally { submit.disabled = false; }
});
updateBudget();
