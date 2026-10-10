import { expect, type Page, test } from "@playwright/test";

const INITIAL_FRAGMENTS = 29;

async function runCommand(page: Page, label: string) {
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByRole("option", { name: label, exact: true }).click();
}

async function createFragment(page: Page, x: number, y: number, text: string) {
  await page.locator(".canvas").click({ position: { x, y } });
  await page.locator(".frag-editor").waitFor();
  await page.keyboard.type(text);
  await page.keyboard.press("Escape");
  await page.locator(".frag-editor").waitFor({ state: "detached" });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".canvas")).toBeVisible();
});

test("첫 방문엔 URL에 문서 id가 붙고 편집 내용이 새로고침 후에도 남는다", async ({
  page,
}) => {
  await expect(page).toHaveURL(/#\/d\/[A-Za-z0-9_-]+$/);
  await createFragment(page, 800, 500, "남는 조각");
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.locator(".frag", { hasText: "남는 조각" })).toBeVisible();
});

test("새 문서는 빈 캔버스이고, 열기 목록에서 이전 문서로 돌아올 수 있다", async ({
  page,
}) => {
  const firstUrl = page.url();
  await runCommand(page, "새 문서");
  await expect(page).not.toHaveURL(firstUrl);
  await expect(page.locator(".frag")).toHaveCount(0);

  await createFragment(page, 100, 100, "둘째 문서");
  await page.waitForTimeout(700);

  await runCommand(page, "문서 열기…");
  await page.getByRole("option", { name: /나는 화자가 아니다/ }).click();
  await expect(page).toHaveURL(firstUrl);
  await expect(page.locator(".frag")).toHaveCount(INITIAL_FRAGMENTS);
});

test("새 창에서 새 문서를 열면 별도 탭에 빈 문서가 뜨고 원래 탭은 그대로다", async ({
  page,
  context,
}) => {
  const popup = context.waitForEvent("page");
  await runCommand(page, "새 창에서 새 문서");
  const other = await popup;
  await other.waitForSelector(".canvas");
  await expect(other.locator(".frag")).toHaveCount(0);
  expect(other.url()).not.toBe(page.url());
  await expect(page.locator(".frag")).toHaveCount(INITIAL_FRAGMENTS);
});

test("현재 문서를 삭제하면 다른 문서로 이동한다", async ({ page }) => {
  const firstUrl = page.url();
  await runCommand(page, "새 문서");
  await createFragment(page, 100, 100, "지울 문서");
  await page.waitForTimeout(700);
  page.once("dialog", (d) => d.accept());
  await runCommand(page, "현재 문서 삭제");
  await expect(page).toHaveURL(firstUrl);
  await expect(page.locator(".frag", { hasText: "지울 문서" })).toHaveCount(0);
});

test("같은 문서를 다른 탭에서 바꾸면 안내 토스트가 뜬다", async ({
  page,
  context,
}) => {
  await createFragment(page, 800, 500, "원본");
  await page.waitForTimeout(700);
  const other = await context.newPage();
  await other.goto(page.url());
  await other.locator(".canvas").click({ position: { x: 900, y: 550 } });
  await other.locator(".frag-editor").waitFor();
  await other.keyboard.type("다른 탭 수정");
  await other.keyboard.press("Escape");
  await other.waitForTimeout(700);
  await expect(
    page.getByText("다른 창에서 이 문서가 바뀌었어요", { exact: false }).last(),
  ).toBeVisible();
});
