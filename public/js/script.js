(() => {
  "use strict";
  const forms = document.querySelectorAll(".needs-validation");
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
          console.log("script.js = ", event);
        } else {
          document.querySelector("#loader").style.display = "inline";
          document.querySelector(".pageblur").style.opacity = ".5";
          event.submitter.disabled = true;
          event.submitter.innerHTML = "Loading..";
          event.submitter.style.fontSize = ".8rem";
        }
        form.classList.add("was-validated");
      },
      false
    );
  });
})();
