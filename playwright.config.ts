import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5179",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // 다른 프로젝트의 vite가 기본 포트(5173)를 먼저 점유하고 있으면
    // reuseExistingServer가 그 서버를 palim으로 착각해 엉뚱한 페이지를 테스트하게
    // 된다 — 전용 포트 + strictPort로 항상 이 프로젝트인지 확실히 한다.
    command: "bunx vite --port 5179 --strictPort",
    url: "http://127.0.0.1:5179",
    reuseExistingServer: !process.env.CI,
  },
});
