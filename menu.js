(() => {
  const links = document.querySelectorAll(".logbook-entry-icon");

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      event.preventDefault();
      if (link.classList.contains("is-opening")) {
        return;
      }

      link.classList.add("is-opening");
      window.setTimeout(() => {
        window.location.assign(link.href);
      }, 560);
    });
  });
})();
