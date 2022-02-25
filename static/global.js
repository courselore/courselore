
          leafac.evaluateOnInteractive();
          leafac.customFormValidation();
          leafac.warnAboutLosingInputs();
          leafac.disableButtonsOnSubmit();
          leafac.tippySetDefaultProps();
          
                leafac.liveReload();
              ;

          const eventSourceRefresh = async (response) => {
            switch (response.status) {
              case 200:
                const refreshedDocument = new DOMParser().parseFromString(
                  await response.text(),
                  "text/html"
                );
                document.head.append(
                  ...refreshedDocument.head.querySelectorAll("style")
                );
                morphdom(document.body, refreshedDocument.body, {
                  onBeforeNodeAdded(node) {
                    const onBeforeNodeAdded =
                      node.getAttribute?.("onbeforenodeadded");
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
                    const onBeforeElUpdated =
                      from.getAttribute("onbeforeelupdated");
                    return typeof onBeforeElUpdated === "string"
                      ? new Function("from", "to", onBeforeElUpdated).call(
                          from,
                          from,
                          to
                        )
                      : !from.matches("input, textarea, select");
                  },
                  onElUpdated(element) {
                    const onElUpdated = element.getAttribute("onelupdated");
                    if (typeof onElUpdated === "string")
                      new Function("element", onElUpdated).call(
                        element,
                        element
                      );
                  },
                  onBeforeNodeDiscarded(node) {
                    const onBeforeNodeDiscarded = node.getAttribute?.(
                      "onbeforenodediscarded"
                    );
                    return typeof onBeforeNodeDiscarded === "string"
                      ? new Function("node", onBeforeNodeDiscarded).call(
                          node,
                          node
                        )
                      : !node.matches?.("[data-tippy-root]");
                  },
                  onBeforeElChildrenUpdated(from, to) {
                    const onBeforeElChildrenUpdated = from.getAttribute(
                      "onbeforeelchildrenupdated"
                    );
                    return typeof onBeforeElChildrenUpdated === "string"
                      ? new Function(
                          "from",
                          "to",
                          onBeforeElChildrenUpdated
                        ).call(from, from, to)
                      : true;
                  },
                });
                leafac.evaluateElementsAttribute(document);
                leafac.evaluateElementsAttribute(document, "onrefresh", true);
                break;

              case 404:
                alert(
                  "This page has been removed.\n\nYou’ll be redirected now."
                );
                window.location.href = "https://leafac.local";
                break;

              default:
                console.error(response);
                break;
            }
          };

          window.onpopstate = async () => {
            await eventSourceRefresh(await fetch(document.location));
          };
        