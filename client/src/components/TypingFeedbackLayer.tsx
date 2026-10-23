import { useEffect } from "react";

const activeTimers = new WeakMap<HTMLElement, number>();

function pulse(element: HTMLElement, className: string) {
  const previous = activeTimers.get(element);
  if (previous !== undefined) window.clearTimeout(previous);

  element.classList.remove(className);
  // Restart a tiny CSS animation without remounting the input or losing focus.
  void element.offsetWidth;
  element.classList.add(className);

  const timer = window.setTimeout(() => {
    element.classList.remove(className);
    activeTimers.delete(element);
  }, 240);
  activeTimers.set(element, timer);
}

/**
 * Delegated events keep typing feedback consistent across current and future
 * text fields, without adding custom handlers to every form.
 */
export function TypingFeedbackLayer() {
  useEffect(() => {
    const onInput = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target instanceof HTMLInputElement) {
        if (["checkbox", "radio", "button", "submit", "reset", "file", "range", "color", "image"].includes(target.type)) return;
      } else if (!(target instanceof HTMLTextAreaElement) && target.getAttribute("contenteditable") !== "true") {
        return;
      }

      pulse(target, "mt-input-typing");

      const source = target.dataset.typingFeedbackSource;
      if (source) {
        const output = document.querySelector<HTMLElement>(`[data-typing-feedback-target="${source}"]`);
        if (output) pulse(output, "mt-typing-surface-feedback");
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1 && event.key !== "Backspace") return;

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const area = target.closest<HTMLElement>("[data-typing-area]");
      if (area && !target.matches("input, textarea, [contenteditable='true']")) {
        pulse(area, "mt-typing-surface-feedback");
      }
    };

    document.addEventListener("input", onInput, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}
