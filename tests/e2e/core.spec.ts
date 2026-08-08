import { expect, test } from "@playwright/test";
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
  await page.goto("/commissioner");
  await expect(page).toHaveURL(/\/sign-in\?reason=permission/);
});
