const leafac = {
  evaluateOnInteractive: () => {
    window.addEventListener("DOMContentLoaded", () => {
      leafac.evaluateElementsAttribute(document);
    });
  },

  evaluateElementsAttribute: (parentElement, attribute = "oninteractive") => {
    for (const element of parentElement.querySelectorAll(`[${attribute}]`))
      new Function(element.getAttribute(attribute)).call(element);
  },

  customFormValidation: () => {
    document.addEventListener(
      "submit",
      (event) => {
        if (leafac.validate(event.target)) return;
        event.preventDefault();
        event.stopPropagation();
      },
      true
    );
  },

  validate: (element) => {
    const elementsToValidate = [element, ...element.querySelectorAll("*")];
    const elementsToReset = new Map();

    for (const element of elementsToValidate) {
      if (element.closest("[disabled]") !== null) continue;
      const valueInputByUser = element.value;
      const error = validateElement(element);
      if (element.value !== valueInputByUser)
        elementsToReset.set(element, valueInputByUser);
      if (typeof error !== "string") continue;
      for (const [element, valueInputByUser] of elementsToReset)
        element.value = valueInputByUser;
      const tooltip = tippy(element, {
        content: error,
        theme: "validation--error",
        trigger: "manual",
        showOnCreate: true,
        onHidden: () => {
          tooltip.destroy();
        },
      });
      element.focus();
      return false;
    }
    return true;

    function validateElement(element) {
      if (element.matches("[required]"))
        switch (element.type) {
          case "radio":
            if (
              element
                .closest("form")
                .querySelector(`[name="${element.name}"]:checked`) === null
            )
              return "Please select one of these options.";
            break;
          case "checkbox":
            const checkboxes = [
              ...element
                .closest("form")
                .querySelectorAll(`[name="${element.name}"]`),
            ];
            if (!checkboxes.some((checkbox) => checkbox.checked))
              return checkboxes.length === 1
                ? "Please check this checkbox."
                : "Please select at least one of these options.";
            break;
          default:
            if (element.value.trim() === "")
              return "Please fill out this field.";
            break;
        }

      if (
        element.matches("[minlength]") &&
        element.value.trim() !== "" &&
        element.value.length < Number(element.getAttribute("minlength"))
      )
        return `This field must have at least ${element.getAttribute(
          "minlength"
        )} characters.`;

      if (
        element.matches(`[type="email"]`) &&
        element.value.trim() !== "" &&
        element.value.match(leafac.regExps.email) === null
      )
        return "Please enter an email address.";

      for (const validator of element.validators ?? []) {
        const error = validator();
        if (typeof error === "string") return error;
      }
    }
  },

  warnAboutLosingInputs: () => {
    const warner = (event) => {
      if (!leafac.isModified(document.body)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warner);
    document.addEventListener("submit", () => {
      window.removeEventListener("beforeunload", warner);
    });
  },

  isModified: (element) => {
    const elementsToCheck = [element, ...element.querySelectorAll("*")];
    for (const element of elementsToCheck) {
      if (
        element.dataset.skipIsModified === "true" ||
        element.closest("[disabled]") !== null
      )
        continue;
      if (element.dataset.forceIsModified === "true") return true;
      if (["radio", "checkbox"].includes(element.type)) {
        if (element.checked !== element.defaultChecked) return true;
      } else if (element.tagName.toLowerCase() === "option") {
        if (element.selected !== element.defaultSelected) return true;
      } else if (
        typeof element.value === "string" &&
        typeof element.defaultValue === "string"
      )
        if (element.value !== element.defaultValue) return true;
    }
    return false;
  },

  disableButtonsOnSubmit: () => {
    document.addEventListener("submit", (event) => {
      for (const button of event.target.querySelectorAll(
        `button:not([type="button"])`
      ))
        button.disabled = true;
    });
  },

  tippySetDefaultProps: (extraProps = {}) => {
    tippy.setDefaultProps({
      arrow: tippy.roundArrow + tippy.roundArrow,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 1
        : 150,
      ...extraProps,
    });
  },

  relativizeDateTimeElement: (element) => {
    const dateString = element.textContent.trim();
    element.setAttribute("datetime", dateString);
    if (tippy !== undefined)
      tippy(element, { content: dateString, touch: false });
    else element.setAttribute("title", dateString);

    (function update() {
      element.textContent = leafac.relativizeDateTime(dateString);
      window.setTimeout(update, 10 * 1000);
    })();
  },

  formatDateTimeInput: (element) => {
    element.defaultValue = leafac.formatDateTime(element.defaultValue);
    (element.validators ??= []).push(() => {
      const date = leafac.parseDateTime(element.value);
      if (date === undefined)
        return "Invalid date & time. Match the pattern YYYY-MM-DD HH:MM.";
      element.value = date.toISOString();
    });
  },

  relativizeDateTime: (() => {
    const relativeTimeFormat = new Intl.RelativeTimeFormat("en-US", {
      localeMatcher: "lookup",
      numeric: "auto",
    });
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const month = 30 * day;

    return (dateString) => {
      const difference = new Date(dateString).getTime() - Date.now();
      const absoluteDifference = Math.abs(difference);
      return absoluteDifference < minute
        ? "just now"
        : absoluteDifference < hour
        ? relativeTimeFormat.format(Math.trunc(difference / minute), "minutes")
        : absoluteDifference < day
        ? relativeTimeFormat.format(Math.trunc(difference / hour), "hours")
        : absoluteDifference < month
        ? relativeTimeFormat.format(Math.trunc(difference / day), "days")
        : `at ${leafac.formatDateTime(dateString)}`;
    };
  })(),

  formatDate: (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getFullYear())}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  },

  formatTime: (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  },

  formatDateTime: (dateString) =>
    `${leafac.formatDate(dateString)} ${leafac.formatTime(dateString)}`,

  parseDateTime: (dateString) => {
    if (dateString.match(leafac.regExps.formattedDateTime) === null) return;
    const date = new Date(dateString.replace(" ", "T"));
    if (isNaN(date.getTime())) return;
    return date;
  },

  liveReload: () => {
    const eventSource = new EventSource("/live-reload");
    eventSource.addEventListener("error", () => {
      eventSource.close();
      (async function reload() {
        try {
          if (!(await fetch(location.href)).ok) throw new Error();
          location.reload();
        } catch (error) {
          window.setTimeout(reload, 200);
        }
      })();
    });
  },

  regExps: {
    email: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
    formattedDateTime: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
  },
};
