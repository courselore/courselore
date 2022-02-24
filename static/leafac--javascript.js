// This file is here for now as it’s still under development. It should be moved to https://github.com/leafac/javascript/

const leafac = {
  mount: (element, partialString) => {
    const partialHTML = new DOMParser().parseFromString(
      partialString,
      "text/html"
    );
    document
      .querySelector("head")
      .insertAdjacentHTML(
        "beforeend",
        partialHTML.querySelector("head").innerHTML
      );
    document.querySelector(".html-for-javascript").innerHTML =
      partialHTML.querySelector(".html-for-javascript").innerHTML;
    partialHTML.querySelector(".html-for-javascript").remove();
    element.innerHTML = partialHTML.querySelector("body").innerHTML;
    leafac.evaluateElementsAttribute(element);
  },

  evaluateOnInteractive: () => {
    window.addEventListener("DOMContentLoaded", () => {
      leafac.evaluateElementsAttribute(document);
    });
  },

  evaluateElementsAttribute: (() => {
    const elementsAlreadyEvaluated = new Map();
    return (
      parentElement,
      attribute = "oninteractive",
      runMultipleTimes = false
    ) => {
      let elementsAlreadyEvaluatedAttribute =
        elementsAlreadyEvaluated.get(attribute);
      if (elementsAlreadyEvaluatedAttribute === undefined) {
        elementsAlreadyEvaluatedAttribute = new Set();
        elementsAlreadyEvaluated.set(
          attribute,
          elementsAlreadyEvaluatedAttribute
        );
      }
      for (const element of parentElement.querySelectorAll(`[${attribute}]`)) {
        if (!runMultipleTimes && elementsAlreadyEvaluatedAttribute.has(element))
          continue;
        elementsAlreadyEvaluatedAttribute.add(element);
        new Function(element.getAttribute(attribute)).call(element);
      }
    };
  })(),

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
        element.closest(`[data-skip-is-modified="true"]`) !== null ||
        element.closest("[disabled]") !== null
      )
        continue;
      if (element.closest(`[data-force-is-modified="true"]`) !== null)
        return true;
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

  relativizeDateTimeElement: (element, options = {}) => {
    const dateTime = element.getAttribute("datetime");
    tippy(element, { content: dateTime, touch: false });

    (function update() {
      element.textContent = leafac.relativizeDateTime(dateTime, options);
      window.setTimeout(update, 10 * 1000);
    })();
  },

  relativizeDateElement: (element) => {
    const dateTime = element.getAttribute("datetime");

    (function update() {
      element.textContent = leafac.relativizeDate(dateTime);
      window.setTimeout(update, 60 * 1000);
    })();
  },

  localizeDateTimeInput: (element) => {
    element.defaultValue = leafac.localizeDateTime(element.defaultValue);
    (element.validators ??= []).push(() => {
      const date = leafac.UTCizeDateTime(element.value);
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

    return (
      dateString,
      { preposition = undefined, dateOnly = true, capitalize = false } = {}
    ) => {
      const difference = new Date(dateString.trim()).getTime() - Date.now();
      const absoluteDifference = Math.abs(difference);
      const relativeDateTime =
        absoluteDifference < minute
          ? "just now"
          : absoluteDifference < hour
          ? relativeTimeFormat.format(
              Math.trunc(difference / minute),
              "minutes"
            )
          : absoluteDifference < day
          ? relativeTimeFormat.format(Math.trunc(difference / hour), "hours")
          : absoluteDifference < month
          ? relativeTimeFormat.format(Math.trunc(difference / day), "days")
          : `${preposition === undefined ? "" : `${preposition} `}${
              dateOnly
                ? leafac.localizeDate(dateString)
                : leafac.localizeDateTime(dateString)
            }`;
      return capitalize
        ? leafac.capitalize(relativeDateTime)
        : relativeDateTime;
    };
  })(),

  relativizeDate: (dateString) => {
    const date = leafac.localizeDate(dateString);
    const today = leafac.localizeDate(new Date().toISOString());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = leafac.localizeDate(yesterdayDate.toISOString());
    return date === today
      ? "Today"
      : date === yesterday
      ? "Yesterday"
      : `${date} · ${leafac.weekday(date)}`;
  },

  localizeDate: (dateString) => {
    const date = new Date(dateString.trim());
    return `${String(date.getFullYear())}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  },

  localizeTime: (dateString) => {
    const date = new Date(dateString.trim());
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  },

  localizeDateTime: (dateString) =>
    `${leafac.localizeDate(dateString)} ${leafac.localizeTime(dateString)}`,

  UTCizeDateTime: (dateString) => {
    if (dateString.match(leafac.regExps.localizedDateTime) === null) return;
    const date = new Date(dateString.trim().replace(" ", "T"));
    if (isNaN(date.getTime())) return;
    return date;
  },

  weekday: (() => {
    const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    });
    return (dateString) => dateTimeFormat.format(new Date(dateString.trim()));
  })(),

  capitalize: (text) =>
    text.length === 0 ? text : `${text[0].toUpperCase()}${text.slice(1)}`,

  saveFormInputValue: (element, identifier) => {
    element.defaultValue =
      getLocalStorageItem()?.[window.location.pathname]?.[identifier] ?? "";
    element.dataset.skipIsModified = "true";
    element.addEventListener("input", () => {
      const localStorageItem = getLocalStorageItem();
      localStorageItem[window.location.pathname] ??= {};
      localStorageItem[window.location.pathname][identifier] = element.value;
      setLocalStorageItem(localStorageItem);
    });
    element.closest("form").addEventListener("submit", () => {
      const localStorageItem = getLocalStorageItem();
      delete localStorageItem?.[window.location.pathname]?.[identifier];
      setLocalStorageItem(localStorageItem);
    });
    function getLocalStorageItem() {
      return JSON.parse(
        localStorage.getItem("leafac.saveFormInputValue") ?? "{}"
      );
    }
    function setLocalStorageItem(localStorageItem) {
      localStorage.setItem(
        "leafac.saveFormInputValue",
        JSON.stringify(localStorageItem)
      );
    }
  },

  // https://github.com/ccampbell/mousetrap/blob/2f9a476ba6158ba69763e4fcf914966cc72ef433/mousetrap.js#L135
  isAppleDevice: /Mac|iPod|iPhone|iPad/.test(navigator.platform),

  liveReload: () => {
    const eventSource = new EventSource("/live-reload");
    eventSource.addEventListener(
      "open",
      () => {
        eventSource.addEventListener(
          "error",
          () => {
            eventSource.close();
            window.setTimeout(async function reload() {
              try {
                if (!(await fetch(location.href)).ok) throw new Error();
                location.reload();
              } catch (error) {
                window.setTimeout(reload, 200);
              }
            }, 500);
          },
          { once: true }
        );
      },
      { once: true }
    );
  },

  regExps: {
    email: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
    localizedDateTime: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
  },
};
