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

/*
- Mail.app
  - Same day: hour
  - Day before: Yesterday
  - Older than that: Date

- GitHub
  - Minutes ago
  - Hours ago
  - Yesterday
  - Days ago
  - Older than one month: Date
*/
const leafac = {
  relativizeTime: (element) => {
    const relativeTimeFormat = new Intl.RelativeTimeFormat("en-US", {
      localeMatcher: "lookup",
      numeric: "auto",
    });

    const minutes = 60 * 1000;
    const hours = 60 * minutes;
    const days = 24 * hours;
    const weeks = 7 * days;
    const months = 30 * days;
    const years = 365 * days;

    const datetime = element.textContent.trim();
    element.setAttribute("datetime", datetime);
    tippy(element, {
      content: datetime,
      touch: false,
    });

    (function update() {
      const difference = new Date(datetime).getTime() - Date.now();
      const absoluteDifference = Math.abs(difference);
      const [value, unit] =
        absoluteDifference < minutes
          ? [0, "seconds"]
          : absoluteDifference < hours
          ? [difference / minutes, "minutes"]
          : absoluteDifference < days
          ? [difference / hours, "hours"]
          : absoluteDifference < weeks
          ? [difference / days, "days"]
          : absoluteDifference < months
          ? [difference / weeks, "weeks"]
          : absoluteDifference < years
          ? [difference / months, "months"]
          : [difference / years, "years"];
      element.textContent = relativeTimeFormat.format(
        // FIXME: Should this really be ‘round’, or should it be ‘floor/ceil’?
        Math.round(value),
        unit
      );
      window.setTimeout(update, 10 * 1000);
    })();
  },
};
