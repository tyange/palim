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

async function marqueeAroundFirst(
  page: Page,
  from: [number, number],
  to: [number, number],
) {
  const box = (await page.locator(".frag").first().boundingBox())!;
  await page.mouse.move(box.x + from[0], box.y + from[1]);
  await page.mouse.down();
  await page.mouse.move(box.x + to[0], box.y + to[1], { steps: 10 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await gotoCanvas(page);
});

test("빈 곳을 클릭하면 그 자리에 조각이 생기고 타이핑한 텍스트가 남는다", async ({
  page,
}) => {
  await createFragment(page, 1100, 500, "새 조각");
  await expect(page.locator(".frag", { hasText: "새 조각" })).toBeVisible();
});

test("빈 텍스트로 커밋하면 조각이 삭제된다", async ({ page }) => {
  await page.locator(".canvas").click({ position: { x: 1100, y: 500 } });
  await page.locator(".frag-editor").waitFor();
  await page.keyboard.press("Escape");
  await expect(page.locator(".frag-editor")).toBeHidden();
  // 빈 조각은 fragments 배열에 아예 안 들어가므로 개수가 그대로다
  await expect(page.locator(".frag")).toHaveCount(29);
});

test("기존 조각을 클릭하면 재편집 모드로 들어가 내용을 바꿀 수 있다", async ({
  page,
}) => {
  await page.locator(".frag", { hasText: "적절치 못하게 되었다" }).click();
  await page.locator(".frag-editor").waitFor();
  await expect(page.locator(".frag-editor")).toHaveText("적절치 못하게 되었다");
  await page.keyboard.press("End");
  await page.keyboard.type("!");
  await page.keyboard.press("Escape");
  await expect(
    page.locator(".frag", { hasText: "적절치 못하게 되었다!" }),
  ).toBeVisible();
});

test("드래그하면 조각이 그 위치로 이동한다", async ({ page }) => {
  // 기본 예시는 38px 간격으로 줄이 촘촘해 세로로 옮기면 어디서든 스냅이
  // 끼어든다. 같은 줄에 짝 조각이 있는 줄을 골라(그 짝이 y를 그대로 붙잡는다) 가로로만, 아무것도 없는 x=1200까지 옮겨 순수 드래그
  // 결과만 확정적으로 검증한다.
  const canvasBox = (await page.locator(".canvas").boundingBox())!;
  const frag = page.locator(".frag", { hasText: "이제 꺼내어 사람들 사이에" });
  const fragBox = (await frag.boundingBox())!;
  const grabX = fragBox.x + 2;
  const grabY = fragBox.y + 2;
  await page.mouse.move(grabX, grabY);
  const top = await frag.evaluate((el) => (el as HTMLElement).style.top);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + 1202, grabY, { steps: 10 });
  await page.mouse.up();
  await expect(frag).toHaveCSS("left", "1200px");
  await expect(frag).toHaveCSS("top", top);
});

test("빈 곳을 드래그하면 사각형 선택(marquee)이 되고, 여러 조각을 한 번에 지울 수 있다", async ({
  page,
}) => {
  await marqueeAroundFirst(page, [-25, -15], [220, 90]);

  await expect(page.locator(".selection-toolbar .count")).toHaveText(
    "3개 선택",
  );
  await expect(page.locator(".frag.selected")).toHaveCount(3);

  await page.keyboard.press("Backspace");
  await expect(page.locator(".frag")).toHaveCount(26);
  await expect(page.locator(".selection-toolbar")).toBeHidden();
});

test("⌘Z/⌘⇧Z로 조각 생성을 되돌리고 다시 실행할 수 있다", async ({ page }) => {
  await createFragment(page, 1100, 500, "undo 테스트");
  await expect(page.locator(".frag")).toHaveCount(30);

  await page.keyboard.press("ControlOrMeta+z");
  await expect(page.locator(".frag")).toHaveCount(29);
  await expect(page.locator(".frag", { hasText: "undo 테스트" })).toBeHidden();

  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(page.locator(".frag")).toHaveCount(30);
  await expect(page.locator(".frag", { hasText: "undo 테스트" })).toBeVisible();
});

test("⌘D로 선택한 조각을 제자리 복제하고, 복제본이 선택된 채로 남는다", async ({
  page,
}) => {
  await marqueeAroundFirst(page, [-25, -15], [140, 25]);
  const selected = page.locator(".frag.selected");
  await expect(selected).toHaveCount(1);
  const { left, top } = await selected.evaluate((el) => ({
    left: parseFloat((el as HTMLElement).style.left),
    top: parseFloat((el as HTMLElement).style.top),
  }));

  await page.keyboard.press("ControlOrMeta+d");
  await expect(page.locator(".frag")).toHaveCount(30);
  const dup = page.locator(".frag.selected");
  await expect(dup).toHaveCount(1);
  await expect(dup).toHaveCSS("left", `${left + 16}px`);
  await expect(dup).toHaveCSS("top", `${top + 16}px`);
});

test("방향키로 선택한 조각을 1px, Shift+방향키로 10px씩 옮긴다", async ({
  page,
}) => {
  await marqueeAroundFirst(page, [-25, -15], [140, 25]);

  const selected = page.locator(".frag.selected");
  const { left, top } = await selected.evaluate((el) => ({
    left: parseFloat((el as HTMLElement).style.left),
    top: parseFloat((el as HTMLElement).style.top),
  }));
  await page.keyboard.press("ArrowRight");
  await expect(selected).toHaveCSS("left", `${left + 1}px`);
  await page.keyboard.press("Shift+ArrowDown");
  await expect(selected).toHaveCSS("top", `${top + 10}px`);
});

test("2개 이상 선택 시 뜨는 정렬 툴바로 왼쪽 정렬을 적용할 수 있다", async ({
  page,
}) => {
  await marqueeAroundFirst(page, [-25, -15], [220, 90]);
  await expect(page.locator(".selection-toolbar .count")).toHaveText(
    "3개 선택",
  );

  await page.getByRole("button", { name: "왼쪽 정렬" }).click();

  const lefts = await page
    .locator(".frag.selected")
    .evaluateAll((els) => els.map((el) => (el as HTMLElement).style.left));
  expect(new Set(lefts).size).toBe(1);
});

test("좁은 뷰포트에서도 조각이 글자 폭 그대로 가로로 렌더된다(세로로 안 깨진다)", async ({
  page,
}) => {
  // 프로덕션에서 실제로 겪은 회귀: .frag에 명시적 width가 없으면 절대 위치
  // 요소의 shrink-to-fit 폭이 "그 지점부터 부모 오른쪽 끝까지 남은 공간"
  // 기준으로 계산된다. 뷰포트가 좁아 조각의 x가 이미 캔버스 폭을 넘으면 그
  // 남은 공간이 음수가 되어 폭이 한 글자 수준으로 깨지고, white-space:
  // pre-wrap이 매 글자마다 줄바꿈해 세로쓰기처럼 보인다(docs/canvas-editor.md).
  await page.setViewportSize({ width: 390, height: 844 });
  // 조각의 폭이 뷰포트(390px)를 넘어서게, 캔버스 안에서
  // 아주 오른쪽으로 몰아 재현 조건을 확실히 만든다.
  const frag = page.locator(".frag", { hasText: "간과하는 것들로부터" });
  const box = (await frag.boundingBox())!;
  await page.mouse.move(box.x + 5, box.y + 5);
  await page.mouse.down();
  await page.mouse.move(370, box.y + 5, { steps: 10 });
  await page.mouse.up();

  const width = await frag.evaluate((el) => getComputedStyle(el).width);
  // 폭이 실측 글자 폭(수십~백여 px)이어야 한다 — 붕괴하면 1~2글자 폭(20~30px)
  // 근처로 잘린다.
  expect(parseFloat(width)).toBeGreaterThan(100);
});

test("편집 중 Tab으로 라벨 입력으로 넘어가 #태그를 붙이면 조각 아래에 표시된다", async ({
  page,
}) => {
  await page.locator(".canvas").click({ position: { x: 800, y: 500 } });
  await page.locator(".frag-editor").waitFor();
  await page.keyboard.type("나는 사랑을 모른다");
  await page.keyboard.press("Tab");
  await page.keyboard.type("사랑");
  await page.keyboard.press("Enter");
  await page.keyboard.type("#to be");
  await page.keyboard.press("Enter");
  await expect(page.locator(".frag-editor")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator(".frag-editor").waitFor({ state: "detached" });
  const labels = page
    .locator(".frag", { hasText: "나는 사랑을 모른다" })
    .locator(".frag-labels");
  await expect(labels).toHaveText("#사랑#to_be");
});

test("라벨만 바꿔도 변경으로 커밋되고 undo로 되돌아간다", async ({ page }) => {
  await page.locator(".frag", { hasText: "나는 인터넷" }).click();
  await page.locator(".frag-editor").waitFor();
  await page.locator(".label-field").click();
  await page.keyboard.type("인터넷");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await page.locator(".frag-editor").waitFor({ state: "detached" });
  const frag = page.locator(".frag", { hasText: "나는 인터넷" });
  await expect(frag.locator(".frag-labels")).toHaveText("#인터넷");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(frag.locator(".frag-labels")).toHaveCount(0);
});

test("입력창에 남은 라벨 글자도 blur 때 태그로 확정된다", async ({ page }) => {
  await page.locator(".frag", { hasText: "나는 인터넷" }).click();
  await page.locator(".frag-editor").waitFor();
  await page.locator(".label-field").click();
  await page.keyboard.type("무지");
  await page.keyboard.press("Escape");
  await page.locator(".frag-editor").waitFor({ state: "detached" });
  await expect(
    page.locator(".frag", { hasText: "나는 인터넷" }).locator(".frag-labels"),
  ).toHaveText("#무지");
});
