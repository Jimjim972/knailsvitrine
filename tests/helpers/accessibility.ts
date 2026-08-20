import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

export const ACCESSIBILITY_VIEWPORTS = [
  { width: 320, height: 760 },
  { width: 768, height: 900 },
  { width: 1024, height: 900 },
] as const;

export const MINIMUM_TARGET_SIZE = 44;

const WCAG_21_A_AA_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
] as const;

function artifactName(label: string, suffix: string): string {
  const safeLabel = label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "");
  return `${safeLabel || "page"}-${suffix}`;
}

async function attachAxeResult(testInfo: TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, {
    body: Buffer.from(JSON.stringify(value, null, 2)),
    contentType: "application/json",
  });
}

export async function expectAccessibilityScans(
  page: Page,
  testInfo: TestInfo,
  label: string,
) {
  const wcag = await new AxeBuilder({ page }).withTags([...WCAG_21_A_AA_TAGS]).analyze();
  await attachAxeResult(testInfo, artifactName(label, "axe-wcag21-aa.json"), wcag);
  expect(wcag.violations, `${label}: violations WCAG 2.1 A/AA`).toEqual([]);

  const general = await new AxeBuilder({ page }).analyze();
  await attachAxeResult(testInfo, artifactName(label, "axe-general.json"), general);
  const seriousOrCritical = general.violations.filter((violation) =>
    violation.impact === "serious" || violation.impact === "critical"
  );
  expect(seriousOrCritical, `${label}: violations Axe serious/critical`).toEqual([]);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

export async function expectMinimumTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect.soft(box?.width ?? 0, "target width").toBeGreaterThanOrEqual(MINIMUM_TARGET_SIZE);
  expect.soft(box?.height ?? 0, "target height").toBeGreaterThanOrEqual(MINIMUM_TARGET_SIZE);
}

export async function expectMinimumTargets(
  page: Page,
  selector = "a, button, input, select, textarea, summary, [role='button'], [role='link']",
) {
  const targets = await page.locator(selector).evaluateAll((elements) => elements.flatMap((element) => {
    const style = getComputedStyle(element);
    const ownRectangle = element.getBoundingClientRect();
    const labelledControl = element instanceof HTMLInputElement &&
      (element.type === "checkbox" || element.type === "radio")
      ? element.labels?.[0] ?? element
      : element;
    const rectangle = labelledControl.getBoundingClientRect();
    const isVisible = style.display !== "none" && style.visibility !== "hidden" &&
      ownRectangle.width > 0 && ownRectangle.height > 0;
    const isTrueInlineLink = element instanceof HTMLAnchorElement && style.display === "inline";
    if (!isVisible || isTrueInlineLink) return [];
    return [{
      name: element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 80) ?? element.tagName,
      width: rectangle.width,
      height: rectangle.height,
    }];
  }));

  for (const target of targets) {
    expect.soft(target.width, `${target.name}: width`).toBeGreaterThanOrEqual(MINIMUM_TARGET_SIZE);
    expect.soft(target.height, `${target.name}: height`).toBeGreaterThanOrEqual(MINIMUM_TARGET_SIZE);
  }
}

export async function tabTo(
  page: Page,
  target: Locator,
  options: {
    backwards?: boolean;
    key?: "Tab" | "Shift+Tab" | "Alt+Tab" | "Alt+Shift+Tab";
    limit?: number;
  } = {},
) {
  const key = options.key ?? (options.backwards ? "Shift+Tab" : "Tab");
  const limit = options.limit ?? 80;
  for (let attempt = 0; attempt < limit; attempt += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press(key);
  }
  throw new Error(`Keyboard focus did not reach the requested target after ${limit} ${key} presses`);
}

export async function expectVisibleFocus(target: Locator) {
  await expect(target).toBeFocused();
  const visible = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return element.matches(":focus-visible") && (
      (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) >= 2) ||
      style.boxShadow !== "none"
    );
  });
  expect(visible).toBe(true);
}

export async function expectReducedMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  const motion = await page.locator("html").evaluate(() => {
    const htmlStyle = getComputedStyle(document.documentElement);
    const offenders = [...document.querySelectorAll<HTMLElement>("*")].flatMap((element) => {
      const style = getComputedStyle(element);
      const durations = `${style.animationDuration},${style.transitionDuration}`
        .split(",")
        .map((value) => Number.parseFloat(value) * (value.includes("ms") ? 0.001 : 1));
      const iterations = style.animationIterationCount.split(",");
      return durations.some((duration) => duration > 0.01) || iterations.includes("infinite")
        ? [element.tagName.toLowerCase()]
        : [];
    });
    return { scrollBehavior: htmlStyle.scrollBehavior, offenders };
  });
  expect(motion.scrollBehavior).toBe("auto");
  expect(motion.offenders).toEqual([]);
}
