import { test, expect } from "@playwright/test";

const ACCEPTED_TERMS = "2026-10-23-v2";
const FOREST_HOST = "https://videos.pexels.com/";

async function openLinka(page, { reducedMotion = "no-preference", disableVideo = false, onboarded = true } = {}) {
  await page.emulateMedia({ reducedMotion });
  await page.addInitScript(({ acceptedTerms, disableForestVideo, hasOnboarded }) => {
    localStorage.clear();
    localStorage.setItem("linka.termsAccepted", acceptedTerms);
    if (hasOnboarded) localStorage.setItem("linka.experience.onboarded.v1", "true");
    if (disableForestVideo) {
      localStorage.setItem("linka.atmosphere.themeVersion", JSON.stringify("forest-studio-v3"));
      localStorage.setItem("linka.atmosphere.video", "false");
    }
  }, { acceptedTerms: ACCEPTED_TERMS, disableForestVideo: disableVideo, hasOnboarded: onboarded });
  await page.route("https://videos.pexels.com/**", route => route.abort());
  await page.goto("/");
  await expect(page.locator("#capture-text")).toBeVisible();
}

test("remote forest failure leaves a visible bundled fallback", async ({ page }) => {
  await openLinka(page);
  const poster = page.locator("#linka-atmosphere img");
  await expect(poster).toHaveClass(/ready/);
  await expect(poster).toHaveAttribute("src", /forest-fallback\.svg$/);
  await expect(page.locator("#capture-text")).toBeVisible();
});

test("closing the command palette does not block saving a capture", async ({ page }) => {
  await openLinka(page);
  await page.keyboard.press("Control+k");
  await expect(page.locator(".linka-command-dialog")).toBeVisible();

  // Interact before the palette's exit animation has finished.
  await page.keyboard.press("Escape");
  const draft = page.locator("#capture-text");
  await draft.click();
  await draft.fill("Interaction regression test");
  await page.locator("#save-button").click();

  await expect(page.locator("#capture-list")).toContainText("Interaction regression test");
  await expect(page.locator(".linka-command-root")).toBeHidden();
});

test("small viewport keeps capture controls usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLinka(page);
  const draft = page.locator("#capture-text");
  await draft.fill("Mobile layout regression test");
  await page.locator("#save-button").click();
  await expect(page.locator("#capture-list")).toContainText("Mobile layout regression test");
});

test("reduced motion uses the static local forest and skips remote video", async ({ page }) => {
  const videoRequests = [];
  page.on("request", request => {
    if (request.url().startsWith(FOREST_HOST)) videoRequests.push(request.url());
  });
  await openLinka(page, { reducedMotion: "reduce" });

  const poster = page.locator("#linka-atmosphere img");
  await expect(poster).toHaveClass(/ready/);
  await expect(poster).toHaveAttribute("src", /forest-fallback-static\.svg$/);
  expect(videoRequests).toHaveLength(0);
});

test("fresh profiles can save captures without an account overlay", async ({ page }) => {
  await openLinka(page, { onboarded: false });
  await expect(page.locator("#modal-root .linka-auth-panel")).toHaveCount(0);
  const draft = page.locator("#capture-text");
  await draft.fill("First-run capture");
  await page.locator("#save-button").click();
  await expect(page.locator("#capture-list")).toContainText("First-run capture");
});

test("large document edits avoid per-character DOM nodes", async ({ page }) => {
  await openLinka(page);
  await page.locator("#linka-document-button").click();
  const editor = page.locator(".linka-doc-window");
  await expect(editor).toBeVisible();
  const body = editor.locator(".linka-doc-body");
  await body.fill("x".repeat(600));
  await expect(editor.locator(".linka-doc-body-wrap")).not.toHaveClass(/plain-text-mode/);
  await expect(editor.locator(".linka-doc-type-mirror span")).toHaveCount(0);
});

test("the default forest ambience plays without an external audio file", async ({ page }) => {
  await openLinka(page);
  const play = page.locator(".linka-player-dock [data-player-play]");
  await expect(play).toBeVisible();
  await play.click();
  await expect(play).toHaveAttribute("aria-label", "Pause");
  await expect(page.locator("#linka-atmosphere")).toHaveClass(/music-playing/);
  await play.click();
  await expect(play).toHaveAttribute("aria-label", "Play");
});

test("turning forest video off prevents remote media requests", async ({ page }) => {
  const videoRequests = [];
  page.on("request", request => {
    if (request.url().startsWith(FOREST_HOST)) videoRequests.push(request.url());
  });
  await openLinka(page, { disableVideo: true });
  const poster = page.locator("#linka-atmosphere img");
  await expect(poster).toHaveClass(/ready/);
  await expect(page.locator("#linka-atmosphere")).toHaveClass(/disabled/);
  expect(await page.evaluate(() => localStorage.getItem("linka.atmosphere.video"))).toBe("false");
  expect(videoRequests).toHaveLength(0);
});
