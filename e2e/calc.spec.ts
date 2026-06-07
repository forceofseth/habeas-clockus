import { expect, test, type Page } from '@playwright/test';

// "Today" is pinned so balance math is deterministic. 2026-06-29 is a Monday,
// so clicking "back" once lands on the fully-past week Mon 2026-06-22 … Sun 06-28.
const FIXED_NOW = new Date('2026-06-29T09:00:00');

async function open(page: Page) {
  await page.clock.install({ time: FIXED_NOW });
  // No network in tests → app falls back to computed (correct) holidays.
  await page.route('**/date.nager.at/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.day-table')).toBeVisible();
  await expect(page.locator('.loading-overlay')).toHaveCount(0);
}

const prevWeek = (page: Page) => page.getByRole('button', { name: 'Zurück' }).click();
const dayRow = (page: Page, i: number) => page.locator('.day-row:not(.head)').nth(i);
const tile = (page: Page, label: string) =>
  page.locator('.total', { hasText: label }).locator('.total-value');

async function fillRange(page: Page, rowIndex: number, von: string, bis: string) {
  const inputs = dayRow(page, rowIndex).locator('.time-block .time-input');
  await inputs.nth(0).fill(von);
  await inputs.nth(1).fill(bis);
}

test('blank past week shows a −42h weekly balance', async ({ page }) => {
  await open(page);
  await prevWeek(page);
  const saldo = tile(page, 'Saldo Woche');
  await expect(saldo).toContainText('42.00');
  await expect(saldo).toHaveClass(/neg/);
});

test('a full past week of 8.4h/day nets to zero', async ({ page }) => {
  await open(page);
  await prevWeek(page);
  for (let i = 0; i < 5; i++) await fillRange(page, i, '0800', '1624'); // 08:00–16:24 = 8.4h

  await expect(tile(page, 'Ist')).toContainText('42.00');
  await expect(tile(page, 'Soll')).toContainText('42.00');
  await expect(tile(page, 'Saldo Woche')).toContainText('0.00');
  await expect(tile(page, 'Saldo Woche')).not.toHaveClass(/neg/);
});

test('a break is subtracted from the day total', async ({ page }) => {
  await open(page);
  await prevWeek(page);
  const row = dayRow(page, 0);
  await row.locator('.time-block .time-input').nth(0).fill('0800');
  await row.locator('.time-block .time-input').nth(1).fill('1700'); // 9h
  await row.locator('.break-block .time-input').first().fill('0100'); // −1h break
  await expect(row.locator('.day-worked')).toContainText('8.00');
});

test('marking a day as Ferien neutralises its owed hours', async ({ page }) => {
  await open(page);
  await prevWeek(page);
  const row = dayRow(page, 0); // past blank Monday → owes −8.40
  await expect(row.locator('.day-balance')).toContainText('8.40');
  await row.locator('.absence-select').selectOption('ferien');
  await expect(row).toContainText('Ferien');
  await expect(row.locator('.day-balance')).not.toContainText('8.40');
});

test('changing the yearly vacation entitlement updates the Ferien-Saldo', async ({ page }) => {
  await open(page);
  await expect(page.locator('.total-vacation .total-value')).toContainText('25 / 25');
  await page.getByRole('button', { name: 'Einstellungen' }).click();
  await page.getByLabel('Ferientage pro Jahr').fill('30');
  await page.locator('.back').click();
  await expect(page.locator('.total-vacation .total-value')).toContainText('30 / 30');
});
