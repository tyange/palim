import { expect, test } from "@playwright/test";

test("⌘Enter로 격자 모드 미리보기를 열고 닫을 수 있다", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".canvas")).toBeVisible();

  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByText("미리보기 · 격자")).toBeVisible();

  await page.getByRole("button", { name: "미리보기 닫기" }).click();
  await expect(page.getByText("미리보기 · 격자")).toBeHidden();
});

test("흐름 모드에서는 미리보기 제목이 흐름으로 바뀐다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "흐름", exact: true }).click();

  await page.keyboard.press("ControlOrMeta+Enter");
  await expect(page.getByText("미리보기 · 흐름")).toBeVisible();
});

test("미리보기에서 저장하면 알림이 미리보기 위에 보인다", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".canvas")).toBeVisible();

  await page.keyboard.press("ControlOrMeta+Enter");
  await page.getByRole("button", { name: "SVG 저장" }).click();

  const toast = page.locator(".toast").filter({ hasText: "저장했어요" });
  await expect(toast).toBeVisible();
  await expect(toast).toHaveCSS("border-radius", "999px");
  const viewport = page.locator(".toast-viewport");
  await expect(viewport).toHaveCSS("position", "fixed");
  await expect(viewport).toHaveCSS("z-index", "70");
});
