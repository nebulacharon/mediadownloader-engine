export function initClipboardControls(inputEl, btnClear, btnPaste, onPasteCallback) {
    inputEl.addEventListener("input", () => {
      btnClear.style.display = inputEl.value.trim() ? "flex" : "none";
    });
  
    btnClear.addEventListener("click", () => {
      inputEl.value = "";
      btnClear.style.display = "none";
      inputEl.focus();
    });
  
    btnPaste.addEventListener("click", async () => {
      try {
        const text = await navigator.clipboard.readText();
        inputEl.value = text.trim();
        btnClear.style.display = text.trim() ? "flex" : "none";
        if (onPasteCallback) onPasteCallback(text.trim());
      } catch {
        inputEl.focus();
      }
    });
  }