// This file is here for now as it’s still under development. It should be moved to https://github.com/leafac/javascript/

const leafac = {
  liveNavigation(baseURL) {
    window.addEventListener("DOMContentLoaded", (event) => {
      for (const element of document.querySelectorAll("[onload]"))
        new Function("event", element.getAttribute("onload")).call(
          element,
          event
        );
    });
    if (document.readyState !== "loading")
      window.dispatchEvent(new Event("DOMContentLoaded"));

    document.onclick = async (event) => {
      const link = event.target.closest(
        `a[href]:not([target^="_"]):not([download])`
      );
      if (
        event.button !== 0 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.target.isContentEditable ||
        link === null ||
        !link.href.startsWith(baseURL)
      )
        return;
      event.preventDefault();
      await leafac.liveNavigate({ request: new Request(link.href), event });
    };

    document.onsubmit = async (event) => {
      const method = (
        event.submitter?.getAttribute("formmethod") ?? event.target.method
      ).toUpperCase();
      const action =
        event.submitter?.getAttribute("formaction") ?? event.target.action;
      const enctype =
        event.submitter?.getAttribute("formenctype") ?? event.target.enctype;
      const body =
        enctype === "multipart/form-data"
          ? new FormData(event.target)
          : new URLSearchParams(new FormData(event.target));
      if (!action.startsWith(baseURL)) return;
      event.preventDefault();
      await leafac.liveNavigate({
        request: ["GET", "HEAD"].includes(method)
          ? new Request(new URL(`?${body}`, action), { method })
          : new Request(action, { method, body }),
        event,
      });
    };

    window.onpopstate = async (event) => {
      await leafac.liveNavigate({
        request: new Request(window.location),
        event,
      });
    };
  },

  liveNavigate: (() => {
    let abortController;
    let isNavigating = false;
    let previousLocation = { ...window.location };
    return async ({ request, event, background = false }) => {
      if (event instanceof PopStateEvent) abortController?.abort();
      else if (isNavigating) return;
      isNavigating = true;
      const detail = { originalEvent: event, previousLocation };
      if (
        background ||
        (window.dispatchEvent(
          new CustomEvent("beforenavigate", { cancelable: true, detail })
        ) &&
          window.onbeforenavigate?.() !== false)
      ) {
        try {
          abortController = new AbortController();
          request.headers.set("Live-Navigation", "true");
          const response = await fetch(request, {
            signal: abortController.signal,
          });
          const responseText = await response.text();
          if (!(event instanceof PopStateEvent))
            window.history.pushState(undefined, "", response.url);
          const newDocument = new DOMParser().parseFromString(
            responseText,
            "text/html"
          );
          document.querySelector("title").textContent =
            newDocument.querySelector("title").textContent;
          const previousLocalCSS = document.querySelectorAll(".local-css");
          for (const element of newDocument.querySelectorAll(".local-css"))
            document
              .querySelector("head")
              .insertAdjacentElement("beforeend", element);
          const documentBody = document.querySelector("body");
          for (const element of newDocument.querySelectorAll("[onbeforeload]"))
            new Function(element.getAttribute("onbeforeload")).call(element);
          morphdom(documentBody, newDocument.querySelector("body"), {
            childrenOnly: true,
            onBeforeNodeAdded(node) {
              node.onbeforeadd?.();
              return node;
            },
            onNodeAdded(node) {
              // TODO: Test that this is being called.
              if (node.nodeType !== node.ELEMENT_NODE) return;
              for (const element of leafac.descendants(node)) element.onadd?.();
            },
            onBeforeElUpdated(from, to) {
              const onbeforeupdate = from.onbeforeupdate?.(to);
              return typeof onbeforeupdate === "boolean"
                ? onbeforeupdate
                : !from.matches("input, textarea, select");
            },
            onElUpdated(element) {
              element.onupdate?.();
            },
            onBeforeNodeDiscarded(node) {
              const onbeforeremove = node.onbeforeremove?.();
              return typeof onbeforeremove === "boolean"
                ? onbeforeremove
                : !node.matches?.("[data-tippy-root]");
            },
            onNodeDiscarded(node) {
              node.onremove?.();
            },
            onBeforeElChildrenUpdated(from, to) {
              const onbeforechildrenupdate = from.onbeforechildrenupdate?.(to);
              return typeof onbeforechildrenupdate === "boolean"
                ? onbeforechildrenupdate
                : true;
            },
          });
          for (const element of previousLocalCSS) element.remove();
          window.dispatchEvent(new CustomEvent("DOMContentLoaded", { detail }));
          document.querySelector("[autofocus]")?.focus();
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error(error);
            if (
              ["GET", "HEAD"].includes(request.method.toUpperCase()) &&
              !(event instanceof PopStateEvent)
            )
              window.history.pushState(undefined, "", request.url);
            const body = document.querySelector("body");
            (body.networkError ??= tippy(body)).setProps({
              theme: "error",
              trigger: "manual",
              arrow: false,
              content:
                "You appear to be offline. Please check your internet connection and try reloading the page.",
            });
            body.networkError.show();
            window.onnavigateerror?.();
          }
        }
        previousLocation = { ...window.location };
      }
      isNavigating = false;
    };
  })(),

  loadPartial(parentElement, partialString) {
    const partialDocument = new DOMParser().parseFromString(
      partialString,
      "text/html"
    );
    document
      .querySelector("head")
      .insertAdjacentHTML(
        "beforeend",
        partialDocument.querySelector("head").innerHTML
      );
    const HTMLForJavaScript = document.querySelector(".html-for-javascript");
    const partialHTMLForJavaScript = partialDocument.querySelector(
      ".html-for-javascript"
    );
    partialHTMLForJavaScript.remove();
    morphdom(parentElement, partialDocument.querySelector("body"), {
      childrenOnly: true,
    });
    morphdom(HTMLForJavaScript, partialHTMLForJavaScript, {
      childrenOnly: true,
    });
    for (const element of [
      ...parentElement.querySelectorAll("[onload]"),
      ...HTMLForJavaScript.querySelectorAll("[onload]"),
    ])
      new Function(element.getAttribute("onload")).call(element);
  },

  customFormValidation() {
    document.addEventListener(
      "submit",
      (event) => {
        if (leafac.validate(event.target)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      { capture: true }
    );
  },

  validate(element) {
    const elementsToValidate = leafac.descendants(element);
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
      const target =
        element.closest(
          "[hidden], .visually-hidden, .visually-hidden--interactive:not(:focus):not(:focus-within):not(:active)"
        )?.parentElement ?? element;
      (target.validationErrorTooltip ??= tippy(target)).setProps({
        theme: "error",
        trigger: "manual",
        content: error,
      });
      target.validationErrorTooltip.show();
      target.focus();
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

      const error = element.onvalidate?.();
      if (typeof error === "string") return error;
    }
  },

  warnAboutLosingInputs() {
    let isSubmittingForm = false;
    window.addEventListener("DOMContentLoaded", () => {
      isSubmittingForm = false;
    });
    document.addEventListener("submit", () => {
      isSubmittingForm = true;
    });
    window.onbeforeunload = (event) => {
      if (
        isSubmittingForm ||
        !leafac.isModified(document.querySelector("body"))
      )
        return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforenavigate", (event) => {
      if (
        isSubmittingForm ||
        !leafac.isModified(document.querySelector("body")) ||
        confirm(
          "Your changes will be lost if you leave this page. Do you wish to continue?"
        )
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
    });
  },

  isModified(element) {
    const elementsToCheck = leafac.descendants(element);
    for (const element of elementsToCheck) {
      if (
        leafac
          .ancestors(element)
          .some((element) => element.isModified === false) ||
        element.closest("[disabled]") !== null
      )
        continue;
      if (
        leafac.ancestors(element).some((element) => element.isModified === true)
      )
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

  tippySetDefaultProps(extraProps = {}) {
    tippy.setDefaultProps({
      arrow: tippy.roundArrow + tippy.roundArrow,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 1
        : 150,
      ...extraProps,
    });
  },

  relativizeDateTimeElement(element, options = {}) {
    (function update() {
      if (!leafac.isLiveElement(element)) return;
      const dateTime = element.getAttribute("datetime");
      (element.relativizeDateTimeElementTooltip ??= tippy(element)).setProps({
        touch: false,
        content: leafac.formatUTCDateTime(dateTime),
      });
      element.textContent = leafac.relativizeDateTime(dateTime, options);
      window.clearTimeout(element.relativizeDateTimeElementTimeoutID);
      element.relativizeDateTimeElementTimeoutID = window.setTimeout(
        update,
        10 * 1000
      );
    })();
  },

  relativizeDateElement(element) {
    (function update() {
      if (!leafac.isLiveElement(element)) return;
      element.textContent = leafac.relativizeDate(
        element.getAttribute("datetime")
      );
      window.clearTimeout(element.relativizeDateElementTimeoutID);
      element.relativizeDateElementTimeoutID = window.setTimeout(
        update,
        60 * 1000
      );
    })();
  },

  validateLocalizedDateTime(element) {
    const date = leafac.UTCizeDateTime(element.value);
    if (date === undefined)
      return "Invalid date & time. Match the pattern YYYY-MM-DD HH:MM.";
    element.value = date.toISOString();
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

  relativizeDate(dateString) {
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

  localizeDate(dateString) {
    const date = new Date(dateString.trim());
    return `${String(date.getFullYear())}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  },

  localizeTime(dateString) {
    const date = new Date(dateString.trim());
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  },

  localizeDateTime(dateString) {
    return `${leafac.localizeDate(dateString)} ${leafac.localizeTime(
      dateString
    )}`;
  },

  formatUTCDateTime(dateString) {
    const date = new Date(dateString.trim());
    return `${String(date.getUTCFullYear())}-${String(
      date.getUTCMonth() + 1
    ).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")} ${String(
      date.getUTCHours()
    ).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")} UTC`;
  },

  UTCizeDateTime(dateString) {
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

  capitalize(text) {
    return text.length === 0
      ? text
      : `${text[0].toUpperCase()}${text.slice(1)}`;
  },

  saveFormInputValue(element, identifier) {
    element.isModified = false;

    if (element.type === "checkbox") {
      element.checked = element.defaultChecked =
        getLocalStorageItem()?.[window.location.pathname]?.[identifier] ??
        element.defaultChecked;

      element.removeEventListener(
        "change",
        element.saveFormInputValueHandleChange
      );
      element.saveFormInputValueHandleChange = () => {
        const localStorageItem = getLocalStorageItem();
        localStorageItem[window.location.pathname] ??= {};
        localStorageItem[window.location.pathname][identifier] =
          element.checked;
        setLocalStorageItem(localStorageItem);
      };
      element.addEventListener(
        "change",
        element.saveFormInputValueHandleChange
      );
    } else if (
      typeof element.value === "string" &&
      typeof element.defaultValue === "string"
    ) {
      element.value = element.defaultValue =
        getLocalStorageItem()?.[window.location.pathname]?.[identifier] ?? "";

      element.removeEventListener(
        "input",
        element.saveFormInputValueHandleInput
      );
      element.saveFormInputValueHandleInput = () => {
        const localStorageItem = getLocalStorageItem();
        localStorageItem[window.location.pathname] ??= {};
        localStorageItem[window.location.pathname][identifier] = element.value;
        setLocalStorageItem(localStorageItem);
      };
      element.addEventListener("input", element.saveFormInputValueHandleInput);
    }

    const form = element.closest("form");
    form.removeEventListener(
      "submit",
      form[`saveFormInputValueHandleSubmit--${identifier}`]
    );
    form[`saveFormInputValueHandleSubmit--${identifier}`] = () => {
      const localStorageItem = getLocalStorageItem();
      delete localStorageItem?.[window.location.pathname]?.[identifier];
      if (
        Object.entries(localStorageItem?.[window.location.pathname] ?? {})
          .length === 0
      )
        delete localStorageItem?.[window.location.pathname];
      setLocalStorageItem(localStorageItem);
    };
    form.addEventListener(
      "submit",
      form[`saveFormInputValueHandleSubmit--${identifier}`]
    );

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

  ancestors(element) {
    const ancestors = [];
    while (element !== null) {
      ancestors.push(element);
      element = element.parentElement;
    }
    return ancestors;
  },

  descendants(element) {
    return element === null ? [] : [element, ...element.querySelectorAll("*")];
  },

  isLiveElement(element) {
    const ancestors = leafac.ancestors(element);
    const root = ancestors[ancestors.length - 1];
    return (
      root.matches("html") ||
      (root.matches("[data-tippy-root]") &&
        leafac.isLiveElement(root._tippy.reference))
    );
  },

  // https://github.com/ccampbell/mousetrap/blob/2f9a476ba6158ba69763e4fcf914966cc72ef433/mousetrap.js#L135
  isAppleDevice: /Mac|iPod|iPhone|iPad/.test(navigator.platform),

  async liveReload(url) {
    const eventSource = new ReconnectingEventSource(url);
    await new Promise((resolve) => {
      eventSource.addEventListener("open", resolve, { once: true });
    });
    await new Promise((resolve) => {
      eventSource.addEventListener("error", resolve, { once: true });
    });
    await new Promise((resolve) => {
      eventSource.addEventListener("open", resolve, { once: true });
    });
    window.location.reload();
  },

  regExps: {
    email: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
    localizedDateTime: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
  },
};
