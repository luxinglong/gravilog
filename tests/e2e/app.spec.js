const { test, expect } = require('@playwright/test');

test('loads the editor shell without console errors', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/index.html');
  await expect(page).toHaveTitle('Gravilog');
  await expect(page.locator('#doc')).toBeVisible();
  await expect(page.locator('#mountGate')).toBeVisible();
  expect(errors).toEqual([]);
});

test('renders complete python syntax highlighting from plain code text', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.hljs && window.hljs.getLanguage('python') && window.rehighlightCode);

  const sample = [
    'import math',
    '',
    'class Greeter:',
    '    def greet(self, name: str):',
    '        message = f"""Hello, {name}',
    'from Python"""',
    '        return message',
  ].join('\n');

  const result = await page.evaluate((codeText) => {
    const editor = document.getElementById('doc');
    editor.innerHTML = '<pre><code class="language-python" contenteditable="true"></code></pre>';
    const code = editor.querySelector('code');
    code.textContent = codeText;
    window.ensureCodeBlock(editor.querySelector('pre'));
    window.rehighlightCode(code, false);
    return {
      text: code.textContent,
      html: code.innerHTML,
      className: code.className,
      keywordCount: code.querySelectorAll('.hljs-keyword').length,
      stringCount: code.querySelectorAll('.hljs-string').length,
    };
  }, sample);

  expect(result.text).toBe(sample);
  expect(result.className).toContain('language-python');
  expect(result.className).toContain('hljs');
  expect(result.keywordCount).toBeGreaterThanOrEqual(4);
  expect(result.stringCount).toBeGreaterThanOrEqual(1);
  expect(result.html).toContain('<span class="hljs-keyword">return</span>');
});

test('keeps python highlighting stable after code block enter', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(
    () => window.hljs && window.hljs.getLanguage('python') && window.rehighlightCode && window.handleCodeEnter,
  );

  const result = await page.evaluate(() => {
    const editor = document.getElementById('doc');
    editor.innerHTML = '<pre><code class="language-python" contenteditable="true"></code></pre>';
    const pre = editor.querySelector('pre');
    const code = editor.querySelector('code');
    const text = 'class Greeter:\n    def greet(self):\n        return "ok"';
    code.textContent = text;
    window.ensureCodeBlock(pre);
    window.rehighlightCode(code, false);
    window.placeCursorInCode(code, 'class Greeter:'.length);
    window.handleCodeEnter({ preventDefault() {} });
    const editingClassName = code.className;
    const editingKeywordCount = code.querySelectorAll('.hljs-keyword').length;
    const editingLayerHTML = pre.querySelector('.code-highlight-layer').innerHTML;
    code.blur();
    window.rehighlightCode(code, false);
    return {
      text: code.textContent,
      className: code.className,
      editingClassName,
      editingKeywordCount,
      editingLayerHTML,
      keywordCount: code.querySelectorAll('.hljs-keyword').length,
      stringCount: code.querySelectorAll('.hljs-string').length,
    };
  });

  expect(result.text).toContain('class Greeter:\n\n    def greet');
  expect(result.editingClassName).toContain('language-python');
  expect(result.editingClassName).not.toContain('hljs');
  expect(result.editingKeywordCount).toBe(0);
  expect(result.editingLayerHTML).toContain('<span class="hljs-keyword">def</span>');
  expect(result.editingLayerHTML).toContain('<span class="hljs-keyword">return</span>');
  expect(result.className).toContain('language-python');
  expect(result.className).toContain('hljs');
  expect(result.keywordCount).toBeGreaterThanOrEqual(3);
  expect(result.stringCount).toBeGreaterThanOrEqual(1);
});

test('keeps python highlighting stable after pasting a code block', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ensureCodeBlock && window.insertTextInCode);

  const sample = [
    'class Solution:',
    '    def mergeTwoLists(self, l1: ListNode, l2: ListNode) -> ListNode:',
    '        # base case',
    '        if not l1:',
    '            return l2',
    '        if not l2:',
    '            return l1',
    '',
    '        if l1.val <= l2.val:',
    '            l1.next = self.mergeTwoLists(l1.next, l2)',
    '            return l1',
    '        else:',
    '            l2.next = self.mergeTwoLists(l1, l2.next)',
    '            return l2',
  ].join('\r\n');

  const result = await page.evaluate((text) => {
    const editor = document.getElementById('doc');
    editor.innerHTML = '<pre><code class="language-python" contenteditable="true"></code></pre>';
    const pre = editor.querySelector('pre');
    const code = editor.querySelector('code');
    window.ensureCodeBlock(pre);
    window.placeCursorInCode(code, 0);
    window.insertTextInCode(code, text);
    const layer = pre.querySelector('.code-highlight-layer');
    return {
      text: code.textContent,
      codeKeywordCount: code.querySelectorAll('.hljs-keyword').length,
      layerKeywordCount: layer.querySelectorAll('.hljs-keyword').length,
      layerCommentCount: layer.querySelectorAll('.hljs-comment').length,
      layerHTML: layer.innerHTML,
    };
  }, sample);

  expect(result.text).not.toContain('\r');
  expect(result.text).toContain('class Solution:\n    def mergeTwoLists');
  expect(result.codeKeywordCount).toBe(0);
  expect(result.layerKeywordCount).toBeGreaterThanOrEqual(10);
  expect(result.layerCommentCount).toBeGreaterThanOrEqual(1);
  expect(result.layerHTML).toContain('<span class="hljs-keyword">return</span> l2');
});

test('restores markdown fence when an emptied code block is deleted', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.handleMdEnter && window.handleEmptyCodeBlockExit);

  const result = await page.evaluate(() => {
    const editor = document.getElementById('doc');
    editor.innerHTML = '<p>```python</p>';
    const node = editor.querySelector('p').firstChild;
    const range = document.createRange();
    range.setStart(node, node.length);
    range.collapse(true);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    window.handleMdEnter({ preventDefault() {} });
    const code = editor.querySelector('pre code:not(.code-highlight-layer)');
    window.placeCursorInCode(code, 0);
    window.insertTextInCode(code, 'x = 1');
    window.setCodeTextPlain(code, '', 0, 0, false);
    window.handleEmptyCodeBlockExit({ preventDefault() {} });
    return {
      preCount: editor.querySelectorAll('pre').length,
      text: editor.textContent,
      offset: getSelection().anchorOffset,
    };
  });

  expect(result.preCount).toBe(0);
  expect(result.text).toBe('```python');
  expect(result.offset).toBe('```python'.length);
});

test('removes code delete button and lets heading hashes adjust level', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.ensureCodeBlock && window.handleHeadingMarkerKey);

  const result = await page.evaluate(() => {
    const editor = document.getElementById('doc');
    editor.innerHTML =
      '<h2>Title</h2><pre><code class="language-python" contenteditable="true">x = 1</code><button class="code-delete">x</button></pre>';
    window.ensureCodeBlock(editor.querySelector('pre'));

    const h2 = editor.querySelector('h2');
    window.setCursorInText(h2, 0);
    window.handleHeadingMarkerKey({ key: '#', preventDefault() {} });
    const h3 = editor.querySelector('h3');

    window.setCursorInText(h3, 0);
    window.handleHeadingMarkerKey({ key: 'Backspace', preventDefault() {} });
    const h2Again = editor.querySelector('h2');

    window.setCursorInText(h2Again, 0);
    window.handleHeadingMarkerKey({ key: 'Backspace', preventDefault() {} });
    const h1 = editor.querySelector('h1');
    h1.textContent = '';
    window.setCursorInText(h1, 0);
    window.handleHeadingMarkerKey({ key: 'Backspace', preventDefault() {} });

    return {
      codeDeleteCount: editor.querySelectorAll('.code-delete').length,
      reachedH3: !!h3,
      returnedToH2: !!h2Again,
      markdownText: editor.querySelector('p').textContent,
      offset: getSelection().anchorOffset,
    };
  });

  expect(result.codeDeleteCount).toBe(0);
  expect(result.reachedH3).toBe(true);
  expect(result.returnedToH2).toBe(true);
  expect(result.markdownText).toBe('# ');
  expect(result.offset).toBe(2);
});

test('persists checked editor todo state through saved html', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.syncTodoCheckboxState && window.saveLocalDraft && window.renderAllContent);

  const result = await page.evaluate(() => {
    const editor = document.getElementById('doc');
    editor.innerHTML = '<div class="todo-item"><input type="checkbox"><span class="todo-text">Done</span></div>';
    const checkbox = editor.querySelector('input[type="checkbox"]');
    checkbox.checked = true;
    checkbox.setAttribute('checked', '');
    checkbox.closest('.todo-item').classList.add('checked');

    const snapshot = window.saveLocalDraft(false, { normalize: false });
    editor.innerHTML = snapshot.doc;
    window.renderAllContent();

    const restored = editor.querySelector('input[type="checkbox"]');
    return {
      savedDoc: snapshot.doc,
      checked: restored.checked,
      attr: restored.hasAttribute('checked'),
      className: restored.closest('.todo-item').className,
    };
  });

  expect(result.savedDoc).toContain('checked');
  expect(result.checked).toBe(true);
  expect(result.attr).toBe(true);
  expect(result.className).toContain('checked');
});

test('moves through table cells with tab and arrow keys', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.handleTableNavigation && window.placeCursorInTableCell && window.getCursorTd);

  const result = await page.evaluate(() => {
    const editor = document.getElementById('doc');
    editor.setAttribute('contenteditable', 'true');
    editor.innerHTML =
      '<table><tbody><tr><td>A1</td><td>A2</td><td>A3</td></tr><tr><td>B1</td><td>B2</td><td>B3</td></tr></tbody></table>';
    const press = (key, shiftKey = false) => {
      editor.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }));
      return window.getCursorTd().textContent;
    };

    window.placeCursorInTableCell(editor.querySelector('td'));
    return {
      start: window.getCursorTd().textContent,
      tab: press('Tab'),
      right: press('ArrowRight'),
      down: press('ArrowDown'),
      left: press('ArrowLeft'),
      up: press('ArrowUp'),
      shiftTab: press('Tab', true),
      wrapBack: press('Tab', true),
    };
  });

  expect(result).toEqual({
    start: 'A1',
    tab: 'A2',
    right: 'A3',
    down: 'B3',
    left: 'B2',
    up: 'A2',
    shiftTab: 'A1',
    wrapBack: 'B3',
  });
});

test('opens table context menu and applies row and column commands', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.tblAddRow && window.tblMoveCol && window.getCursorTd);

  const result = await page.evaluate(() => {
    const editor = document.getElementById('doc');
    editor.setAttribute('contenteditable', 'true');
    editor.innerHTML =
      '<table><tbody><tr><td>A1</td><td>A2</td></tr><tr><td>B1</td><td>B2</td></tr></tbody></table>';
    const rowsText = () =>
      Array.from(editor.querySelectorAll('tr')).map((row) =>
        Array.from(row.cells)
          .map((td) => td.textContent)
          .join('|'),
      );

    editor.querySelectorAll('td')[3].dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 140 }),
    );
    const menuOpen = document.getElementById('tblBar').classList.contains('show');
    document.querySelector('[data-action="table-add-row"][data-value="before"]').click();
    const afterRowInsert = rowsText();

    editor.querySelectorAll('td')[1].dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 140 }),
    );
    document.querySelector('[data-action="table-move-col"][data-value="left"]').click();
    const afterColMove = rowsText();

    editor.querySelectorAll('td')[0].dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 140 }),
    );
    document.querySelector('[data-action="table-delete-col"]').click();
    const afterColDelete = rowsText();

    return { menuOpen, afterRowInsert, afterColMove, afterColDelete };
  });

  expect(result.menuOpen).toBe(true);
  expect(result.afterRowInsert).toEqual(['A1|A2', '|', 'B1|B2']);
  expect(result.afterColMove).toEqual(['A2|A1', '|', 'B2|B1']);
  expect(result.afterColDelete).toEqual(['A1', '', 'B1']);
});
