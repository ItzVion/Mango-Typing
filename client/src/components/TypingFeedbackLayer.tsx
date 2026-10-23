import { useEffect } from "react";

const activeAnimations = new WeakMap<HTMLElement, Animation>();

function pulse(element: HTMLElement, kind: "field" | "surface") {
  const previous = activeAnimations.get(element);
  previous?.cancel();

  if (typeof element.animate !== "function") return;

  const keyframes: Keyframe[] =
    kind === "surface"
      ? [
          { boxShadow: "inset 0 0 0 1px rgba(245, 166, 35, 0.55)" },
          { boxShadow: "inset 0 0 0 1px rgba(245, 166, 35, 0)" },
        ]
      : [
          { boxShadow: "0 0 0 3px rgba(245, 166, 35, 0.2)" },
          { boxShadow: "0 0 0 0 rgba(245, 166, 35, 0)" },
        ];

  const animation = element.animate(keyframes, {
    duration: 150,
    easing: "cubic-bezier(.22, 1, .36, 1)",
  });
  activeAnimations.set(element, animation);
  animation.onfinish = () => {
    if (activeAnimations.get(element) === animation) activeAnimations.delete(element);
  };
}

/**
 * Delegated input feedback works with text inputs, textareas, editable fields,
 * and game surfaces without adding React state updates for every key.
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

      pulse(target, "field");

      const source = target.dataset.typingFeedbackSource;
      if (source) {
        const safeSource = source.replace(/[^a-zA-Z0-9_-]/g, "");
        const output = document.querySelector<HTMLElement>('[data-typing-feedback-target="' + safeSource + '"]');
        if (output) pulse(output, "surface");
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key.length !== 1 && event.key !== "Backspace") return;

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const area = target.closest<HTMLElement>("[data-typing-area]");
      if (area && !target.matches("input, textarea, [contenteditable='true']")) {
        pulse(area, "surface");
      }
    };

    document.addEventListener("input", onInput, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("keydown", onKeyDown, true);
      activeAnimations.clear;
    };
  }, []);

  return null;
}
