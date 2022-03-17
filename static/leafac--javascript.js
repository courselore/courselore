// This file is here for now as it’s still under development. It should be moved to https://github.com/leafac/javascript/

/*
await eventSourceRefresh(await fetch(this.action + "?eventSourceReference=" + eventSource.reference, {
                                                                        method: this.method,
                                                                        body: new URLSearchParams(new FormData(this)),
                                                                      }));




onclick="${javascript`
                                    (async () => {
                                      if (event.which > 1 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
                                      event.preventDefault();
                                      window.history.pushState(undefined, "", this.getAttribute("href"));
                                      await eventSourceRefresh(await fetch(${JSON.stringify(
                                        `${app.locals.options.baseURL}/courses/${
                                          res.locals.course.reference
                                        }/conversations/${
                                          conversation.reference
                                        }${qs.stringify(
                                          lodash.omit(
                                            {
                                              ...req.query,
                                              scrollToConversation: false,
                                              messageReference:
                                                searchResult?.message
                                                  ?.reference,
                                            },
                                            [
                                              "conversationLayoutSidebarOpenOnSmallScreen",
                                              "beforeMessageReference",
                                              "afterMessageReference",
                                            ]
                                          ),
                                          { addQueryPrefix: true }
                                        )}`
                                      )}));
                                    })();





$${res?.locals.eventSource
            ? html`
                <script>
                  // const eventSource = new ReconnectingEventSource(
                  //   window.location.href
                  // );
                  // eventSource.addEventListener("reference", (event) => {
                  //   eventSource.reference = event.data;
                  // });
                  // eventSource.addEventListener("refresh", async () => {
                  //   await eventSourceRefresh(await fetch(window.location.href));
                  // });
                </script>
              `
            : html``}









  
const eventSourceRefresh = async (response) => {
  switch (response.status) {
    case 200:
      const refreshedDocument = new DOMParser().parseFromString(
        await response.text(),
        "text/html"
      );
      document.head.append(...refreshedDocument.head.querySelectorAll("style"));
      morphdom(document.body, refreshedDocument.body, {
        onBeforeNodeAdded(node) {
          const onBeforeNodeAdded = node.getAttribute?.("onbeforenodeadded");
          return typeof onBeforeNodeAdded === "string"
            ? new Function("node", onBeforeNodeAdded).call(node, node)
            : node;
        },
        onNodeAdded(node) {
          const onNodeAdded = node.getAttribute?.("onnodeadded");
          if (typeof onNodeAdded === "string")
            new Function("node", onNodeAdded).call(node, node);
        },
        onBeforeElUpdated(from, to) {
          const onBeforeElUpdated = from.getAttribute("onbeforeelupdated");
          return typeof onBeforeElUpdated === "string"
            ? new Function("from", "to", onBeforeElUpdated).call(from, from, to)
            : !from.matches("input, textarea, select");
        },
        onElUpdated(element) {
          const onElUpdated = element.getAttribute("onelupdated");
          if (typeof onElUpdated === "string")
            new Function("element", onElUpdated).call(element, element);
        },
        onBeforeNodeDiscarded(node) {
          const onBeforeNodeDiscarded = node.getAttribute?.(
            "onbeforenodediscarded"
          );
          return typeof onBeforeNodeDiscarded === "string"
            ? new Function("node", onBeforeNodeDiscarded).call(node, node)
            : !node.matches?.("[data-tippy-root]");
        },
        onBeforeElChildrenUpdated(from, to) {
          const onBeforeElChildrenUpdated = from.getAttribute(
            "onbeforeelchildrenupdated"
          );
          return typeof onBeforeElChildrenUpdated === "string"
            ? new Function("from", "to", onBeforeElChildrenUpdated).call(
                from,
                from,
                to
              )
            : true;
        },
      });
      leafac.evaluateElementsAttribute(document);
      leafac.evaluateElementsAttribute(document, "onrefresh", true);
      break;

    case 404:
      alert("This page has been removed.\\n\\nYou’ll be redirected now.");
      // FIXME: Redirect to ‘baseURL’
      window.location.href = "/";
      break;

    default:
      console.error(response);
      break;
  }
};



*/

const leafac = {
  liveNavigation(baseURL) {
    window.addEventListener("DOMContentLoaded", () => {
      for (const element of document.querySelectorAll("[onload]"))
        new Function(element.getAttribute("onload")).call(element);
    });
    if (document.readyState !== "loading")
      window.dispatchEvent(new Event("DOMContentLoaded"));

    document.addEventListener("click", async (event) => {
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
      await navigate({ request: new Request(link.href) });
    });

    document.addEventListener("submit", async (event) => {
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
      await navigate({
        request: ["GET", "HEAD"].includes(method)
          ? new Request(new URL(`?${body}`, action), { method })
          : new Request(action, { method, body }),
      });
    });

    window.addEventListener("popstate", async () => {
      await navigate({
        request: new Request(document.location),
        popstate: true,
      });
    });

    let networkErrorMessage;
    let abortController;
    let isNavigating = false;
    async function navigate({ request, popstate = false } = {}) {
      networkErrorMessage ??= tippy(document.querySelector("body"), {
        theme: "error",
        trigger: "manual",
        arrow: false,
        content:
          "You appear to be offline. Please check your internet connection and try reloading the page.",
      });
      if (popstate) abortController?.abort();
      else if (isNavigating) return;
      isNavigating = true;
      if (
        window.dispatchEvent(new Event("beforenavigate", { cancelable: true }))
      )
        try {
          abortController = new AbortController();
          const response = await fetch(request, {
            signal: abortController.signal,
          });
          const responseText = await response.text();
          if (!popstate) window.history.pushState(undefined, "", response.url);
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
          leafac.dispatchBeforeunload(documentBody);
          morphdom(documentBody, newDocument.querySelector("body"), {
            childrenOnly: true,
          });
          for (const element of previousLocalCSS) element.remove();
          window.dispatchEvent(new Event("DOMContentLoaded"));
          document.querySelector("[autofocus]")?.focus();
        } catch (error) {
          if (error.name !== "AbortError") {
            console.error(error);
            if (
              ["GET", "HEAD"].includes(request.method.toUpperCase()) &&
              !popstate
            )
              window.history.pushState(undefined, "", request.url);
            networkErrorMessage.show();
            window.dispatchEvent(new Event("navigateerror"));
          }
        }
      isNavigating = false;
    }
  },

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
    leafac.dispatchBeforeunload(parentElement);
    leafac.dispatchBeforeunload(HTMLForJavaScript);
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

  dispatchBeforeunload(parentElement) {
    for (const element of parentElement.querySelectorAll("*"))
      element.dispatchEvent(new Event("beforeunload"));
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
      const tooltip = tippy(target, {
        theme: "error",
        trigger: "manual",
        showOnCreate: true,
        onHidden: () => {
          tooltip.destroy();
        },
        content: error,
      });
      target.addEventListener(
        "beforeunload",
        () => {
          tooltip.destroy();
        },
        { once: true }
      );
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

      const validateEvent = new CustomEvent("validate", {
        detail: { error: undefined },
      });
      element.dispatchEvent(validateEvent);
      if (typeof validateEvent.detail.error === "string")
        return validateEvent.detail.error;
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
    window.addEventListener("beforeunload", (event) => {
      if (
        isSubmittingForm ||
        !leafac.isModified(document.querySelector("body"))
      )
        return;
      event.preventDefault();
      event.returnValue = "";
    });
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
    const tooltip = tippy(element, {
      touch: false,
    });
    element.addEventListener(
      "beforeunload",
      () => {
        tooltip.destroy();
      },
      { once: true }
    );

    let timeoutID;
    (function update() {
      const dateTime = element.getAttribute("datetime");
      tooltip.setContent(leafac.formatUTCDateTime(dateTime));
      element.textContent = leafac.relativizeDateTime(dateTime, options);
      timeoutID = window.setTimeout(update, 10 * 1000);
    })();
    element.addEventListener(
      "beforeunload",
      () => {
        window.clearTimeout(timeoutID);
      },
      { once: true }
    );
  },

  relativizeDateElement(element) {
    let timeoutID;
    (function update() {
      element.textContent = leafac.relativizeDate(
        element.getAttribute("datetime")
      );
      timeoutID = window.setTimeout(update, 60 * 1000);
    })();
    element.addEventListener(
      "beforeunload",
      () => {
        window.clearTimeout(timeoutID);
      },
      { once: true }
    );
  },

  localizeDateTimeInput(element) {
    element.defaultValue = leafac.localizeDateTime(element.defaultValue);
    const handleValidate = (event) => {
      const date = leafac.UTCizeDateTime(element.value);
      if (date === undefined) {
        event.stopImmediatePropagation();
        event.detail.error =
          "Invalid date & time. Match the pattern YYYY-MM-DD HH:MM.";
        return;
      }
      element.value = date.toISOString();
    };
    element.addEventListener("validate", handleValidate);
    element.addEventListener(
      "beforeunload",
      () => {
        element.removeEventListener("validate", handleValidate);
      },
      { once: true }
    );
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
    element.value = element.defaultValue =
      getLocalStorageItem()?.[window.location.pathname]?.[identifier] ?? "";
    element.isModified = false;

    const handleInput = () => {
      const localStorageItem = getLocalStorageItem();
      localStorageItem[window.location.pathname] ??= {};
      localStorageItem[window.location.pathname][identifier] = element.value;
      setLocalStorageItem(localStorageItem);
    };
    element.addEventListener("input", handleInput);
    element.addEventListener(
      "beforeunload",
      () => {
        element.removeEventListener("input", handleInput);
      },
      { once: true }
    );

    const form = element.closest("form");
    const handleSubmit = () => {
      const localStorageItem = getLocalStorageItem();
      delete localStorageItem?.[window.location.pathname]?.[identifier];
      if (
        Object.entries(localStorageItem?.[window.location.pathname] ?? {})
          .length === 0
      )
        delete localStorageItem?.[window.location.pathname];
      setLocalStorageItem(localStorageItem);
    };
    form.addEventListener("submit", handleSubmit);
    form.addEventListener(
      "beforeunload",
      () => {
        form.removeEventListener("submit", handleSubmit);
      },
      { once: true }
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
    location.reload();
  },

  regExps: {
    email: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
    localizedDateTime: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
  },
};
