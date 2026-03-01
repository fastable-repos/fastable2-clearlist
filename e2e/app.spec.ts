import { test, expect } from '@playwright/test'
import { captureScreenshot } from './helpers'

// Clear localStorage before each test for isolation
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
})

// ── 1. Happy path: Add a todo to Work tab ──────────────────────────────────
test('adds a new todo to the Work tab', async ({ page }) => {
  // Select Work tab (it's the default)
  await page.getByTestId('tab-work').click()

  // Type a new todo and press Enter
  await page.getByTestId('todo-input').fill('Finish report')
  await page.getByTestId('todo-input').press('Enter')

  // Verify it appears in the Work list
  const todoItem = page.getByTestId('todo-item').first()
  await expect(todoItem).toBeVisible()
  await expect(todoItem.getByTestId('todo-text')).toHaveText('Finish report')

  // Checkbox should be unchecked
  await expect(todoItem.getByTestId('todo-checkbox')).not.toBeChecked()

  await captureScreenshot(page, '01-active-todos-view')
})

// ── 2. Happy path: Complete and archive a todo ────────────────────────────
test('completes a todo with strike-through and archives it', async ({ page }) => {
  // Add a todo
  await page.getByTestId('todo-input').fill('Buy groceries')
  await page.getByTestId('todo-input').press('Enter')

  // Check the checkbox → text should be struck through
  const todoItem = page.getByTestId('todo-item').first()
  await todoItem.getByTestId('todo-checkbox').check()

  const todoText = todoItem.getByTestId('todo-text')
  await expect(todoText).toHaveClass(/line-through/)

  // Archive button should now be visible; click it
  await todoItem.getByTestId('archive-btn').click()

  // Todo should disappear from active list
  await expect(page.getByTestId('todo-item')).toHaveCount(0)
  await expect(page.getByTestId('empty-state')).toBeVisible()
})

// ── 3. Happy path: View archived todos in Personal tab ────────────────────
test('shows archived todos under Personal tab via Show Archived toggle', async ({ page }) => {
  // Switch to Personal
  await page.getByTestId('tab-personal').click()

  // Add and archive a todo
  await page.getByTestId('todo-input').fill('Read a book')
  await page.getByTestId('todo-input').press('Enter')
  await page.getByTestId('todo-item').first().getByTestId('todo-checkbox').check()
  await page.getByTestId('archive-btn').click()

  // Verify active list is now empty
  await expect(page.getByTestId('todo-item')).toHaveCount(0)

  // Click Show Archived
  await page.getByTestId('toggle-archived').click()
  await expect(page.getByTestId('archived-section')).toBeVisible()

  // Archived item should appear with a Delete button
  const archivedItem = page.getByTestId('archived-item').first()
  await expect(archivedItem).toBeVisible()
  await expect(archivedItem.getByTestId('archived-text')).toHaveText('Read a book')
  await expect(archivedItem.getByTestId('delete-btn')).toBeVisible()

  await captureScreenshot(page, '02-archived-todos-view')
})

// ── 4. Edge case: Empty input submission ──────────────────────────────────
test('does not add a todo when input is empty and shows an error', async ({ page }) => {
  // Try submitting an empty input
  await page.getByTestId('add-btn').click()

  // No new todo items
  await expect(page.getByTestId('todo-item')).toHaveCount(0)

  // Error message visible
  await expect(page.getByTestId('input-error')).toBeVisible()

  // Also try pressing Enter
  await page.getByTestId('todo-input').press('Enter')
  await expect(page.getByTestId('todo-item')).toHaveCount(0)
})

// ── 5. Edge case: Category isolation ─────────────────────────────────────
test('each tab shows only its own todos', async ({ page }) => {
  // Add todo to Work
  await page.getByTestId('tab-work').click()
  await page.getByTestId('todo-input').fill('Work task')
  await page.getByTestId('todo-input').press('Enter')

  // Switch to Personal, add todo
  await page.getByTestId('tab-personal').click()
  await page.getByTestId('todo-input').fill('Personal task')
  await page.getByTestId('todo-input').press('Enter')

  // Switch to Shopping, add todo
  await page.getByTestId('tab-shopping').click()
  await page.getByTestId('todo-input').fill('Shopping task')
  await page.getByTestId('todo-input').press('Enter')

  // Shopping should only show its todo
  await expect(page.getByTestId('todo-item')).toHaveCount(1)
  await expect(page.getByTestId('todo-text').first()).toHaveText('Shopping task')

  // Back to Work — should only show Work todo
  await page.getByTestId('tab-work').click()
  await expect(page.getByTestId('todo-item')).toHaveCount(1)
  await expect(page.getByTestId('todo-text').first()).toHaveText('Work task')

  // Personal — should only show Personal todo
  await page.getByTestId('tab-personal').click()
  await expect(page.getByTestId('todo-item')).toHaveCount(1)
  await expect(page.getByTestId('todo-text').first()).toHaveText('Personal task')
})

// ── 6. Data persistence: todos survive a page refresh ────────────────────
test('persists todos across categories after a page refresh', async ({ page }) => {
  // Add todos to Work and Personal
  await page.getByTestId('tab-work').click()
  await page.getByTestId('todo-input').fill('Persistent work task')
  await page.getByTestId('todo-input').press('Enter')

  await page.getByTestId('tab-personal').click()
  await page.getByTestId('todo-input').fill('Persistent personal task')
  await page.getByTestId('todo-input').press('Enter')

  // Refresh
  await page.reload()

  // Work tab: task still present
  await page.getByTestId('tab-work').click()
  await expect(page.getByTestId('todo-text').first()).toHaveText('Persistent work task')

  // Personal tab: task still present
  await page.getByTestId('tab-personal').click()
  await expect(page.getByTestId('todo-text').first()).toHaveText('Persistent personal task')
})

// ── 7. Data persistence: archived todo survives refresh ───────────────────
test('archived todo is still visible after page refresh', async ({ page }) => {
  // Add, complete and archive a todo
  await page.getByTestId('todo-input').fill('Archive me')
  await page.getByTestId('todo-input').press('Enter')
  await page.getByTestId('todo-item').first().getByTestId('todo-checkbox').check()
  await page.getByTestId('archive-btn').click()

  // Refresh
  await page.reload()

  // Show archived
  await page.getByTestId('toggle-archived').click()
  await expect(page.getByTestId('archived-item')).toHaveCount(1)
  await expect(page.getByTestId('archived-text').first()).toHaveText('Archive me')
})

// ── 8. Edge case: Deleting from archive stays gone after toggle ───────────
test('deleted archived todo does not reappear after toggling Show Archived', async ({ page }) => {
  // Add, complete, archive
  await page.getByTestId('todo-input').fill('Delete me from archive')
  await page.getByTestId('todo-input').press('Enter')
  await page.getByTestId('todo-item').first().getByTestId('todo-checkbox').check()
  await page.getByTestId('archive-btn').click()

  // Show archived and delete
  await page.getByTestId('toggle-archived').click()
  await expect(page.getByTestId('archived-item')).toHaveCount(1)
  await page.getByTestId('delete-btn').first().click()

  // No archived items now
  await expect(page.getByTestId('archived-item')).toHaveCount(0)

  // Hide then show archived again — still gone
  await page.getByTestId('toggle-archived').click() // hide
  await page.getByTestId('toggle-archived').click() // show again
  await expect(page.getByTestId('archived-item')).toHaveCount(0)
})
