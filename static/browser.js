window.addEventListener("DOMContentLoaded", () => {
  for (const element of document.querySelectorAll("[ondomcontentloaded]"))
    new Function(element.getAttribute("ondomcontentloaded")).call(element);
});

if (tippy !== undefined)
  tippy.setDefaultProps({
    arrow: tippy.roundArrow + tippy.roundArrow,
    duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 1
      : 150,
  });

const leafac = {
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
    if (dateString.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/) === null) return;
    const date = new Date(dateString.replace(" ", "T"));
    if (isNaN(date.getTime())) return;
    return date;
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

  warnAboutLosingInputs: (() => {
    const warnAboutLosingInputs = (event) => {
      if (!isModified(document.body)) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnAboutLosingInputs);
    document.addEventListener("submit", (event) => {
      window.removeEventListener(
        "beforeunload",
        warnAboutLosingInputs
      );
    });
  })()
};
