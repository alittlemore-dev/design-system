import assert from 'node:assert/strict';
import test from 'node:test';

import {
  chooseSiteSelectOption,
  siteSelectOptionLabels,
  siteSelectOptionValues,
  siteSelectTrigger,
  siteSelectValue,
} from '@alittlemoron/design-system/testing';

test('uses the packed site-select helpers through the public testing entry point', () => {
  const alpha = createOption('alpha', 'Alpha workspace', true);
  const beta = createOption('beta', 'Beta workspace', false);
  const options = [alpha, beta];
  const listbox = new FakeElement();
  listbox.querySelectorAll = () => options;
  const trigger = new FakeHTMLButtonElement({
    'aria-controls': 'site-select-listbox',
    'aria-expanded': 'false',
    role: 'combobox',
  });
  trigger.click = () => trigger.setAttribute('aria-expanded', 'true');
  beta.click = () => {
    alpha.classList.delete('site-select-option-committed');
    beta.classList.add('site-select-option-committed');
  };
  const root = new FakeElement();
  root.querySelector = (selector) => {
    if (selector === '#site-select') return trigger;
    if (selector === '#site-select-listbox') return listbox;
    return null;
  };
  const fixture = {
    detectChangesCalls: 0,
    nativeElement: root,
    detectChanges() {
      this.detectChangesCalls += 1;
    },
  };

  globalThis.HTMLButtonElement = FakeHTMLButtonElement;

  assert.equal(siteSelectTrigger(fixture, '#site-select'), trigger);
  assert.deepEqual(siteSelectOptionValues(fixture, '#site-select'), ['alpha', 'beta']);
  assert.deepEqual(siteSelectOptionLabels(fixture, '#site-select'), [
    'Alpha workspace',
    'Beta workspace',
  ]);
  assert.equal(siteSelectValue(fixture, '#site-select'), 'alpha');

  chooseSiteSelectOption(fixture, '#site-select', 'beta');

  assert.equal(siteSelectValue(fixture, '#site-select'), 'beta');
  assert.equal(trigger.getAttribute('aria-expanded'), 'true');
  assert.equal(fixture.detectChangesCalls, 2);
  assert.throws(
    () => chooseSiteSelectOption(fixture, '#site-select', 'missing'),
    /Site select option "missing" not found/,
  );
});

function createOption(value, label, committed) {
  const option = new FakeElement();
  option.dataset.value = value;
  option.textContent = label;
  if (committed) option.classList.add('site-select-option-committed');
  return option;
}

class FakeElement {
  classList = new FakeClassList();
  dataset = {};
  textContent = '';

  click() {}

  querySelector() {
    return null;
  }

  querySelectorAll() {
    return [];
  }
}

class FakeClassList extends Set {
  contains(value) {
    return this.has(value);
  }
}

class FakeHTMLButtonElement extends FakeElement {
  #attributes;

  constructor(attributes) {
    super();
    this.#attributes = new Map(Object.entries(attributes));
  }

  getAttribute(name) {
    return this.#attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    this.#attributes.set(name, value);
  }
}
