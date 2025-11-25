/********************************************************************************/

import * as javascript from "@radically-straightforward/javascript/static/index.mjs";
import * as utilities from "@radically-straightforward/utilities";
import html from "@radically-straightforward/html";
import emailAddresses from "email-addresses";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkStringify from "remark-stringify";


/********************************************************************************/

javascript?.execute?.functions?.set?.("fnsimenpfcbdnl", async function() {
  this.onvalidate = () => {
    if (
      this.value !==
      this.closest('[type~="form"]').querySelector('[name="password"]').value
    )
      throw new javascript.ValidationError(
        "“Password” and “Password confirmation” don’t match.",
      );
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("wgizvcxdopemx", async function($$0) {
  this.textContent = javascript.localizeTime($$0);
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("gzryfnwbnildue", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]').querySelector(
      '[key~="twoFactorAuthenticationCode"]',
    ).hidden = true;
    this.closest('[type~="form"]').querySelector(
      '[name="twoFactorAuthenticationCode"]',
    ).disabled = true;
    this.closest('[type~="form"]').querySelector(
      '[key~="twoFactorAuthenticationRecoveryCode"]',
    ).hidden = false;
    this.closest('[type~="form"]').querySelector(
      '[name="twoFactorAuthenticationRecoveryCode"]',
    ).disabled = false;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("gdgeclrzhpmrt", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]').querySelector(
      '[key~="twoFactorAuthenticationCode"]',
    ).hidden = false;
    this.closest('[type~="form"]').querySelector(
      '[name="twoFactorAuthenticationCode"]',
    ).disabled = false;
    this.closest('[type~="form"]').querySelector(
      '[key~="twoFactorAuthenticationRecoveryCode"]',
    ).hidden = true;
    this.closest('[type~="form"]').querySelector(
      '[name="twoFactorAuthenticationRecoveryCode"]',
    ).disabled = true;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("geayfipxrafjfi", async function() {
  javascript.popover({ element: this });
  this.onclick = () => {
    const element = this.closest(
      '[key~="courseConversationMessageContentEditor"]',
    ).querySelector(
      '[key~="courseConversationMessageContentEditor--textarea"]',
    );
    element.focus();
    const previousSelectionStart = element.selectionStart;
    if (element.selectionStart === element.selectionEnd) {
      document.execCommand("insertText", false, "**BOLD**");
      element.selectionStart = previousSelectionStart + "**".length;
      element.selectionEnd = previousSelectionStart + "**BOLD".length;
    } else {
      const selection = element.value.substring(
        element.selectionStart,
        element.selectionEnd,
      );
      document.execCommand("insertText", false, `**${selection}**`);
      element.selectionStart = previousSelectionStart + "**".length;
      element.selectionEnd = previousSelectionStart + `**${selection}`.length;
    }
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("eeoftmbgadsthj", async function() {
  javascript.popover({ element: this });
  this.onclick = () => {
    const element = this.closest(
      '[key~="courseConversationMessageContentEditor"]',
    ).querySelector(
      '[key~="courseConversationMessageContentEditor--textarea"]',
    );
    element.focus();
    const previousSelectionStart = element.selectionStart;
    if (element.selectionStart === element.selectionEnd) {
      document.execCommand(
        "insertText",
        false,
        "[LINK DESCRIPTION](https://example.com)",
      );
      element.selectionStart = previousSelectionStart + "[".length;
      element.selectionEnd =
        previousSelectionStart + "[LINK DESCRIPTION".length;
    } else {
      const selection = element.value.substring(
        element.selectionStart,
        element.selectionEnd,
      );
      if (
        (() => {
          try {
            new URL(selection);
            return true;
          } catch {
            return false;
          }
        })()
      ) {
        document.execCommand(
          "insertText",
          false,
          `[LINK DESCRIPTION](${selection})`,
        );
        element.selectionStart = previousSelectionStart + "[".length;
        element.selectionEnd =
          previousSelectionStart + "[LINK DESCRIPTION".length;
      } else {
        document.execCommand(
          "insertText",
          false,
          `[${selection}](https://example.com)`,
        );
        element.selectionStart =
          previousSelectionStart + `[${selection}](`.length;
        element.selectionEnd =
          previousSelectionStart + `[${selection}](https://example.com`.length;
      }
    }
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("hbelxcczbdtpqt", async function() {
  const popover = javascript.popover({
    element: this.querySelector("label"),
    target: this.querySelector("label").nextElementSibling.nextElementSibling,
    trigger: "none",
  });
  this.onchange = utilities.foregroundJob(async () => {
    popover.showPopover();
    const responseText = await (
      await fetch(this.getAttribute("action"), {
        method: this.getAttribute("method"),
        headers: { "CSRF-Protection": "true" },
        body: javascript.serialize(this),
      })
    ).text();
    const element = this.closest(
      '[key~="courseConversationMessageContentEditor"]',
    ).querySelector(
      '[key~="courseConversationMessageContentEditor--textarea"]',
    );
    element.focus();
    element.selectionStart = element.selectionEnd;
    document.execCommand(
      "insertText",
      false,
      (0 < element.selectionStart &&
      !element.value[element.selectionStart - 1].match(/\s/)
        ? " "
        : "") +
        responseText +
        " ",
    );
    popover.hidePopover();
  });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bilxkkotcecjjl", async function() {
  javascript.popover({ element: this });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("dhvxrwwcfyejqj", async function() {
  javascript.popover({ element: this });
  this.onclick = () => {
    const element = this.closest(
      '[key~="courseConversationMessageContentEditor"]',
    ).querySelector(
      '[key~="courseConversationMessageContentEditor--textarea"]',
    );
    element.focus();
    element.selectionEnd = element.selectionStart;
    const previousSelectionStart = element.selectionStart;
    document.execCommand(
      "insertText",
      false,
      "\n\n<poll>\n\n- [ ] OPTION 1\n- [ ] OPTION 2\n- [ ] ...\n\n</poll>\n\n",
    );
    element.selectionStart =
      previousSelectionStart + "\n\n<poll>\n\n- [ ] ".length;
    element.selectionEnd =
      previousSelectionStart + "\n\n<poll>\n\n- [ ] OPTION 1".length;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("gazpcrybdnmzas", async function() {
  javascript.popover({ element: this });
  this.onclick = () => {
    const element = this.closest(
      '[key~="courseConversationMessageContentEditor"]',
    ).querySelector(
      '[key~="courseConversationMessageContentEditor--textarea"]',
    );
    element.focus();
    const previousSelectionStart = element.selectionStart;
    if (element.selectionStart === element.selectionEnd) {
      document.execCommand("insertText", false, "\n\n$$\nLATEX\n$$\n\n");
      element.selectionStart = previousSelectionStart + "\n\n$$\n".length;
      element.selectionEnd = previousSelectionStart + "\n\n$$\nLATEX".length;
    } else {
      const selection = element.value.substring(
        element.selectionStart,
        element.selectionEnd,
      );
      document.execCommand("insertText", false, `\n\n$$\n${selection}\n$$\n\n`);
      element.selectionStart = previousSelectionStart + `\n\n$$\n`.length;
      element.selectionEnd =
        previousSelectionStart + `\n\n$$\n${selection}`.length;
    }
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("gmyjjmlqilgdng", async function() {
  javascript.popover({ element: this });
  this.onclick = () => {
    const element = this.closest(
      '[key~="courseConversationMessageContentEditor"]',
    ).querySelector(
      '[key~="courseConversationMessageContentEditor--textarea"]',
    );
    element.focus();
    const previousSelectionStart = element.selectionStart;
    if (element.selectionStart === element.selectionEnd) {
      document.execCommand(
        "insertText",
        false,
        "\n\n```LANGUAGE\nCODE\n```\n\n",
      );
      element.selectionStart = previousSelectionStart + "\n\n```".length;
      element.selectionEnd = previousSelectionStart + "\n\n```LANGUAGE".length;
    } else {
      const selection = element.value.substring(
        element.selectionStart,
        element.selectionEnd,
      );
      document.execCommand(
        "insertText",
        false,
        `\n\n\`\`\`LANGUAGE\n${selection}\n\`\`\`\n\n`,
      );
      element.selectionStart = previousSelectionStart + `\n\n\`\`\``.length;
      element.selectionEnd =
        previousSelectionStart + `\n\n\`\`\`LANGUAGE`.length;
    }
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bysereuwinvzll", async function() {
  javascript.popover({ element: this });
  javascript.popover({
    element: this,
    target: this.nextElementSibling.nextElementSibling,
    trigger: "click",
    remainOpenWhileFocused: true,
    placement: "top-start",
    onshow: () => {
      this.nextElementSibling.nextElementSibling
        .querySelector(
          '[key~="courseConversationMessageContentEditor--mention--input"]',
        )
        .focus();
      this.nextElementSibling.nextElementSibling
        .querySelector(
          '[key~="courseConversationMessageContentEditor--mention--input"]',
        )
        .select();
    },
  });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("dwwkohdaupqywf", async function() {
  this.onclick = () => {
    const element = this.closest(
      '[key~="courseConversationMessageContentEditor"]',
    ).querySelector(
      '[key~="courseConversationMessageContentEditor--textarea"]',
    );
    element.click();
    element.focus();
    element.selectionEnd = element.selectionStart;
    document.execCommand(
      "insertText",
      false,
      `${0 < element.selectionStart && !element.value[element.selectionStart - 1].match(/\s/) ? " " : ""}@everyone `,
    );
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("hgyaslfyhpaubs", async function() {
  this.onclick = () => {
    const element = this.closest(
      '[key~="courseConversationMessageContentEditor"]',
    ).querySelector(
      '[key~="courseConversationMessageContentEditor--textarea"]',
    );
    element.click();
    element.focus();
    element.selectionEnd = element.selectionStart;
    document.execCommand(
      "insertText",
      false,
      `${0 < element.selectionStart && !element.value[element.selectionStart - 1].match(/\s/) ? " " : ""}@instructors `,
    );
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("hfanrrgwiuzoqn", async function() {
  this.onclick = () => {
    const element = this.closest(
      '[key~="courseConversationMessageContentEditor"]',
    ).querySelector(
      '[key~="courseConversationMessageContentEditor--textarea"]',
    );
    element.click();
    element.focus();
    element.selectionEnd = element.selectionStart;
    document.execCommand(
      "insertText",
      false,
      `${0 < element.selectionStart && !element.value[element.selectionStart - 1].match(/\s/) ? " " : ""}@students `,
    );
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("byxazmspqehzpf", async function() {
  this.isModified = false;
  this.onkeyup = utilities.foregroundJob(() => {
    const search = new Set(
      utilities
        .tokenize(this.value)
        .map((tokenWithPosition) => tokenWithPosition.token),
    );
    for (const element of this.closest(
      '[key~="courseConversationMessageContentEditor--mention"]',
    ).querySelector(
      '[key~="courseConversationMessageContentEditor--mention--courseParticipations"]',
    ).children) {
      const nameElement = element.querySelector(
        '[key~="courseConversationMessageContentEditor--mention--courseParticipation--name"]',
      );
      nameElement.innerHTML = utilities.highlight(
        html`${nameElement.name}`,
        search,
        { prefix: true },
      );
      nameElement.morph = nameElement.querySelector("span") === null;
      element.hidden =
        0 < search.size && nameElement.querySelector("span") === null;
    }
  });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("hjvkpdeectitcp", async function($$0, $$1) {
  this.onclick = () => {
    const element = this.closest(
      '[key~="courseConversationMessageContentEditor"]',
    ).querySelector(
      '[key~="courseConversationMessageContentEditor--textarea"]',
    );
    element.click();
    element.focus();
    element.selectionEnd = element.selectionStart;
    document.execCommand(
      "insertText",
      false,
      `${0 < element.selectionStart && !element.value[element.selectionStart - 1].match(/\s/) ? " " : ""}@${$$0}--${$$1} `,
    );
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fsvgtnycphfbcs", async function($$0) {
  this.name = $$0;
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("cnoplbjobfcctr", async function() {
  javascript.popover({ element: this });
  javascript.popover({
    element: this,
    target: this.nextElementSibling.nextElementSibling,
    trigger: "click",
    remainOpenWhileFocused: true,
    placement: "top-start",
    onshow: () => {
      this.nextElementSibling.nextElementSibling
        .querySelector(
          '[key~="courseConversationMessageContentEditor--reference--input"]',
        )
        .focus();
      this.nextElementSibling.nextElementSibling
        .querySelector(
          '[key~="courseConversationMessageContentEditor--reference--input"]',
        )
        .select();
    },
  });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("erzkqhirvawenw", async function() {
  this.isModified = false;
  this.onkeyup = utilities.foregroundJob(() => {
    const search = new Set(
      utilities
        .tokenize(this.value)
        .map((tokenWithPosition) => tokenWithPosition.token),
    );
    for (const element of this.closest(
      '[key~="courseConversationMessageContentEditor--reference"]',
    ).querySelector(
      '[key~="courseConversationMessageContentEditor--reference--courseConversations"]',
    ).children) {
      const titleElement = element.querySelector(
        '[key~="courseConversationMessageContentEditor--reference--courseConversation--title"]',
      );
      titleElement.innerHTML = utilities.highlight(
        html`${titleElement.title}`,
        search,
        { prefix: true },
      );
      titleElement.morph = titleElement.querySelector("span") === null;
      element.hidden =
        0 < search.size && titleElement.querySelector("span") === null;
    }
  });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bspppjqrwrautt", async function($$0) {
  this.onclick = () => {
    const element = this.closest(
      '[key~="courseConversationMessageContentEditor"]',
    ).querySelector(
      '[key~="courseConversationMessageContentEditor--textarea"]',
    );
    element.click();
    element.focus();
    element.selectionEnd = element.selectionStart;
    document.execCommand(
      "insertText",
      false,
      `${0 < element.selectionStart && !element.value[element.selectionStart - 1].match(/\s/) ? " " : ""}#${$$0} `,
    );
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bahprvgsbupjfv", async function($$0) {
  this.title = $$0;
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("gucsrcxuqgeori", async function() {
  this.onchange = () => {
    if (this.querySelector("input").checked)
      this.querySelector("div").classList.add("button--blue");
    else this.querySelector("div").classList.remove("button--blue");
  };
  this.onchange();
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bbghidpqcqkvtb", async function($$0) {
  javascript.popover({ element: this });
  this.onclick = async () => {
    if (
      this.closest(
        '[key~="courseConversationMessageContentEditor"]',
      ).getAttribute("state") === null
    )
      try {
        if (
          !javascript.validate(
            this.closest(
              '[key~="courseConversationMessageContentEditor"]',
            ).querySelector(
              '[key~="courseConversationMessageContentEditor--textarea"]',
            ),
          )
        )
          return;
        this.closest(
          '[key~="courseConversationMessageContentEditor"]',
        ).setAttribute("state", "loading");
        this.updateClass();
        this.abortController = new AbortController();
        javascript.mount(
          this.closest(
            '[key~="courseConversationMessageContentEditor"]',
          ).querySelector(
            '[key~="courseConversationMessageContentEditor--preview"]',
          ).firstElementChild,
          await (
            await fetch($$0, {
              method: "POST",
              headers: { "CSRF-Protection": "true" },
              body: new URLSearchParams(
                javascript.serialize(
                  this.closest(
                    '[key~="courseConversationMessageContentEditor"]',
                  ).querySelector(
                    '[key~="courseConversationMessageContentEditor--textarea"]',
                  ),
                ),
              ),
              signal: this.abortController.signal,
            })
          ).text(),
        );
        this.closest(
          '[key~="courseConversationMessageContentEditor"]',
        ).setAttribute("state", "preview");
      } catch (error) {
        if (error.name !== "AbortError") throw error;
      }
    else {
      this.abortController.abort();
      this.closest(
        '[key~="courseConversationMessageContentEditor"]',
      ).removeAttribute("state");
      this.updateClass();
    }
  };
  this.updateClass = () => {
    if (
      typeof this.closest(
        '[key~="courseConversationMessageContentEditor"]',
      ).getAttribute("state") === "string"
    )
      this.classList.add("button--blue");
    else this.classList.remove("button--blue");
  };
  this.updateClass();
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bvaaqmdvccxezj", async function($$0) {
  this.onpaste = async (event) => {
    if (0 < event.clipboardData.files.length) {
      event.preventDefault();
      this.closest(
        '[key~="courseConversationMessageContentEditor"]',
      ).querySelector('[name="attachments[]"]').files =
        event.clipboardData.files;
      this.closest('[key~="courseConversationMessageContentEditor"]')
        .querySelector('[name="attachments[]"]')
        .dispatchEvent(
          new Event("change", {
            bubbles: true,
            cancelable: false,
            composed: false,
          }),
        );
      return;
    }
    if (
      this.closest(
        '[key~="courseConversationMessageContentEditor"]',
      ).querySelector(
        '[key~="courseConversationMessageContentEditor--richTextClipboard"]',
      ).checked &&
      event.clipboardData.types.includes("text/html")
    ) {
      event.preventDefault();
      document.execCommand(
        "insertText",
        false,
        (
          await unified()
            .use(rehypeParse, { fragment: true })
            .use(rehypeRemark, { document: false })
            .use(remarkGfm, { singleTilde: false })
            .use(remarkMath)
            .use(remarkStringify)
            .process(event.clipboardData.getData("text/html"))
        ).value,
      );
      return;
    }
  };
  if ($$0) {
    this.ondragenter = (event) => {
      if (!event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      javascript.stateAdd(this, "dragging");
    };
    this.ondragleave = (event) => {
      if (!event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
      javascript.stateRemove(this, "dragging");
    };
    this.ondragover = (event) => {
      if (!event.dataTransfer.types.includes("Files")) return;
      event.preventDefault();
    };
    this.ondrop = (event) => {
      if (event.dataTransfer.files.length === 0) return;
      event.preventDefault();
      javascript.stateRemove(this, "dragging");
      this.closest(
        '[key~="courseConversationMessageContentEditor"]',
      ).querySelector('[name="attachments[]"]').files =
        event.dataTransfer.files;
      this.closest('[key~="courseConversationMessageContentEditor"]')
        .querySelector('[name="attachments[]"]')
        .dispatchEvent(
          new Event("change", {
            bubbles: true,
            cancelable: false,
            composed: false,
          }),
        );
    };
  }
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("hbhfqpfzdhhnul", async function() {
  this.isModified = false;
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("qhftzwgpqyazt", async function() {
  this.onsubmit = () => {
    this.closest(
      '[key~="courseConversationMessage--main--content--body"]',
    ).removeAttribute("state");
    this.closest(
      '[key~="courseConversationMessage--main--content--edit"]',
    ).firstElementChild.innerHTML = "";
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fapfmrfcxwlkrs", async function() {
  javascript.popover({ element: this, trigger: "click" });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("dutlccvgzkrque", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector(
        '[name="courseConversationMessageType"][value="courseConversationMessageTypeMessage"]',
      )
      .click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fiqosunmjasjmt", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector(
        '[name="courseConversationMessageType"][value="courseConversationMessageTypeAnswer"]',
      )
      .click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("dtnvkvbqkmgnjj", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector(
        '[name="courseConversationMessageType"][value="courseConversationMessageTypeFollowUpQuestion"]',
      )
      .click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fbbwffuatcfeva", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector(
        '[name="courseConversationMessageVisibility"][value="courseConversationMessageVisibilityEveryone"]',
      )
      .click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("cqbvejburialgk", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector(
        '[name="courseConversationMessageVisibility"][value="courseConversationMessageVisibilityCourseParticipationRoleInstructors"]',
      )
      .click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("gfbylcofaxqexd", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector(
        '[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityNone"]',
      )
      .click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("dgfnwwrkrukqfj", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector(
        '[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityCourseParticipationRoleStudents"]',
      )
      .click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("gdolggrjxbiiar", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector(
        '[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityEveryone"]',
      )
      .click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("cbmbacvesxnxom", async function() {
  this.onclick = () => {
    this.closest(
      '[key~="courseConversationMessage--main--content--body"]',
    ).removeAttribute("state");
    this.closest(
      '[key~="courseConversationMessage--main--content--edit"]',
    ).firstElementChild.innerHTML = "";
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fanjwswbnnhlbq", async function() {
  this.onclick = () => {
    javascript.stateRemove(
      document.querySelector('[key~="main--two-column-layout"]'),
      "sidebar--open",
    );
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("lgsihbfoshzvz", async function() {
  this.isModified = false;
  const popover = javascript.popover({
    element: this,
    trigger: "none",
    placement: "bottom-start",
  });
  this.oninput = this.onfocusin = utilities.foregroundJob(async () => {
    if (this.querySelector('[name="search"]').value.trim() === "") {
      popover.hidePopover();
      return;
    }
    popover.showPopover();
    javascript.mount(
      popover.firstElementChild,
      await (
        await fetch(
          this.getAttribute("action") +
            "?" +
            new URLSearchParams(javascript.serialize(this)),
        )
      ).text(),
    );
    if (popover.matches('[state~="open"]')) popover.showPopover();
  });
  this.onfocusout = () => {
    popover.hidePopover();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("frloujnoieojxm", async function($$0, $$1, $$2) {
  this.pinned = $$0;
  this.firstCourseConversationMessageCreatedAt = $$1;
  this.current = $$2;
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bmdjwcwuchubap", async function($$0) {
  javascript.relativizeDateTimeElement(this, $$0, { capitalize: true });
  javascript.popover({ element: this });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("eapajxashpoyfx", async function($$0) {
  this.textContent = javascript.localizeDateTime($$0);
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fsibdhwvbujkse", async function($$0, $$1, $$2) {
  const courseConversationsGroups = javascript.stringToElement(
    html`<div key="courseConversations--groups"></div>`,
  );
  let currentCourseConversation;
  for (const element of this.closest(
    '[key~="courseConversations"]',
  ).querySelectorAll(
    '[key~="courseConversations--to-group"] [key~="courseConversation"]',
  )) {
    let groupKey;
    let groupSummary;
    if (element.pinned) {
      groupKey = "pinned";
      groupSummary = "Pinned";
    } else {
      const firstCourseConversationMessageCreatedAtWeekStart = new Date(
        element.firstCourseConversationMessageCreatedAt,
      );
      firstCourseConversationMessageCreatedAtWeekStart.setHours(12, 0, 0, 0);
      while (firstCourseConversationMessageCreatedAtWeekStart.getDay() !== 0)
        firstCourseConversationMessageCreatedAtWeekStart.setDate(
          firstCourseConversationMessageCreatedAtWeekStart.getDate() - 1,
        );
      const firstCourseConversationMessageCreatedAtWeekEnd = new Date(
        element.firstCourseConversationMessageCreatedAt,
      );
      firstCourseConversationMessageCreatedAtWeekEnd.setHours(12, 0, 0, 0);
      while (firstCourseConversationMessageCreatedAtWeekEnd.getDay() !== 6)
        firstCourseConversationMessageCreatedAtWeekEnd.setDate(
          firstCourseConversationMessageCreatedAtWeekEnd.getDate() + 1,
        );
      groupKey = javascript.localizeDate(
        firstCourseConversationMessageCreatedAtWeekStart.toISOString(),
      );
      groupSummary = `${javascript.localizeDate(firstCourseConversationMessageCreatedAtWeekStart.toISOString())} — ${javascript.localizeDate(firstCourseConversationMessageCreatedAtWeekEnd.toISOString())}`;
    }
    (
      courseConversationsGroups.querySelector(
        `[key~="courseConversations--groups--group"][key~="${groupKey}"]`,
      ) ??
      courseConversationsGroups.insertAdjacentElement(
        "beforeend",
        javascript.stringToElement(html`
          <details key="courseConversations--groups--group ${groupKey}">
            <summary css="${$$0}">
              <div key="courseConversations--groups--group--view" css="${$$1}">
                <i class="bi bi-circle-fill"></i>
              </div>
              <div>
                <span css="${$$2}">
                  <i class="bi bi-chevron-right"></i>
                </span>
                ${groupSummary}
              </div>
            </summary>
          </details>
        `),
      )
    ).insertAdjacentElement("beforeend", element);
    if (element.current) {
      element
        .closest('[key~="courseConversations--groups--group"]')
        .classList.add("current");
      element.closest('[key~="courseConversations--groups--group"]').open =
        true;
      currentCourseConversation = element;
    }
    if (
      element.querySelector(
        '[key~="courseConversation--sidebar--courseConversationMessageViews"]',
      ) !== null
    )
      element
        .closest('[key~="courseConversations--groups--group"]')
        .querySelector('[key~="courseConversations--groups--group--view"]')
        .classList.add("visible");
  }
  {
    const preopenCourseConversationsGroups = [
      ...courseConversationsGroups.querySelectorAll(
        '[key~="courseConversations--groups--group"]',
      ),
    ].slice(0, 5);
    if (preopenCourseConversationsGroups[0].matches('[key~="pinned"]')) {
      if (
        preopenCourseConversationsGroups[0].querySelector(
          '[key~="courseConversations--groups--group--view"].visible',
        ) === null
      )
        preopenCourseConversationsGroups.shift();
    } else if (preopenCourseConversationsGroups.length === 5)
      preopenCourseConversationsGroups.pop();
    for (const element of preopenCourseConversationsGroups) element.open = true;
  }
  javascript.mount(
    this.querySelector('[key~="courseConversations--groups"]'),
    courseConversationsGroups,
  );
  if (this.firstMount === undefined)
    currentCourseConversation?.scrollIntoView({ block: "center" });
  this.firstMount = false;
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bokwpzlhxmmufg", async function() {
  this.onpointerdown = (event) => {
    if (event.button !== 0) return;
    javascript.stateAdd(this, "active");
    javascript.stateAdd(document.querySelector("body"), "noninteractive");
    document.querySelector("body").style.cursor = "col-resize";
    document.onpointermove = (event) => {
      this.closest('[key~="main--two-column-layout"]')
        .querySelector('[key~="sidebar"]')
        .style.setProperty(
          "--width",
          String(
            Math.min(Math.max(Math.floor(event.clientX), 60 * 4), 112 * 4),
          ) + "px",
        );
    };
    document.onpointerup = () => {
      javascript.stateRemove(this, "active");
      javascript.stateRemove(document.querySelector("body"), "noninteractive");
      document.querySelector("body").style.cursor = "";
      document.onpointermove = undefined;
      document.onpointerup = undefined;
      updateSidebarWidth();
    };
  };
  this.ondblclick = () => {
    this.closest('[key~="main--two-column-layout"]')
      .querySelector('[key~="sidebar"]')
      .style.setProperty("--width", String(80 * 4) + "px");
    updateSidebarWidth();
  };
  const updateSidebarWidth = utilities.foregroundJob(async () => {
    await fetch("/settings/sidebar-width", {
      method: "PATCH",
      headers: { "CSRF-Protection": "true" },
      body: new URLSearchParams({
        sidebarWidth: this.closest('[key~="main--two-column-layout"]')
          .querySelector('[key~="sidebar"]')
          .style.getPropertyValue("--width")
          .slice(0, -"px".length),
      }),
    });
  });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bzqivvtzzxegzx", async function() {
  this.onsubmit = () => {
    delete this.querySelector(
      '[key~="courseConversationParticipations--courseParticipations"]',
    ).morph;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bdvdiukmreeaii", async function() {
  this.onchange = () => {
    if (!this.checked) return;
    this.closest('[type~="form"]')
      .querySelector('[key~="announcement"]')
      ?.removeAttribute("hidden");
    this.closest('[type~="form"]')
      .querySelector('[name="announcement"]')
      ?.removeAttribute("disabled");
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("cqdokcahrbrght", async function() {
  this.onchange = () => {
    if (!this.checked) return;
    this.closest('[type~="form"]')
      .querySelector('[key~="announcement"]')
      ?.setAttribute("hidden", "");
    this.closest('[type~="form"]')
      .querySelector('[name="announcement"]')
      ?.setAttribute("disabled", "");
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fkfkwcgfletxar", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector(
        '[name="courseConversationType"][value="courseConversationTypeNote"]',
      )
      .click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("dodfetcoccxgmx", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector(
        '[name="courseConversationType"][value="courseConversationTypeQuestion"]',
      )
      .click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bansnpwwyxgcom", async function() {
  javascript.popover({
    element: this,
    trigger: "click",
    remainOpenWhileFocused: true,
  });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bwmltdtkaobkib", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector(
        '[name="courseConversationVisibility"][value="courseConversationVisibilityEveryone"]',
      )
      .click();
    this.closest('[type~="popover"]')
      .querySelector('[key~="courseConversationParticipations"]')
      .setHidden();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fbkboculsoymtu", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]').querySelector(
      '[name="courseConversationVisibility"][value="courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"]',
    ).checked = true;
    this.closest('[type~="popover"]')
      .querySelector('[key~="courseConversationParticipations"]')
      .setHidden();
    if (
      this.closest('[type~="popover"]').querySelector(
        '[key~="courseConversationParticipations"]',
      ).hidden
    )
      return;
    this.closest('[type~="popover"]')
      .querySelector('[key~="courseConversationParticipations--input"]')
      .focus();
    this.closest('[type~="popover"]')
      .querySelector('[key~="courseConversationParticipations--input"]')
      .onkeyup();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fiyoauwsatyjsx", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]').querySelector(
      '[name="courseConversationVisibility"][value="courseConversationVisibilityCourseConversationParticipations"]',
    ).checked = true;
    this.closest('[type~="popover"]')
      .querySelector('[key~="courseConversationParticipations"]')
      .setHidden();
    if (
      this.closest('[type~="popover"]').querySelector(
        '[key~="courseConversationParticipations"]',
      ).hidden
    )
      return;
    this.closest('[type~="popover"]')
      .querySelector('[key~="courseConversationParticipations--input"]')
      .focus();
    this.closest('[type~="popover"]')
      .querySelector('[key~="courseConversationParticipations--input"]')
      .onkeyup();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("cvvyhsbebrceoo", async function() {
  this.setHidden = () => {
    this.hidden =
      this.closest('[type~="form"]').querySelector(
        '[name="courseConversationVisibility"]:checked',
      ).value === "courseConversationVisibilityEveryone" ||
      (this.closest('[type~="form"]').querySelector(
        '[name="courseConversationVisibility"]:checked',
      ).value ===
        "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations" &&
        ![
          ...this.closest('[type~="popover"]').querySelector(
            '[key~="courseConversationParticipations--courseParticipations"]',
          ).children,
        ].some(
          (element) =>
            element.courseParticipationRole !==
            "courseParticipationRoleInstructor",
        )) ||
      (this.closest('[type~="form"]').querySelector(
        '[name="courseConversationVisibility"]:checked',
      ).value ===
        "courseConversationVisibilityCourseConversationParticipations" &&
        this.closest('[type~="popover"]').querySelector(
          '[key~="courseConversationParticipations--courseParticipations"]',
        ).children.length === 0);
  };
  this.setHidden();
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("ewgkuljewvxarv", async function() {
  this.isModified = false;
  this.onkeyup = utilities.foregroundJob(() => {
    const search = new Set(
      utilities
        .tokenize(this.value)
        .map((tokenWithPosition) => tokenWithPosition.token),
    );
    for (const element of this.closest('[type~="popover"]').querySelector(
      '[key~="courseConversationParticipations--courseParticipations"]',
    ).children) {
      const nameElement = element.querySelector(
        '[key~="courseConversationParticipations--courseParticipation--name"]',
      );
      nameElement.innerHTML = utilities.highlight(
        html`${nameElement.name}`,
        search,
        { prefix: true },
      );
      nameElement.morph = nameElement.querySelector("span") === null;
      element.hidden =
        (element.courseParticipationRole ===
          "courseParticipationRoleInstructor" &&
          this.closest('[type~="form"]').querySelector(
            '[name="courseConversationVisibility"]:checked',
          ).value ===
            "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations") ||
        (0 < search.size && nameElement.querySelector("span") === null);
    }
  });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("hiqcwjaumhyqgl", async function() {
  this.morph = false;
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bxblkvtsqwvgzz", async function($$0, $$1) {
  this.courseParticipationRole = $$0;
  this.order = $$1;
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("ggbpuhhmzsrqcz", async function() {
  this.onchange = () => {
    const element = this.closest(
      '[key~="courseConversationParticipations--courseParticipation"]',
    );
    for (const otherElement of this.closest('[type~="popover"]').querySelector(
      '[key~="courseConversationParticipations--courseParticipations"]',
    ).children)
      if (
        (this.checked &&
          (otherElement.querySelector(
            '[name="courseConversationParticipations[]"]',
          ).checked === false ||
            element.order < otherElement.order)) ||
        (!this.checked &&
          otherElement.querySelector(
            '[name="courseConversationParticipations[]"]',
          ).checked === false &&
          element.order < otherElement.order)
      ) {
        otherElement.insertAdjacentElement("beforebegin", element);
        return;
      }
    this.closest('[type~="popover"]')
      .querySelector(
        '[key~="courseConversationParticipations--courseParticipations"]',
      )
      .insertAdjacentElement("beforeend", element);
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("jfslnvmzfhuxt", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector('[name="pinned"][value="false"]')
      .click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("drkibswruywsda", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector('[name="pinned"][value="true"]')
      .click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("eoxhbjpcfdphea", async function() {
  this.oninput = () => {
    for (const element of this.querySelectorAll(".hide-on-not-modified"))
      element.hidden = !javascript.isModified(this);
  };
  window.setTimeout(() => {
    this.oninput();
  });
  this.onsubmit = () => {
    this.querySelector(
      '[key~="courseConversation--header--title--show"]',
    ).hidden = false;
    this.querySelector(
      '[key~="courseConversation--header--title--edit"]',
    ).hidden = true;
    delete this.querySelector(
      '[key~="courseConversationParticipations--courseParticipations"]',
    ).morph;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bufpqrvtoxsobs", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]').querySelector(
      '[key~="courseConversation--header--title--show"]',
    ).hidden = false;
    this.closest('[type~="form"]').querySelector(
      '[key~="courseConversation--header--title--edit"]',
    ).hidden = true;
    javascript.reset(
      this.closest('[key~="courseConversation--header--title--edit"]'),
    );
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bwtiyxnryxhhpy", async function() {
  javascript.popover({
    element: this,
    trigger: "click",
    remainOpenWhileFocused: true,
    placement: "bottom-end",
  });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("ebzlonmvwznnjw", async function($$0) {
  const popover = javascript.popover({ element: this, trigger: "none" });
  this.onclick = async () => {
    await navigator.clipboard.writeText($$0);
    popover.showPopover();
    await utilities.sleep(1000);
    popover.hidePopover();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("heraemysgagyfs", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]').querySelector(
      '[key~="courseConversation--header--title--show"]',
    ).hidden = true;
    this.closest('[type~="form"]').querySelector(
      '[key~="courseConversation--header--title--edit"]',
    ).hidden = false;
    this.closest('[type~="form"]')
      .querySelector(
        '[key~="courseConversation--header--title--edit"] [name="title"]',
      )
      .click();
    this.closest('[type~="form"]')
      .querySelector(
        '[key~="courseConversation--header--title--edit"] [name="title"]',
      )
      .focus();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("gjyelxqyhlkoiy", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector('[name="questionResolved"][value="false"]')
      .click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("ghdvrvptozzghj", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]')
      .querySelector('[name="questionResolved"][value="true"]')
      .click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("glgovzbhniuzke", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]').querySelector(
      '[name="courseConversationVisibility"][value="courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"]',
    ).checked = true;
    this.closest('[type~="form"]').oninput();
    this.closest('[type~="popover"]')
      .querySelector('[key~="courseConversationParticipations"]')
      .setHidden();
    if (
      this.closest('[type~="popover"]').querySelector(
        '[key~="courseConversationParticipations"]',
      ).hidden
    )
      return;
    this.closest('[type~="popover"]')
      .querySelector('[key~="courseConversationParticipations--input"]')
      .focus();
    this.closest('[type~="popover"]')
      .querySelector('[key~="courseConversationParticipations--input"]')
      .onkeyup();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("dfcwgifxeowilg", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]').querySelector(
      '[name="courseConversationVisibility"][value="courseConversationVisibilityCourseConversationParticipations"]',
    ).checked = true;
    this.closest('[type~="form"]').oninput();
    this.closest('[type~="popover"]')
      .querySelector('[key~="courseConversationParticipations"]')
      .setHidden();
    if (
      this.closest('[type~="popover"]').querySelector(
        '[key~="courseConversationParticipations"]',
      ).hidden
    )
      return;
    this.closest('[type~="popover"]')
      .querySelector('[key~="courseConversationParticipations--input"]')
      .focus();
    this.closest('[type~="popover"]')
      .querySelector('[key~="courseConversationParticipations--input"]')
      .onkeyup();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("ndocqbdxzmquf", async function() {
  this.isModified = false;
  this.onkeyup = utilities.foregroundJob(() => {
    const search = new Set(
      utilities
        .tokenize(this.value)
        .map((tokenWithPosition) => tokenWithPosition.token),
    );
    for (const element of this.closest('[type~="popover"]').querySelector(
      '[key~="courseConversationParticipations--courseParticipations"]',
    ).children) {
      const nameElement = element.querySelector(
        '[key~="courseConversationParticipations--courseParticipation--name"]',
      );
      nameElement.innerHTML = utilities.highlight(
        html`${nameElement.name}`,
        search,
        { prefix: true },
      );
      nameElement.morph = nameElement.querySelector("span") === null;
      element.hidden =
        (element.courseParticipationRole ===
          "courseParticipationRoleInstructor" &&
          this.closest('[type~="form"]').querySelector(
            '[name="courseConversationVisibility"]:checked',
          ).value ===
            "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations") ||
        (0 < search.size && nameElement.querySelector("span") === null);
    }
  });
  window.setTimeout(() => {
    this.onkeyup();
  });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("ceujwduuppdsmh", async function() {
  this.onchange = () => {
    const element = this.closest(
      '[key~="courseConversationParticipations--courseParticipation"]',
    );
    for (const otherElement of this.closest('[type~="popover"]').querySelector(
      '[key~="courseConversationParticipations--courseParticipations"]',
    ).children)
      if (
        (this.checked &&
          (otherElement.querySelector(
            '[name="courseConversationParticipations[]"]',
          ).checked === false ||
            element.order < otherElement.order)) ||
        (!this.checked &&
          otherElement.querySelector(
            '[name="courseConversationParticipations[]"]',
          ).checked === false &&
          element.order < otherElement.order)
      ) {
        otherElement.insertAdjacentElement("beforebegin", element);
        return;
      }
    this.closest('[type~="popover"]')
      .querySelector(
        '[key~="courseConversationParticipations--courseParticipations"]',
      )
      .insertAdjacentElement("beforeend", element);
  };
  window.setTimeout(() => {
    this.onchange();
  });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("gmhgzxnohlbxwm", async function() {
  this.onclick = () => {
    document.querySelector("body").click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("clbkhesdlixcpj", async function($$0, $$1) {
  this.content = $$0;
  if ($$1) this.scrollIntoView();
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("cplnglxdgnfaty", async function($$0) {
  if (this.intersectionObserver !== undefined) return;
  this.intersectionObserver = new IntersectionObserver(
    async (entries) => {
      if (entries[0].isIntersecting === false) return;
      this.intersectionObserver.disconnect();
      javascript.stateAdd(this, "viewed");
      await fetch($$0, {
        method: "POST",
        headers: { "CSRF-Protection": "true" },
      });
    },
    { root: this.closest('[key~="main--main"]') },
  );
  this.intersectionObserver.observe(this);
  this.onremove = () => {
    this.intersectionObserver.disconnect();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("ccenuyaomfvzaq", async function($$0) {
  javascript.relativizeDateTimeElement(this, $$0, { preposition: true });
  javascript.popover({ element: this });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("erhqaugnznwuxs", async function($$0) {
  this.onclick = () => {
    const element = this.closest('[key~="courseConversation"]').querySelector(
      '[key~="courseConversationMessage--new"] [key~="courseConversationMessageContentEditor--textarea"]',
    );
    element.focus();
    element.click();
    const previousSelectionEnd = element.selectionEnd;
    element.selectionStart = element.selectionEnd;
    document.execCommand(
      "insertText",
      false,
      (0 < element.selectionStart ? "\n\n" : "") +
        $$0 +
        this.closest('[key~="courseConversationMessage"]').content.replaceAll(
          "\n",
          "\n> ",
        ) +
        "\n\n",
    );
    element.selectionStart = element.selectionEnd = previousSelectionEnd;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bgvflvcksqxlvt", async function($$0) {
  this.onclick = async () => {
    if (
      this.closest('[key~="courseConversationMessage"]')
        .querySelector(
          '[key~="courseConversationMessage--main--content--body"]',
        )
        .getAttribute("state") === null
    ) {
      this.closest('[key~="courseConversationMessage"]')
        .querySelector(
          '[key~="courseConversationMessage--main--content--body"]',
        )
        .setAttribute("state", "loading");
      javascript.mount(
        this.closest('[key~="courseConversationMessage"]').querySelector(
          '[key~="courseConversationMessage--main--content--edit"]',
        ).firstElementChild,
        await (await fetch($$0)).text(),
      );
      this.closest('[key~="courseConversationMessage"]')
        .querySelector(
          '[key~="courseConversationMessage--main--content--body"]',
        )
        .setAttribute("state", "edit");
    }
    this.closest('[key~="courseConversationMessage"]')
      .querySelector(
        '[key~="courseConversationMessage--main--content--edit"] [name="content"]',
      )
      .click();
    this.closest('[key~="courseConversationMessage"]')
      .querySelector(
        '[key~="courseConversationMessage--main--content--edit"] [name="content"]',
      )
      .focus();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fsmycahajbrobw", async function() {
  let popoverElementBoundingClientRect;
  const popover = javascript.popover({
    element: { getBoundingClientRect: () => popoverElementBoundingClientRect },
    target: this.nextElementSibling,
    trigger: "none",
  });
  this.onpointerup = (event) => {
    window.setTimeout(() => {
      const selection = document.getSelection();
      if (selection === null) return;
      let startNode;
      let endNode;
      for (
        let rangeIndex = 0;
        rangeIndex < selection.rangeCount;
        rangeIndex++
      ) {
        const range = selection.getRangeAt(rangeIndex);
        if (range.collapsed) continue;
        if (
          startNode === undefined ||
          range.startContainer.compareDocumentPosition(startNode) &
            range.startContainer.DOCUMENT_POSITION_FOLLOWING
        )
          startNode = range.startContainer;
        if (
          endNode === undefined ||
          endNode.compareDocumentPosition(range.endContainer) &
            endNode.DOCUMENT_POSITION_FOLLOWING
        )
          endNode = range.endContainer;
      }
      if (
        startNode === undefined ||
        !this.contains(startNode) ||
        endNode === undefined ||
        !this.contains(endNode)
      )
        return;
      const startElement = (
        startNode.nodeType === startNode.ELEMENT_NODE
          ? startNode
          : startNode.parentElement
      ).closest("[data-position]");
      const endElement = (
        endNode.nodeType === endNode.ELEMENT_NODE
          ? endNode
          : endNode.parentElement
      ).closest("[data-position]");
      if (startElement === null || endElement === null) return;
      this.nextElementSibling.querySelector('[key~="quoteReply"]').quote =
        this.closest('[key~="courseConversationMessage"]').content.slice(
          JSON.parse(startElement.getAttribute("data-position")).start,
          JSON.parse(endElement.getAttribute("data-position")).end,
        );
      popoverElementBoundingClientRect = DOMRect.fromRect({
        x: event.clientX - 10,
        y: event.clientY - 10,
        width: 20,
        height: 20,
      });
      popover.showPopover();
      const abortController = new AbortController();
      for (const eventType of ["pointerdown", "keydown"])
        document.addEventListener(
          eventType,
          () => {
            abortController.abort();
            popover.hidePopover();
          },
          { signal: abortController.signal },
        );
    });
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bhxaxsvinlnrjx", async function() {
  this.onclick = () => {
    if (
      typeof this.closest('[key~="courseConversation"]')
        .querySelector(
          '[key~="courseConversationMessage--new"] [key~="courseConversationMessageContentEditor"]',
        )
        .getAttribute("state") === "string"
    )
      this.closest('[key~="courseConversation"]')
        .querySelector(
          '[key~="courseConversationMessage--new"] [key~="courseConversationMessageContentEditor--preview--button"]',
        )
        .click();
    const element = this.closest('[key~="courseConversation"]').querySelector(
      '[key~="courseConversationMessage--new"] [key~="courseConversationMessageContentEditor--textarea"]',
    );
    element.focus();
    element.click();
    const previousSelectionEnd = element.selectionEnd;
    element.selectionStart = element.selectionEnd;
    document.execCommand(
      "insertText",
      false,
      (0 < element.selectionStart ? "\n\n" : "") +
        "> " +
        this.quote.replaceAll("\n", "\n> ") +
        "\n\n",
    );
    element.selectionStart = element.selectionEnd = previousSelectionEnd;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("dnfwoyfzceqgag", async function($$0) {
  if ($$0) this.hidden = true;
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("dcshlzgqmdunjg", async function($$0) {
  this.isModified = false;
  this.oninput = utilities.foregroundJob(async () => {
    await fetch($$0, {
      method: "POST",
      headers: { "CSRF-Protection": "true" },
      body: new URLSearchParams(javascript.serialize(this)),
    });
  });
  this.onsubmit = async () => {
    this.closest('[key~="courseConversation"]').querySelector(
      '[key~="courseConversationMessage"][key~="latencyCompensation"] [key~="courseConversationMessage--main--content--show--content"]',
    ).textContent = this.querySelector('[name="content"]').value.trim();
    this.closest('[key~="courseConversation"]').querySelector(
      '[key~="courseConversationMessage"][key~="latencyCompensation"]',
    ).hidden = false;
    this.querySelector('[name="content"]').value = "";
    if (
      typeof this.querySelector(
        '[key~="courseConversationMessageContentEditor"]',
      ).getAttribute("state") === "string"
    )
      this.querySelector(
        '[key~="courseConversationMessageContentEditor--preview--button"]',
      ).click();
    await this.oninput.promise;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bypdujthafbmgd", async function($$0, $$1) {
  if (this.firstMount === undefined && $$0)
    this.querySelector('[name="content"]').value = $$1;
  this.firstMount = false;
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("flmrflidilcztk", async function() {
  this.morph = false;
  this.onsubmit = () => {
    delete this.morph;
    delete this.isModified;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fpgvzswzjqotqc", async function() {
  this.onclick = () => {
    const element = this.closest('[key~="courseConversationsTag"]');
    const previousElement = element.previousElementSibling;
    if (previousElement !== null) {
      this.closest('[type~="form"]').isModified = true;
      previousElement.insertAdjacentElement("beforebegin", element);
    }
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("raapodpxpaees", async function() {
  this.onclick = () => {
    const element = this.closest('[key~="courseConversationsTag"]');
    const nextElement = element.nextElementSibling;
    if (nextElement !== null) {
      this.closest('[type~="form"]').isModified = true;
      nextElement.insertAdjacentElement("afterend", element);
    }
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("enkeeezqkvleeu", async function() {
  this.setAttribute("value", utilities.randomString());
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("hhfvkjmyobaeqh", async function() {
  this.setAttribute(
    "name",
    this.getAttribute("name").replace(
      "{tag}",
      this.closest('[key~="courseConversationsTag"]')
        .querySelector('[name="tags[]"]')
        .getAttribute("value"),
    ),
  );
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("djregrgikgoggm", async function($$0) {
  if ($$0) javascript.popover({ element: this, trigger: "click" });
  else
    this.onclick = () => {
      this.nextElementSibling.querySelector("button").click();
    };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fzngseuedhpvjw", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]').isModified = true;
    const courseConversationsTags = this.closest(
      '[key~="courseConversationsTags"]',
    );
    this.closest('[key~="courseConversationsTag"]').remove();
    courseConversationsTags.hidden =
      courseConversationsTags.children.length === 0;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("cmgrdnpfslzoao", async function($$0) {
  this.onclick = () => {
    this.closest('[type~="form"]').isModified = true;
    this.closest('[type~="form"]').querySelector(
      '[key~="courseConversationsTags"]',
    ).hidden = false;
    javascript.execute(
      this.closest('[type~="form"]')
        .querySelector('[key~="courseConversationsTags"]')
        .insertAdjacentElement("beforeend", javascript.stringToElement($$0)),
    );
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("zcevctffnxwrm", async function() {
  this.onclick = () => {
    this.select();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bxcekfnluuskkh", async function() {
  this.onclick = () => {
    this.closest('[key~="invitationLink"]').querySelector(
      '[key~="invitationLinkToken--hide--input"]',
    ).hidden = true;
    this.closest('[key~="invitationLink"]').querySelector(
      '[key~="invitationLinkToken--show--input"]',
    ).hidden = false;
    this.closest('[key~="invitationLink"]').querySelector(
      '[key~="invitationLinkToken--show--button"]',
    ).hidden = true;
    this.closest('[key~="invitationLink"]').querySelector(
      '[key~="invitationLinkToken--hide--button"]',
    ).hidden = false;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("drtxpbbsnfczjc", async function() {
  this.onclick = () => {
    this.closest('[key~="invitationLink"]').querySelector(
      '[key~="invitationLinkToken--hide--input"]',
    ).hidden = false;
    this.closest('[key~="invitationLink"]').querySelector(
      '[key~="invitationLinkToken--show--input"]',
    ).hidden = true;
    this.closest('[key~="invitationLink"]').querySelector(
      '[key~="invitationLinkToken--show--button"]',
    ).hidden = false;
    this.closest('[key~="invitationLink"]').querySelector(
      '[key~="invitationLinkToken--hide--button"]',
    ).hidden = true;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bjubqwccceajhs", async function() {
  this.onclick = () => {
    this.closest('[key~="invitationLink"]').querySelector(
      '[key~="invitationLinkToken--QRCode--show--input"]',
    ).hidden = false;
    this.closest('[key~="invitationLink"]').querySelector(
      '[key~="invitationLinkToken--QRCode--show--button"]',
    ).hidden = true;
    this.closest('[key~="invitationLink"]').querySelector(
      '[key~="invitationLinkToken--QRCode--hide--button"]',
    ).hidden = false;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("bkrkelpfjjjgmq", async function() {
  this.onclick = () => {
    this.closest('[key~="invitationLink"]').querySelector(
      '[key~="invitationLinkToken--QRCode--show--input"]',
    ).hidden = true;
    this.closest('[key~="invitationLink"]').querySelector(
      '[key~="invitationLinkToken--QRCode--show--button"]',
    ).hidden = false;
    this.closest('[key~="invitationLink"]').querySelector(
      '[key~="invitationLinkToken--QRCode--hide--button"]',
    ).hidden = true;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("hbvoxeqvmsxxnc", async function() {
  this.onsubmit = () => {
    javascript.reset(this);
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fgwgfhwnwpehzq", async function() {
  this.onvalidate = () => {
    const addresses = emailAddresses.parseAddressList(
      this.value.replaceAll(/\n+/g, " , "),
    );
    if (
      addresses === null ||
      addresses.length === 0 ||
      addresses.some(
        (address) =>
          address.type !== "mailbox" ||
          address.address.match(utilities.emailRegExp) === null,
      )
    )
      throw new javascript.ValidationError("Invalid email list");
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fnvedsayknktdt", async function($$0) {
  this.onclick = () => {
    this.closest('[key~="courseInvitationEmail"]').querySelector($$0).click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("edahgsbkfqgziv", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]').isModified = true;
    this.closest('[key~="courseInvitationEmail"]').remove();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("cuqnvtrehowhcu", async function($$0) {
  this.onclick = () => {
    this.closest('[key~="courseParticipation"]').querySelector($$0).click();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("dqvknceokefofi", async function() {
  this.onclick = () => {
    this.closest('[type~="form"]').isModified = true;
    this.closest('[key~="courseParticipation"]').remove();
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("dsfhkvmvlppeat", async function($$0, $$1) {
  this.onvalidate = () => {
    if (this.value !== $$0) throw new javascript.ValidationError($$1);
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("enhykhtrxqceju", async function($$0, $$1, $$2) {
  if ($$0) javascript.liveConnection($$1, { reloadOnReconnect: $$2 });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("sdcgktkzyixki", async function() {
  this.morph = false;
  window.setTimeout(() => {
    javascript.stateAdd(this, "hidden");
    this.ontransitionend = (event) => {
      if (
        event.target === this &&
        event.propertyName === "visibility" &&
        window.getComputedStyle(this).visibility === "hidden" &&
        this.matches('[state~="hidden"]')
      )
        this.remove();
    };
  }, 5 * 1000);
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fetcbdiciarnmr", async function() {
  this.onclick = () => {
    javascript.stateAdd(
      document.querySelector('[key~="main--two-column-layout"]'),
      "sidebar--open",
    );
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("dndofjtqpdjikh", async function() {
  javascript.popover({
    element: this,
    trigger: "click",
    placement: "bottom-end",
  });
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("fucudzaskqreza", async function() {
  this.onsubmit = () => {
    delete this.querySelector('[key~="userAvatar--withAvatarImage"]').morph;
    this.querySelector('[name="avatarImage"]').value = "";
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("cnhqkbtnknijxu", async function() {
  this.onchange = async () => {
    if (this.files.length !== 1) return;
    const image = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(this.files[0]);
    });
    this.closest('[type~="form"]').querySelector(
      '[key~="userAvatar--withoutAvatarImage"]',
    ).hidden = true;
    this.closest('[type~="form"]').querySelector(
      '[key~="userAvatar--withAvatarImage"]',
    ).hidden = false;
    this.closest('[type~="form"]')
      .querySelector('[key~="userAvatar--withAvatarImage"] img')
      .setAttribute("src", image);
    this.closest('[type~="form"]').querySelector(
      '[key~="userAvatar--add"]',
    ).hidden = true;
    this.closest('[type~="form"]').querySelector(
      '[key~="userAvatar--change"]',
    ).hidden = false;
    this.closest('[type~="form"]').querySelector(
      '[key~="userAvatar--remove"]',
    ).hidden = false;
    this.closest('[type~="form"]').querySelector(
      '[name="avatarImage--remove"]',
    ).checked = false;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("cwhkintzlatvjd", async function() {
  this.onchange = () => {
    if (!this.checked) return;
    this.closest('[type~="form"]').querySelector(
      '[key~="userAvatar--withoutAvatarImage"]',
    ).hidden = false;
    this.closest('[type~="form"]').querySelector(
      '[key~="userAvatar--withAvatarImage"]',
    ).hidden = true;
    this.closest('[type~="form"]').querySelector('[name="avatarImage"]').value =
      "";
    this.closest('[type~="form"]').querySelector(
      '[key~="userAvatar--add"]',
    ).hidden = false;
    this.closest('[type~="form"]').querySelector(
      '[key~="userAvatar--change"]',
    ).hidden = true;
    this.closest('[type~="form"]').querySelector(
      '[key~="userAvatar--remove"]',
    ).hidden = true;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("elumfhpxnoqcok", async function($$0) {
  this.onvalidate = () => {
    if (this.value === $$0)
      throw new javascript.ValidationError(
        "“New email address” cannot be the same as “Current email address”.",
      );
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("cvefsrbezjlrmb", async function() {
  this.onvalidate = () => {
    if (
      this.value ===
      this.closest('[type~="form"]').querySelector(
        '[name="passwordConfirmation"]',
      ).value
    )
      throw new javascript.ValidationError(
        "“New password” cannot be the same as “Current password”.",
      );
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("cpuywycqgpgvfq", async function() {
  this.onvalidate = () => {
    if (
      this.value !==
      this.closest('[type~="form"]').querySelector('[name="password"]').value
    )
      throw new javascript.ValidationError(
        "“New password” and “New password confirmation” don’t match.",
      );
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("coqannqmgoymuc", async function() {
  this.onchange = () => {
    if (this.checked)
      for (const element of this.closest('[type~="form"]').querySelectorAll(
        "input",
      ))
        element.checked = true;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("cdbyhrepimqnet", async function() {
  this.onchange = () => {
    if (!this.checked)
      this.closest('[type~="form"]').querySelector(
        '[name="emailNotificationsForAllMessages"]',
      ).checked = false;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("gtkcufktpanfb", async function() {
  this.onchange = () => {
    if (!this.checked)
      this.closest('[type~="form"]').querySelector(
        '[name="emailNotificationsForAllMessages"]',
      ).checked = false;
    else
      this.closest('[type~="form"]').querySelector(
        '[name="emailNotificationsForMessagesInConversationsThatYouStarted"]',
      ).checked = true;
  };
}
);

/********************************************************************************/

javascript?.execute?.functions?.set?.("ckdmmvbdstjgeb", async function() {
  this.onchange = () => {
    if (!this.checked) {
      this.closest('[type~="form"]').querySelector(
        '[name="emailNotificationsForAllMessages"]',
      ).checked = false;
      this.closest('[type~="form"]').querySelector(
        '[name="emailNotificationsForMessagesInConversationsInWhichYouParticipated"]',
      ).checked = false;
    }
  };
}
);

