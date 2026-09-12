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
