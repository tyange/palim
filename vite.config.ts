/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    // tailnet(*.ts.net)에서 `tailscale serve`로 dev 서버를 프리뷰할 때 필요.
    // host를 IPv4 루프백으로 고정 — 기본값은 IPv6(::1)만 열려 프록시가 못 붙는다.
    host: "127.0.0.1",
    allowedHosts: [".ts.net"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
