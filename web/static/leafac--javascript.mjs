// This file is here for now because it’s still under development. It should be moved to https://github.com/leafac/javascript/

import fastMyersDiff from "fast-myers-diff";
import tippy, * as tippyStatic from "tippy.js";

let serverVersion;

export function setServerVersion(newServerVersion) {
  serverVersion = newServerVersion;
}

export function customFormValidation() {
  document.addEventListener(
    "submit",
    (event) => {
      if (validate(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    { capture: true }
  );
}

export function warnAboutLosingInputs() {
  let isSubmittingForm = false;

  window.addEventListener("DOMContentLoaded", () => {
    isSubmittingForm = false;
  });

  document.addEventListener("submit", () => {
    isSubmittingForm = true;
  });

  window.onbeforeunload = (event) => {
    if (isSubmittingForm || !isModified(document.querySelector("body"))) return;
    event.preventDefault();
    event.returnValue = "";
  };

  window.onbeforelivenavigate = () =>
    isSubmittingForm ||
    !isModified(document.querySelector("body")) ||
    confirm(
      "Your changes will be lost if you leave this page. Do you wish to continue?"
    );
}

export function tippySetDefaultProps(extraProps = {}) {
  tippy.setDefaultProps({
    arrow: tippyStatic.roundArrow + tippyStatic.roundArrow,
    duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 1
      : 150,
    ...extraProps,
  });
}

export function liveNavigation(hostname) {
  let abortController;
  let previousLocation = { ...window.location };

  const liveNavigate = async ({ request, event }) => {
    const body = document.querySelector("body");

    if (event instanceof PopStateEvent) abortController?.abort();
    else if (body.getAttribute("live-navigation") !== null) return;

    request.headers.set("Live-Navigation", "true");

    const isGet = ["GET", "HEAD", "OPTIONS", "TRACE"].includes(request.method);
    if (!isGet) request.headers.set("CSRF-Protection", "true");

    const requestURL = new URL(request.url);
    const detail = { request, previousLocation };
    if (
      isGet &&
      previousLocation.origin === requestURL.origin &&
      previousLocation.pathname === requestURL.pathname &&
      previousLocation.search === requestURL.search
    ) {
      if (
        previousLocation.hash !== requestURL.hash &&
        !(event instanceof PopStateEvent)
      )
        window.history.pushState(undefined, "", requestURL.href);
      window.dispatchEvent(new CustomEvent("livenavigateself", { detail }));
      if (window.location.hash.trim() !== "")
        document
          .getElementById(window.location.hash.slice(1))
          ?.scrollIntoView();
      previousLocation = { ...window.location };
      return;
    }

    if (window.onbeforelivenavigate?.() === false) return;
    body.setAttribute("live-navigation", "true");
    window.dispatchEvent(new CustomEvent("livenavigate", { detail }));
    window.onlivenavigate?.();

    try {
      abortController = new AbortController();
      const response = await fetch(request, {
        cache: "no-store",
        signal: abortController.signal,
      });

      const externalRedirect = response.headers.get(
        "Live-Navigation-External-Redirect"
      );
      if (typeof externalRedirect === "string") {
        window.location.assign(
          response.headers.get("Live-Navigation-External-Redirect")
        );
        return;
      }

      const responseText = await response.text();
      const responseURL = new URL(response.url);
      responseURL.hash = requestURL.hash;

      if (
        (isGet ||
          window.location.origin !== responseURL.origin ||
          window.location.pathname !== responseURL.pathname ||
          window.location.search !== responseURL.search) &&
        !(event instanceof PopStateEvent)
      )
        window.history.pushState(undefined, "", responseURL.href);

      loadDocument(responseText, detail);

      if (window.location.hash.trim() !== "")
        document
          .getElementById(window.location.hash.slice(1))
          ?.scrollIntoView();
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error(error);

        if (isGet && !(event instanceof PopStateEvent))
          window.history.pushState(undefined, "", requestURL.href);

        (body.liveNavigationErrorTooltip ??= tippy(body)).setProps({
          appendTo: body,
          trigger: "manual",
          hideOnClick: false,
          theme: "error",
          arrow: false,
          interactive: true,
          content:
            "Something went wrong when trying to perform this action. Please try reloading the page.",
        });
        body.liveNavigationErrorTooltip.show();

        window.onlivenavigateerror?.();
      }
    }

    previousLocation = { ...window.location };
    body.removeAttribute("live-navigation");
  };

  window.addEventListener("DOMContentLoaded", (event) => {
    for (const element of [...document.querySelectorAll("[onload]")].filter(
      (element) => element.closest("[data-tippy-root]") === null
    ))
      new Function("event", element.getAttribute("onload")).call(
        element,
        event
      );
  });

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
      !link.href.startsWith(`https://${hostname}`)
    )
      return;

    event.preventDefault();
    liveNavigate({ request: new Request(link.href), event });
  };

  document.onsubmit = async (event) => {
    const method = (
      event.submitter?.getAttribute("formmethod") ??
      event.target.getAttribute("method")
    ).toUpperCase();
    const action =
      event.submitter?.getAttribute("formaction") ?? event.target.action;
    if (!action.startsWith(`https://${hostname}`)) return;
    const enctype =
      event.submitter?.getAttribute("formenctype") ?? event.target.enctype;
    const body =
      enctype === "multipart/form-data"
        ? new FormData(event.target)
        : new URLSearchParams(new FormData(event.target));
    const submitterName = event.submitter?.getAttribute("name");
    if (typeof submitterName === "string")
      body.set(submitterName, event.submitter?.getAttribute("value") ?? "");

    event.preventDefault();
    if (event.submitter?.disabled !== undefined)
      event.submitter.disabled = true;

    const request = ["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)
      ? (() => {
          const actionURL = new URL(action);
          for (const [name, value] of body)
            actionURL.searchParams.append(name, value);
          return new Request(actionURL.href, { method });
        })()
      : new Request(action, { method, body });
    liveNavigate({ request, event });
  };

  window.onpopstate = async (event) => {
    liveNavigate({
      request: new Request(window.location),
      event,
    });
  };
}

export async function liveConnection({
  nonce,
  newServerVersionMessage = "There has been an update. Please reload the page.",
  offlineMessage = "Failed to connect. Please check your internet connection and try reloading the page.",
  liveReload = false,
}) {
  const body = document.querySelector("body");
  let connected;
  let shouldLiveReloadOnNextConnection = false;
  let inLiveNavigation = false;
  let abortController;

  window.addEventListener(
    "livenavigate",
    (event) => {
      event.detail.request.headers.set("Live-Connection-Abort", nonce);
      inLiveNavigation = true;
      abortController?.abort();
    },
    { once: true }
  );

  while (true) {
    try {
      connected = false;

      abortController = new AbortController();
      const abort = () => {
        abortController.abort();
      };
      let heartbeatTimeout = window.setTimeout(abort, 50 * 1000);

      const response = await fetch(window.location.href, {
        cache: "no-store",
        headers: { "Live-Connection": nonce },
        signal: abortController.signal,
      });

      if (shouldLiveReloadOnNextConnection) {
        abort();
        if (response.status === 502)
          throw new Error("Server hasn’t started yet.");
        document.querySelector("body").isModified = false;
        window.location.reload();
        return;
      }

      if (response.status === 422) {
        console.error(response);
        (body.liveConnectionValidationErrorTooltip ??= tippy(body)).setProps({
          appendTo: body,
          trigger: "manual",
          hideOnClick: false,
          theme: "error",
          arrow: false,
          interactive: true,
          content:
            "Failed to connect to server. Please try reloading the page.",
        });
        body.liveConnectionValidationErrorTooltip.show();
        return;
      }
      if (!response.ok) throw new Error("Response isn’t OK");
      connected = true;

      body.liveConnectionOfflineTooltip?.hide();

      const newServerVersion = response.headers.get("Version");
      if (
        typeof serverVersion === "string" &&
        typeof newServerVersion === "string" &&
        serverVersion !== newServerVersion
      ) {
        console.error(
          `NEW SERVER VERSION: ${serverVersion} → ${newServerVersion}`
        );
        (body.liveConnectionNewServerVersionTooltip ??= tippy(body)).setProps({
          appendTo: body,
          trigger: "manual",
          hideOnClick: false,
          theme: "error",
          arrow: false,
          interactive: true,
          content: newServerVersionMessage,
        });
        body.liveConnectionNewServerVersionTooltip.show();
        abort();
        return;
      }

      const responseBodyReader = response.body.getReader();
      const textDecoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const chunk = (await responseBodyReader.read()).value;
        if (chunk === undefined) break;
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = window.setTimeout(abort, 50 * 1000);
        buffer += textDecoder.decode(chunk, { stream: true });
        const bufferParts = buffer.split("\n");
        buffer = bufferParts.pop();
        const bufferPart = bufferParts
          .reverse()
          .find((bufferPart) => bufferPart.trim() !== "");
        if (bufferPart === undefined) continue;
        const bufferPartJSON = JSON.parse(bufferPart);
        if (inLiveNavigation) return;
        loadDocument(bufferPartJSON, {
          previousLocation: { ...window.location },
          liveUpdate: true,
        });
      }
    } catch (error) {
      if (inLiveNavigation) return;

      console.error(error);

      if (!connected) {
        (body.liveConnectionOfflineTooltip ??= tippy(body)).setProps({
          appendTo: body,
          trigger: "manual",
          hideOnClick: false,
          theme: "error",
          arrow: false,
          interactive: true,
          content: liveReload ? "Live-Reloading…" : offlineMessage,
        });
        body.liveConnectionOfflineTooltip.show();
        shouldLiveReloadOnNextConnection = liveReload;
      }
    }

    nonce = Math.random().toString(36).slice(2);

    await new Promise((resolve) => {
      window.setTimeout(resolve, liveReload ? 200 : 1000);
    });
  }
}

export function loadDocument(documentString, detail) {
  const newDocument = new DOMParser().parseFromString(
    documentString,
    "text/html"
  );
  document.querySelector("title").textContent =
    newDocument.querySelector("title").textContent;
  if (!detail.liveUpdate)
    for (const element of document.querySelectorAll(`[key="local-css"]`))
      element.remove();
  for (const element of newDocument.querySelectorAll(`[key="local-css"]`))
    document.querySelector("head").insertAdjacentElement("beforeend", element);
  if (!detail.liveUpdate) tippyStatic.hideAll();
  morph(
    document.querySelector("body"),
    newDocument.querySelector("body"),
    detail
  );
  window.dispatchEvent(new CustomEvent("DOMContentLoaded", { detail }));
  if (!detail.liveUpdate) document.querySelector("[autofocus]")?.focus();
}

export function loadPartial(parentElement, partialString) {
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
  const HTMLForJavaScript = document.querySelector(
    `[key="html-for-javascript"]`
  );
  const partialHTMLForJavaScript = partialDocument.querySelector(
    `[key="html-for-javascript"]`
  );
  partialHTMLForJavaScript.remove();
  morph(parentElement, partialDocument.querySelector("body"));
  morph(HTMLForJavaScript, partialHTMLForJavaScript);
  parentElement.partialParentElement = true;
  parentElement.forceIsConnected = true;
  for (const element of [
    ...parentElement.querySelectorAll("[onload]"),
    ...HTMLForJavaScript.querySelectorAll("[onload]"),
  ])
    new Function(element.getAttribute("onload")).call(element);
  parentElement.forceIsConnected = false;
}

export function morph(from, to, detail = {}) {
  const fromChildNodes = from.childNodes;
  const toChildNodes = to.childNodes;
  const getKey = (node) =>
    `${node.nodeType}--${
      node.nodeType === node.ELEMENT_NODE
        ? `${node.tagName}--${node.getAttribute("key")}`
        : node.nodeValue
    }`;
  const fromKeys = [...fromChildNodes].map(getKey);
  const toKeys = [...toChildNodes].map(getKey);
  const diff = [
    [0, 0, 0, 0],
    ...fastMyersDiff.diff(fromKeys, toKeys),
    [
      fromChildNodes.length,
      fromChildNodes.length,
      toChildNodes.length,
      toChildNodes.length,
    ],
  ];
  const toRemove = [];
  const moveCandidates = new Map();
  for (let diffIndex = 1; diffIndex < diff.length; diffIndex++) {
    const [fromStart, fromEnd, toStart, toEnd] = diff[diffIndex];
    for (let nodeIndex = fromStart; nodeIndex < fromEnd; nodeIndex++) {
      const node = fromChildNodes[nodeIndex];
      const key = fromKeys[nodeIndex];
      if (
        detail.liveUpdate &&
        (node.onbeforeremove?.() === false ||
          node.matches?.("[data-tippy-root]"))
      )
        continue;
      toRemove.push(node);
      moveCandidates.get(key)?.push(node) ?? moveCandidates.set(key, [node]);
    }
  }
  const toAdd = [];
  const toMorph = [];
  for (let diffIndex = 1; diffIndex < diff.length; diffIndex++) {
    const [previousFromStart, previousFromEnd, previousToStart, previousToEnd] =
      diff[diffIndex - 1];
    const [fromStart, fromEnd, toStart, toEnd] = diff[diffIndex];
    for (
      let nodeIndexOffset = 0;
      nodeIndexOffset < fromStart - previousFromEnd;
      nodeIndexOffset++
    )
      toMorph.push({
        from: fromChildNodes[previousFromEnd + nodeIndexOffset],
        to: toChildNodes[previousToEnd + nodeIndexOffset],
      });
    if (toStart === toEnd) continue;
    const nodes = [];
    for (let nodeIndex = toStart; nodeIndex < toEnd; nodeIndex++) {
      const toChildNode = toChildNodes[nodeIndex];
      let node = moveCandidates.get(toKeys[nodeIndex])?.shift();
      if (node === undefined) node = document.importNode(toChildNode, true);
      else toMorph.push({ from: node, to: toChildNode });
      nodes.push(node);
    }
    toAdd.push({ nodes, nodeAfter: fromChildNodes[fromEnd] });
  }
  for (const node of toRemove) from.removeChild(node);
  for (const { nodeAfter, nodes } of toAdd)
    if (nodeAfter !== undefined)
      for (const node of nodes) from.insertBefore(node, nodeAfter);
    else for (const node of nodes) from.appendChild(node);
  for (const { from, to } of toMorph) {
    if (from.nodeType !== from.ELEMENT_NODE) continue;
    for (const attribute of new Set([
      ...from.getAttributeNames(),
      ...to.getAttributeNames(),
    ])) {
      if (
        attribute === "style" ||
        (detail.liveUpdate &&
          ["hidden", "value", "checked", "disabled", "indeterminate"].includes(
            attribute
          ))
      )
        continue;
      const fromAttribute = from.getAttribute(attribute);
      const toAttribute = to.getAttribute(attribute);
      if (toAttribute === null) from.removeAttribute(attribute);
      else if (fromAttribute !== toAttribute)
        from.setAttribute(attribute, toAttribute);
    }
    if (!detail.liveUpdate)
      switch (from.tagName.toLowerCase()) {
        case "input":
          for (const property of [
            "value",
            "checked",
            "disabled",
            "indeterminate",
          ])
            if (from[property] !== to[property]) from[property] = to[property];
          break;
        case "textarea":
          if (from.value !== to.value) from.value = to.value;
          break;
      }
    if (!(detail.liveUpdate && from.partialParentElement === true))
      morph(from, to, detail);
  }
}

export function validate(element) {
  const elementsToValidate = descendants(element);
  const elementsToReset = new Map();

  for (const element of elementsToValidate) {
    if (
      element.closest("[disabled]") !== null ||
      ancestors(element).some((element) => element.isValid === true)
    )
      continue;
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
    if (element.closest("[required]"))
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
          if (element.value.trim() === "") return "Please fill out this field.";
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
      element.value.match(regExps.email) === null
    )
      return "Please enter an email address.";

    const error = element.onvalidate?.();
    if (typeof error === "string") return error;
  }
}

export function isModified(element) {
  const elementsToCheck = descendants(element);
  for (const element of elementsToCheck) {
    if (
      ancestors(element).some((element) => element.isModified === false) ||
      element.closest("[disabled]") !== null
    )
      continue;
    if (ancestors(element).some((element) => element.isModified === true))
      return true;
    if (["radio", "checkbox"].includes(element.type)) {
      if (element.checked !== element.defaultChecked) return true;
    } else if (element.matches("option")) {
      if (element.selected !== element.defaultSelected) return true;
    } else if (
      typeof element.value === "string" &&
      typeof element.defaultValue === "string"
    )
      if (element.value !== element.defaultValue) return true;
  }
  return false;
}

export const relativizeDateTime = (() => {
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
    {
      preposition = undefined,
      dateOnly = true,
      capitalize: shouldCapitalize = false,
    } = {}
  ) => {
    const difference = new Date(dateString.trim()).getTime() - Date.now();
    const absoluteDifference = Math.abs(difference);
    const relativeDateTime =
      absoluteDifference < minute
        ? "just now"
        : absoluteDifference < hour
        ? relativeTimeFormat.format(Math.trunc(difference / minute), "minutes")
        : absoluteDifference < day
        ? relativeTimeFormat.format(Math.trunc(difference / hour), "hours")
        : absoluteDifference < month
        ? relativeTimeFormat.format(Math.trunc(difference / day), "days")
        : `${preposition === undefined ? "" : `${preposition} `}${
            dateOnly ? localizeDate(dateString) : localizeDateTime(dateString)
          }`;
    return shouldCapitalize ? capitalize(relativeDateTime) : relativeDateTime;
  };
})();

export function relativizeDateTimeElement(element, options = {}) {
  const target = options.target ?? element;
  window.clearTimeout(element.relativizeDateTimeElementTimeout);
  (function update() {
    if (!isConnected(element)) return;
    const dateTime = element.getAttribute("datetime");
    (target.relativizeDateTimeElementTooltip ??= tippy(target)).setProps({
      touch: false,
      content: formatUTCDateTime(dateTime),
    });
    element.textContent = relativizeDateTime(dateTime, options);
    element.relativizeDateTimeElementTimeout = window.setTimeout(
      update,
      10 * 1000
    );
  })();
}

export function relativizeDate(dateString) {
  const date = localizeDate(dateString);
  const today = localizeDate(new Date().toISOString());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localizeDate(yesterdayDate.toISOString());
  return date === today
    ? "Today"
    : date === yesterday
    ? "Yesterday"
    : `${date} · ${weekday(date)}`;
}

export function relativizeDateElement(element) {
  window.clearTimeout(element.relativizeDateElementTimeout);
  (function update() {
    if (!isConnected(element)) return;
    element.textContent = relativizeDate(element.getAttribute("datetime"));
    element.relativizeDateElementTimeout = window.setTimeout(update, 60 * 1000);
  })();
}

export function localizeDateTime(dateString) {
  return `${localizeDate(dateString)} ${localizeTime(dateString)}`;
}

export function validateLocalizedDateTime(element) {
  const date = UTCizeDateTime(element.value);
  if (date === undefined)
    return "Invalid date & time. Match the pattern YYYY-MM-DD HH:MM.";
  element.value = date.toISOString();
}

export function localizeDate(dateString) {
  const date = new Date(dateString.trim());
  return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

export function localizeTime(dateString) {
  const date = new Date(dateString.trim());
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export function formatUTCDateTime(dateString) {
  const date = new Date(dateString.trim());
  return `${String(date.getUTCFullYear())}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")} ${String(
    date.getUTCHours()
  ).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")} UTC`;
}

export function UTCizeDateTime(dateString) {
  if (dateString.match(regExps.localizedDateTime) === null) return;
  const date = new Date(dateString.trim().replace(" ", "T"));
  if (isNaN(date.getTime())) return;
  return date;
}

export const weekday = (() => {
  const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  });

  return (dateString) => dateTimeFormat.format(new Date(dateString.trim()));
})();

export function capitalize(text) {
  return text.length === 0 ? text : `${text[0].toUpperCase()}${text.slice(1)}`;
}

export function saveFormInputValue(element, identifier) {
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
      localStorageItem[window.location.pathname][identifier] = element.checked;
      setLocalStorageItem(localStorageItem);
    };
    element.addEventListener("change", element.saveFormInputValueHandleChange);
  } else if (
    typeof element.value === "string" &&
    typeof element.defaultValue === "string"
  ) {
    element.value = element.defaultValue =
      getLocalStorageItem()?.[window.location.pathname]?.[identifier] ?? "";

    element.removeEventListener("input", element.saveFormInputValueHandleInput);
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
}

export function ancestors(element) {
  const ancestors = [];
  while (element !== null) {
    ancestors.push(element);
    element = element.parentElement;
  }
  return ancestors;
}

export function descendants(element) {
  return element === null ? [] : [element, ...element.querySelectorAll("*")];
}

export function nextSiblings(element) {
  const siblings = [];
  while (element !== null) {
    siblings.push(element);
    element = element.nextElementSibling;
  }
  return siblings;
}

export function previousSiblings(element) {
  const siblings = [];
  while (element !== null) {
    siblings.push(element);
    element = element.previousElementSibling;
  }
  return siblings;
}

export function isConnected(element) {
  for (const ancestor of ancestors(element)) {
    if (ancestor.forceIsConnected === true || ancestor.matches("html"))
      return true;
    if (ancestor.matches("[data-tippy-root]"))
      return isConnected(ancestor._tippy.reference);
  }
  return false;
}

// https://github.com/ccampbell/mousetrap/blob/2f9a476ba6158ba69763e4fcf914966cc72ef433/mousetrap.js#L135
export const isAppleDevice = /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export const regExps = {
  email: /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i,
  localizedDateTime: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
};
