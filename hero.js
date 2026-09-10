const video = document.querySelector(".hero-video");
const pear = document.querySelector(".hero-pear");

if (video) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = Boolean(navigator.connection?.saveData);
  const slowLink = ["slow-2g", "2g"].includes(navigator.connection?.effectiveType || "");

  if (reduceMotion || saveData || slowLink) {
    video.remove();
    pear?.remove();
  } else {
    const holdPearMs = 4000;
    const fadeMs = 1400;

    video.addEventListener("playing", () => {
      video.classList.add("is-ready");
    });

    video.addEventListener("ended", () => {
      if (!pear) {
        video.currentTime = 0;
        video.play()?.catch(() => {});
        return;
      }

      pear.classList.add("is-visible");
      window.setTimeout(() => {
        pear.classList.remove("is-visible");
        window.setTimeout(() => {
          video.currentTime = 0;
          video.play()?.catch(() => {});
        }, fadeMs);
      }, holdPearMs);
    });

    video.play()?.catch(() => {});
  }
}
