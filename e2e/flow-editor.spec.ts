import { expect, test } from "@playwright/test";

test("흐름 모드로 전환하면 textarea가 나오고 타이핑한 내용이 그대로 반영된다", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "흐름", exact: true }).click();

  const area = page.getByLabel("흐름 입력");
  await expect(area).toBeVisible();
  await area.click();
  await area.fill("새로 쓰는 흐름 모드 문장");
  await expect(area).toHaveValue("새로 쓰는 흐름 모드 문장");
});

test("격자 ↔ 흐름 전환은 서로의 내용에 영향을 주지 않는다", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".canvas")).toBeVisible();
  const fragCountBefore = await page.locator(".frag").count();

  await page.getByRole("button", { name: "흐름", exact: true }).click();
  const area = page.getByLabel("흐름 입력");
  await area.fill("독립된 흐름 문서");

  await page.getByRole("button", { name: "격자", exact: true }).click();
  await expect(page.locator(".frag")).toHaveCount(fragCountBefore);

  await page.getByRole("button", { name: "흐름", exact: true }).click();
  await expect(area).toHaveValue("독립된 흐름 문서");
});
