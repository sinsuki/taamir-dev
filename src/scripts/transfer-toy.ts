const LIMIT_CENTS = 50000;

export function initTransferToy(): void {
  const root = document.querySelector("#transfer-toy");
  if (!(root instanceof HTMLElement) || root.dataset.ready === "true") return;
  root.dataset.ready = "true";
  const input = root.querySelector("#amount");
  const range = root.querySelector("#amount-range");
  const readout = root.querySelector("#toy-readout");
  if (!(input instanceof HTMLInputElement) || !(range instanceof HTMLInputElement) || !readout) return;

  const paint = () => {
    const result = judge(input.value);
    readout.replaceChildren();
    if (result.kind !== "invalid") {
      const stamp = document.createElement("span");
      stamp.className = `stamp stamp-${result.kind}`;
      stamp.textContent = result.kind === "needs_approval" ? "needs approval" : result.kind;
      readout.append(stamp, document.createTextNode(" "));
    }
    readout.append(document.createTextNode(result.text));
  };

  const syncRange = (raw: string) => {
    if (!/^\d+$/.test(raw)) return;
    const cents = Number(raw);
    const max = Number(range.max);
    const min = Number(range.min);
    if (cents >= min && cents <= max) range.value = String(cents);
  };

  input.addEventListener("input", () => {
    syncRange(input.value.trim());
    paint();
  });
  range.addEventListener("input", () => {
    input.value = range.value;
    paint();
  });
  for (const button of root.querySelectorAll<HTMLButtonElement>("[data-amount]")) {
    button.addEventListener("click", () => {
      const amount = button.dataset.amount ?? "";
      input.value = amount;
      syncRange(amount);
      paint();
      input.focus();
    });
  }
  paint();
}

function judge(raw: string): { kind: "allow" | "needs_approval" | "rejected" | "invalid"; text: string } {
  const text = raw.trim();
  if (!text) {
    return { kind: "invalid", text: "Enter an amount in cents, or a decimal to see it rejected." };
  }
  if (text.includes(".")) {
    return { kind: "rejected", text: "Rejected. A float string is not integer cents." };
  }
  if (!/^\d+$/.test(text)) {
    return { kind: "invalid", text: "Use whole cents. A decimal point is rejected as a float." };
  }
  const cents = Number(text);
  if (!Number.isSafeInteger(cents)) {
    return { kind: "invalid", text: "That number is too large for this toy." };
  }
  const dollars = `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
  if (cents <= LIMIT_CENTS) {
    return { kind: "allow", text: `Allow. ${dollars} is not over $500.00.` };
  }
  return { kind: "needs_approval", text: `Needs approval. ${dollars} is over $500.00.` };
}
