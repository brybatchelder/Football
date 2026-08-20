import { expect, test } from "@playwright/test";

test("responses carry the browser security baseline", async ({ request }) => {
  const response = await request.get("/sign-in");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["x-frame-options"]).toBe("DENY");
  expect(response.headers()["cross-origin-opener-policy"]).toBe("same-origin");
  expect(response.headers()["strict-transport-security"]).toBeUndefined();
});

async function signIn(
  page: import("@playwright/test").Page,
  role = "commissioner",
) {
  await page.goto("/sign-in");
  await page.selectOption("select[name=role]", role);
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page).toHaveURL(/\/league$/);
}
test("commissioner traverses core league flow", async ({ page }) => {
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: "League Headquarters" }),
  ).toBeVisible();
  await page.goto("/league/rosters?format=full");
  await expect(
    page.getByRole("heading", { name: "League Rosters" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /grid/i }).click();
  await expect(page).toHaveURL(/format=grid/);
  await page.goto("/franchises/canton-legends");
  await expect(
    page.getByRole("heading", { name: "Canton Legends", level: 1 }),
  ).toBeVisible();
  await page.goto("/commissioner");
  await expect(
    page.getByRole("heading", { name: "Setup Center" }),
  ).toBeVisible();
});
test("owner cannot access commissioner settings", async ({ page }) => {
  await signIn(page, "owner");
  await page.goto("/franchises/canton-legends/settings");
  await expect(
    page.getByRole("heading", { name: "Canton Legends", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Identity & branding")).toBeVisible();
  await page.goto("/commissioner");
  await expect(page).toHaveURL(/\/sign-in\?reason=permission/);
});

test("assistant commissioner cannot administer owner access", async ({
  page,
}) => {
  await signIn(page, "assistant_commissioner");
  await page.goto("/commissioner");
  await expect(page.getByText("Franchises and owners")).toHaveCount(0);
  await page.goto("/commissioner/owners");
  await expect(page).toHaveURL(/\/sign-in\?reason=permission/);
});

test("commissioner can inspect owner administration and account context", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/commissioner/owners");
  await expect(
    page.getByRole("heading", { name: "Owners & Franchises" }),
  ).toBeVisible();
  await expect(page.getByText("Database connection required")).toBeVisible();

  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Development Commissioner" }),
  ).toBeVisible();
  await expect(page.getByText("Canton Legends")).toBeVisible();
  await expect(
    page.getByText(/Password and session controls are available/),
  ).toBeVisible();
});

test("sign out clears development access", async ({ page }) => {
  await signIn(page);
  await page.request.post("/api/auth/sign-out", { maxRedirects: 0 });
  await page.goto("/my-team/overview");
  await expect(page).toHaveURL(/\/sign-in\?reason=authentication/);
});

test("commissioner bootstrap route is closed when not configured", async ({
  page,
}) => {
  const response = await page.goto("/bootstrap-commissioner");
  expect(response?.status()).toBe(404);
});

test("franchise directory requires league access", async ({ page }) => {
  await page.goto("/league/teams");
  await expect(page).toHaveURL(/\/sign-in\?reason=authentication/);
});

test("owner can navigate the private franchise directory on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "owner");
  await page.goto("/league/teams");
  await expect(
    page.getByRole("heading", { name: "Franchises & owners" }),
  ).toBeVisible();
  await expect(page.locator(".league-directory-card")).toHaveCount(12);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await page.getByRole("link", { name: "Canton Legends" }).click();
  await expect(page).toHaveURL(/\/franchises\/canton-legends$/);
});

test.describe("mobile franchise context", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the franchise profile and roster inside the phone viewport", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/franchises/canton-legends");
    await expect(
      page.getByRole("heading", { name: "Canton Legends", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText("Active franchise", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Roster summary" }),
    ).toBeVisible();
    const pageOverflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(pageOverflows).toBe(false);
  });
});
