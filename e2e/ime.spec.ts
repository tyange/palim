import { type CDPSession, expect, type Page, test } from "@playwright/test";

async function typeComposed(client: CDPSession, steps: string[]) {
  for (const text of steps) {
    await client.send("Input.imeSetComposition", {
      text,
      selectionStart: text.length,
      selectionEnd: text.length,
    });
  }
  // Input.insertText는 활성 조합을 커밋하며 그 값으로 확정한다(CDP에
  // imeCommitComposition은 없음 — docs/e2e-testing.md 참고).
  await client.send("Input.insertText", { text: steps[steps.length - 1] });
}

async function openNewFragmentEditor(page: Page, x: number, y: number) {
  await page.locator(".canvas").click({ position: { x, y } });
  await page.locator(".frag-editor").waitFor();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".canvas")).toBeVisible();
});

test("2벌식 조합(ㄱ→가→각)이 끝까지 진행된 뒤 커밋하면 최종 글자만 조각에 남는다", async ({
  page,
}) => {
  await openNewFragmentEditor(page, 1100, 500);
  const client = await page.context().newCDPSession(page);

  await typeComposed(client, ["ㄱ", "가", "각"]);
  await expect(page.locator(".frag-editor")).toHaveText("각");

  await page.keyboard.press("Escape");
  await expect(page.locator(".frag-editor")).toBeHidden();
  await expect(page.locator(".frag", { hasText: /^각$/ })).toBeVisible();
});

test("조합 도중 Escape는 조각 편집을 끝내지 않는다(IME 자체 취소에 맡긴다)", async ({
  page,
}) => {
  await openNewFragmentEditor(page, 1100, 500);
  const client = await page.context().newCDPSession(page);

  await client.send("Input.imeSetComposition", {
    text: "가",
    selectionStart: 1,
    selectionEnd: 1,
  });
  await expect(page.locator(".frag-editor")).toHaveText("가");

  await page.keyboard.press("Escape");

  // 조합 중이던 Escape는 우리 쪽에서 가로채지 않아야 한다 — 편집기가 그대로
  // 열려 있고, 조합 중이던 텍스트도 남아 있어야 정상(브라우저/IME가 알아서
  // 처리할 몫).
  await expect(page.locator(".frag-editor")).toBeVisible();
  await expect(page.locator(".frag-editor")).toHaveText("가");
});

test("조합이 끝난 뒤에 누른 Escape는 정상적으로 조각을 커밋하고 닫는다", async ({
  page,
}) => {
  await openNewFragmentEditor(page, 1100, 500);
  const client = await page.context().newCDPSession(page);

  await typeComposed(client, ["ㅁ", "마", "말"]);
  await expect(page.locator(".frag-editor")).toHaveText("말");

  // 조합이 이미 insertText로 커밋됐으므로 이 시점의 Escape는
  // isComposing이 아니다 — 정상적으로 blur → commitEdit이 일어나야 한다.
  await page.keyboard.press("Escape");
  await expect(page.locator(".frag-editor")).toBeHidden();
  await expect(page.locator(".frag", { hasText: /^말$/ })).toBeVisible();
});

test("기존 조각을 재편집할 때도 조합 텍스트가 이어붙어 커밋된다", async ({
  page,
}) => {
  await page.locator(".frag", { hasText: "적절치 못하게 되었다" }).click();
  await page.locator(".frag-editor").waitFor();
  await page.keyboard.press("End");

  const client = await page.context().newCDPSession(page);
  await typeComposed(client, ["ㅇ", "요"]);
  await expect(page.locator(".frag-editor")).toHaveText(
    "적절치 못하게 되었다요",
  );

  await page.keyboard.press("Escape");
  await expect(
    page.locator(".frag", { hasText: "적절치 못하게 되었다요" }),
  ).toBeVisible();
});
