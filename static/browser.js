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
  getDate: (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getFullYear())}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  },

  getTime: (dateString) => {
    const date = new Date(dateString);
    return `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`;
  },

  getDateTime: (dateString) =>
    `${leafac.getDate(dateString)} ${leafac.getTime(dateString)}`,

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
        : `at ${leafac.getDateTime(dateString)}`;
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
};
