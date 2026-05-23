export function readFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function readCheckbox(form, name) {
  return Boolean(form.elements[name]?.checked);
}

export function readNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}
