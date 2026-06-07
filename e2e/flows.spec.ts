import { expect, test } from '@playwright/test';

import { dayRow, fillRange, goPrev, open, tile } from './helpers';

test('month view renders the Canton Zürich holidays for May 2026', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Monat' }).click();
  await goPrev(page); // Juni 2026 → Mai 2026
  await expect(page.locator('.day-row.holiday', { hasText: 'Auffahrt' })).toBeVisible();
  // May 2026: Tag der Arbeit (1st), Auffahrt (14th), Pfingstmontag (25th)
  await expect(page.locator('.day-row.holiday')).toHaveCount(3);
});

test('a split shift (two ranges via "+ Zeit") sums correctly', async ({ page }) => {
  await open(page);
  await goPrev(page);
  const row = dayRow(page, 0);
  await row.locator('.time-block .range-add').click(); // + Zeit → second range
  const inputs = row.locator('.time-block .time-input');
  await inputs.nth(0).fill('0800');
  await inputs.nth(1).fill('1200'); // 4h
  await inputs.nth(2).fill('1300');
  await inputs.nth(3).fill('1700'); // +4h
  await expect(row.locator('.day-worked')).toContainText('8.00');
});

test('the Heute button returns to the current week', async ({ page }) => {
  await open(page);
  await goPrev(page);
  await goPrev(page);
  await expect(page.locator('.day-row.today')).toHaveCount(0); // navigated away
  await page.getByRole('button', { name: 'Heute' }).click();
  await expect(page.locator('.day-row.today')).toHaveCount(1); // today is back in view
});

test('a Kompensation day draws from overtime and does not touch the Ferien-Saldo', async ({ page }) => {
  await open(page);
  await goPrev(page);
  const row = dayRow(page, 0); // past Monday
  await row.locator('.absence-select').selectOption('kompensation');
  await expect(row).toContainText('Kompensation');
  await expect(row.locator('.day-balance .neg')).toContainText('8.40'); // drawn from overtime
  await expect(page.locator('.total-vacation .total-value')).toContainText('25 / 25'); // not vacation
});

test('entered time persists across a reload (localStorage backend)', async ({ page }) => {
  await open(page);
  await goPrev(page);
  await fillRange(page, 0, '0800', '1624');
  await page.clock.runFor(700); // fire the debounced save
  await page.reload();
  await expect(page.locator('.day-table')).toBeVisible();
  await goPrev(page); // reload resets to current week → go back to the filled one
  await expect(dayRow(page, 0).locator('.time-block .time-input').nth(0)).toHaveValue('08:00');
});

test('Startsaldo + Startdatum (via the date picker) drive the cumulative Saldo gesamt', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Einstellungen' }).click();
  await page.getByLabel(/Startsaldo Gleitzeit/).fill('12');
  // pick the start date = today (29 Jun 2026) in the custom date picker
  await page.locator('.dp-trigger').click();
  await page.locator('.dp-pop').getByText('29', { exact: true }).click();
  await page.locator('.back').click();
  const gesamt = tile(page, 'Saldo gesamt');
  await expect(gesamt).toContainText('12.00');
  await expect(gesamt).toHaveClass(/pos/);
});
