import { expect, test } from '@playwright/test';

const password = 'Demo!2026';

async function login(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Demo email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/app/);
}

test('manager creates and assigns work, technician completes it, manager verifies it', async ({
  page,
}) => {
  const title = `Playwright AHU check ${Date.now()}`;
  await login(page, 'manager@example.com');
  await page.getByRole('link', { name: 'Work orders' }).click();
  await page.getByRole('button', { name: 'Create work order' }).click();
  await page.getByLabel('Work orders').last().fill(title);
  await page
    .getByLabel('Description')
    .fill('Traceable browser-test work order for the fictional demo.');
  await page.getByLabel('Site').click();
  await page.getByRole('option', { name: 'Berlin Operations Campus' }).click();
  await page.getByLabel('Due').fill('2026-12-15');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText(title)).toBeVisible();

  await page.getByText(title).click();
  await page.getByRole('button', { name: 'Assign technician' }).click();
  await page.getByLabel('Assignee').click();
  await page.getByRole('option', { name: /Toni Technician/ }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByLabel('Sign out').click();

  await login(page, 'technician@example.com');
  await page.getByLabel(/Language|Sprache/).click();
  await page.getByRole('option', { name: 'EN' }).click();
  await page.getByRole('link', { name: 'Work orders' }).click();
  await page.getByLabel('Search').fill(title);
  await page.getByText(title).click();
  await page.getByRole('button', { name: 'In progress' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Completed' }).click();
  await page
    .getByLabel('Completion notes')
    .fill('Completed during the Playwright journey; functional check passed.');
  await page.getByLabel('Actual minutes').fill('35');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByLabel('Sign out').click();

  await login(page, 'manager@example.com');
  await page.getByRole('link', { name: 'Work orders' }).click();
  await page.getByLabel('Search').fill(title);
  await page.getByText(title).click();
  await page.getByRole('button', { name: 'Verified' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Verified').first()).toBeVisible();
});

test('mobile technician view keeps the operational route usable @mobile', async ({ page }) => {
  await login(page, 'technician@example.com');
  await page.getByLabel(/Open navigation|Navigation öffnen/).click();
  await expect(page.getByRole('link', { name: /Work orders|Arbeitsaufträge/ })).toBeVisible();
});
