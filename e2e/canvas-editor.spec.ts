import { expect, type Page, test } from "@playwright/test";

async function gotoCanvas(page: Page) {
  await page.goto("/");
  await expect(page.locator(".canvas")).toBeVisible();
}

async function createFragment(page: Page, x: number, y: number, text: string) {
  await page.locator(".canvas").click({ position: { x, y } });
  await page.locator(".frag-editor").waitFor();
  await page.keyboard.type(text);
  await page.keyboard.press("Escape");
  await page.locator(".frag-editor").waitFor({ state: "detached" });
}

test.beforeEach(async ({ page }) => {
  await gotoCanvas(page);
});

test("빈 곳을 클릭하면 그 자리에 조각이 생기고 타이핑한 텍스트가 남는다", async ({
  page,
}) => {
  await createFragment(page, 800, 500, "새 조각");
  await expect(page.locator(".frag", { hasText: "새 조각" })).toBeVisible();
});

test("빈 텍스트로 커밋하면 조각이 삭제된다", async ({ page }) => {
  await page.locator(".canvas").click({ position: { x: 800, y: 500 } });
  await page.locator(".frag-editor").waitFor();
  await page.keyboard.press("Escape");
  await expect(page.locator(".frag-editor")).toBeHidden();
  // 빈 조각은 fragments 배열에 아예 안 들어가므로 개수가 그대로다
  await expect(page.locator(".frag")).toHaveCount(10);
});

test("기존 조각을 클릭하면 재편집 모드로 들어가 내용을 바꿀 수 있다", async ({
  page,
}) => {
  await page.locator(".frag", { hasText: "나는 화자가 아니다" }).click();
  await page.locator(".frag-editor").waitFor();
  await expect(page.locator(".frag-editor")).toHaveText("나는 화자가 아니다");
  await page.keyboard.press("End");
  await page.keyboard.type("!");
  await page.keyboard.press("Escape");
  await expect(
    page.locator(".frag", { hasText: "나는 화자가 아니다!" }),
  ).toBeVisible();
});

test("드래그하면 조각이 그 위치로 이동한다", async ({ page }) => {
  // 다른 조각과 가까우면 스냅이 끼어들 수 있어, 아무것도 없는 빈 자리(900,550)로
  // 옮겨 순수 드래그 결과만 확정적으로 검증한다.
  const canvasBox = (await page.locator(".canvas").boundingBox())!;
  const frag = page.locator(".frag", { hasText: "나는 인터넷" }); // 원래 (60,90)
  const grabX = canvasBox.x + 62;
  const grabY = canvasBox.y + 92;
  await page.mouse.move(grabX, grabY);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + 902, canvasBox.y + 552, { steps: 10 });
  await page.mouse.up();
  await expect(frag).toHaveCSS("left", "900px");
  await expect(frag).toHaveCSS("top", "550px");
});

test("빈 곳을 드래그하면 사각형 선택(marquee)이 되고, 여러 조각을 한 번에 지울 수 있다", async ({
  page,
}) => {
  await page.mouse.move(15, 15);
  await page.mouse.down();
  await page.mouse.move(260, 105, { steps: 10 });
  await page.mouse.up();

  await expect(page.locator(".selection-toolbar .count")).toHaveText(
    "3개 선택",
  );
  await expect(page.locator(".frag.selected")).toHaveCount(3);

  await page.keyboard.press("Backspace");
  await expect(page.locator(".frag")).toHaveCount(7);
  await expect(page.locator(".selection-toolbar")).toBeHidden();
});

test("⌘Z/⌘⇧Z로 조각 생성을 되돌리고 다시 실행할 수 있다", async ({ page }) => {
  await createFragment(page, 800, 500, "undo 테스트");
  await expect(page.locator(".frag")).toHaveCount(11);

  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.locator(".frag")).toHaveCount(10);
  await expect(page.locator(".frag", { hasText: "undo 테스트" })).toBeHidden();

  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(page.locator(".frag")).toHaveCount(11);
  await expect(page.locator(".frag", { hasText: "undo 테스트" })).toBeVisible();
});

test("⌘D로 선택한 조각을 제자리 복제하고, 복제본이 선택된 채로 남는다", async ({
  page,
}) => {
  await page.mouse.move(15, 15);
  await page.mouse.down();
  await page.mouse.move(180, 55, { steps: 5 });
  await page.mouse.up();
  await expect(page.locator(".frag.selected")).toHaveCount(1);

  await page.keyboard.press("ControlOrMeta+d");
  await expect(page.locator(".frag")).toHaveCount(11);
  const dup = page.locator(".frag.selected");
  await expect(dup).toHaveCount(1);
  await expect(dup).toHaveCSS("left", "56px");
  await expect(dup).toHaveCSS("top", "46px");
});

test("방향키로 선택한 조각을 1px, Shift+방향키로 10px씩 옮긴다", async ({
  page,
}) => {
  await page.mouse.move(15, 15);
  await page.mouse.down();
  await page.mouse.move(180, 55, { steps: 5 });
  await page.mouse.up();

  const selected = page.locator(".frag.selected");
  await page.keyboard.press("ArrowRight");
  await expect(selected).toHaveCSS("left", "41px");
  await page.keyboard.press("Shift+ArrowDown");
  await expect(selected).toHaveCSS("top", "40px");
});

test("2개 이상 선택 시 뜨는 정렬 툴바로 왼쪽 정렬을 적용할 수 있다", async ({
  page,
}) => {
  await page.mouse.move(15, 15);
  await page.mouse.down();
  await page.mouse.move(260, 105, { steps: 10 });
  await page.mouse.up();
  await expect(page.locator(".selection-toolbar .count")).toHaveText(
    "3개 선택",
  );

  await page.getByRole("button", { name: "왼쪽 정렬" }).click();

  const lefts = await page
    .locator(".frag.selected")
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).style.left));
  expect(new Set(lefts).size).toBe(1);
});
